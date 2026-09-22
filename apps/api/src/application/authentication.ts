import { and, eq, gt, sql } from 'drizzle-orm';

import { digest, passwords, secret } from '../adapters/auth/passwords.js';
import {
    participants,
    recoveries,
    recoveryAudit,
    sessions,
} from '../adapters/db/schema.js';
import type { AppConfig } from '../config.js';
import { ExchangeError, fail } from '../errors.js';

import { actor, currentSeason, ensureOpen, newSession } from './context.js';
import type { Database } from './context.js';
import {
    credentialsSchema,
    enrolmentSchema,
    passwordOnlySchema,
    recoverySchema,
    seasonCommandSchema,
} from './exchange.js';
import type { ActorRequest, AuthRequest } from './exchange.js';

export const authentication = (db: Database, config: AppConfig) => {
    const password = passwords();
    const authenticate = async (request: AuthRequest) => {
        if (request.role === 'organiser') {
            const input = passwordOnlySchema.parse(request.input);
            if (
                !config.auth.organiserHash ||
                !(await password.verify(
                    config.auth.organiserHash,
                    input.password
                ))
            )
                return fail('INVALID_CREDENTIALS', 401);
            return db.transaction(async tx =>
                newSession(tx, config, await currentSeason(tx, true))
            );
        }
        const input = (
            request.enrol ? enrolmentSchema : credentialsSchema
        ).parse(request.input);
        const [snapshot] = await db
            .select()
            .from(participants)
            .where(eq(participants.id, input.participantId));
        if (!snapshot) return fail('INVALID_CREDENTIALS', 401);
        const encoded = request.enrol
            ? await password.hash(input.password)
            : snapshot.passwordHash;
        if (
            !request.enrol &&
            (!encoded || !(await password.verify(encoded, input.password)))
        )
            return fail('INVALID_CREDENTIALS', 401);
        return db.transaction(async tx => {
            const season = await currentSeason(tx, true);
            if (season.id !== input.seasonId) return fail('SEASON_CHANGED');
            await ensureOpen(season);
            const [person] = await tx
                .select()
                .from(participants)
                .where(eq(participants.id, input.participantId))
                .for('update');
            if (person?.generation !== snapshot.generation)
                return fail('INVALID_CREDENTIALS', 401);
            if (request.enrol) {
                if (person.passwordHash) return fail('NAME_ALREADY_PROTECTED');
                await tx
                    .update(participants)
                    .set({ passwordHash: encoded })
                    .where(eq(participants.id, person.id));
            } else if (person.passwordHash !== snapshot.passwordHash)
                return fail('INVALID_CREDENTIALS', 401);
            return newSession(tx, config, season, person);
        });
    };
    const recover = async (raw: unknown) => {
        const input = recoverySchema.parse(raw);
        const tokenHash = digest(input.token);
        const [candidate] = await db
            .select()
            .from(recoveries)
            .where(
                and(
                    eq(recoveries.tokenHash, tokenHash),
                    gt(recoveries.expiresAt, new Date())
                )
            );
        if (!candidate) return fail('RECOVERY_INVALID', 400);
        const encoded = await password.hash(input.newPassword);
        return db.transaction(async tx => {
            const season = await currentSeason(tx, true);
            const [token] = await tx
                .select()
                .from(recoveries)
                .where(
                    and(
                        eq(recoveries.tokenHash, tokenHash),
                        gt(recoveries.expiresAt, new Date())
                    )
                )
                .for('update');
            if (token?.seasonId !== season.id)
                return fail('RECOVERY_INVALID', 400);
            const [person] = await tx
                .select()
                .from(participants)
                .where(eq(participants.id, token.participantId));
            if (person?.generation !== token.generation)
                return fail('RECOVERY_INVALID', 400);
            await tx
                .update(participants)
                .set({
                    passwordHash: encoded,
                    generation: sql`${participants.generation} + 1`,
                })
                .where(eq(participants.id, person.id));
            await tx
                .delete(sessions)
                .where(eq(sessions.participantId, person.id));
            await tx
                .delete(recoveries)
                .where(eq(recoveries.participantId, person.id));
            await tx.insert(recoveryAudit).values({
                seasonId: season.id,
                participantId: person.id,
                issuer: 'redeemer',
                outcome: 'redeemed',
            });
            return { status: 200, body: { ok: true } };
        });
    };
    const reauthenticate = async (request: ActorRequest, raw: unknown) => {
        const input = passwordOnlySchema.parse(raw);
        if (
            !config.auth.organiserHash ||
            !(await password.verify(config.auth.organiserHash, input.password))
        )
            return fail('INVALID_CREDENTIALS', 401);
        return db.transaction(async tx => {
            const session = await actor(
                tx,
                request,
                await currentSeason(tx, true),
                config
            );
            if (session.role !== 'organiser') return fail('FORBIDDEN', 403);
            await tx
                .update(sessions)
                .set({ reauthenticatedAt: new Date() })
                .where(eq(sessions.tokenHash, session.tokenHash));
            return { status: 200, body: { ok: true } };
        });
    };
    const issueRecovery = async (
        request: ActorRequest,
        raw: unknown,
        target: string
    ) =>
        db.transaction(async tx => {
            const input = seasonCommandSchema.parse(raw);
            const season = await currentSeason(tx, true);
            const session = await actor(tx, request, season, config);
            if (session.role !== 'organiser') return fail('FORBIDDEN', 403);
            if (season.id !== input.seasonId) return fail('SEASON_CHANGED');
            if (
                Date.now() - session.reauthenticatedAt.getTime() >
                config.auth.reauthMinutes * 60_000
            )
                return fail('REAUTH_REQUIRED', 403);
            const [person] = await tx
                .select()
                .from(participants)
                .where(eq(participants.id, target));
            if (!person?.passwordHash) return fail('NOT_FOUND', 404);
            const token = secret();
            await tx
                .delete(recoveries)
                .where(eq(recoveries.participantId, person.id));
            await tx.insert(recoveries).values({
                tokenHash: digest(token),
                participantId: person.id,
                seasonId: season.id,
                generation: person.generation,
                expiresAt: new Date(
                    Date.now() + config.auth.recoveryMinutes * 60_000
                ),
            });
            await tx.insert(recoveryAudit).values({
                seasonId: season.id,
                participantId: person.id,
                issuer: session.tokenHash,
                outcome: 'issued',
            });
            return {
                status: 200,
                body: { url: `${config.origin}/recover#token=${token}` },
            };
        });
    const logout = async (request: ActorRequest) =>
        db.transaction(async tx => {
            const session = await actor(
                tx,
                request,
                await currentSeason(tx, true),
                config
            ).catch((error: unknown) =>
                error instanceof ExchangeError && error.statusCode === 401
                    ? null
                    : Promise.reject(
                          error instanceof Error
                              ? error
                              : new Error('UNAVAILABLE')
                      )
            );
            if (session)
                await tx
                    .delete(sessions)
                    .where(eq(sessions.tokenHash, session.tokenHash));
            return { status: 200, body: { ok: true } };
        });
    return { authenticate, recover, reauthenticate, issueRecovery, logout };
};
