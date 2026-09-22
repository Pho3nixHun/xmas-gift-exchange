import { and, eq, gt } from 'drizzle-orm';

import { digest, secret } from '../adapters/auth/passwords.js';
import type { connectDatabase } from '../adapters/db/connection.js';
import { participants, seasons, sessions } from '../adapters/db/schema.js';
import type { AppConfig } from '../config.js';
import { fail } from '../errors.js';

import type { ActorRequest } from './exchange.js';

export type Database = ReturnType<typeof connectDatabase>['db'];
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Season = typeof seasons.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export interface Context {
    readonly tx: Transaction;
    readonly season: Season;
    readonly actor: Session;
}
export const currentSeason = async (
    tx: Transaction,
    lock = false
): Promise<Season> => {
    const query = tx.select().from(seasons);
    const [season] = await (lock ? query.for('update') : query);
    return season ?? fail('UNAVAILABLE', 503);
};
export const actor = async (
    tx: Transaction,
    request: ActorRequest,
    season: Season,
    config: AppConfig
): Promise<Session> => {
    const [session] = await tx
        .select()
        .from(sessions)
        .where(
            and(
                eq(sessions.tokenHash, digest(request.token)),
                eq(sessions.role, request.role),
                gt(sessions.expiresAt, new Date())
            )
        );
    if (!session) return fail('UNAUTHENTICATED', 401);
    if (request.csrf !== undefined && request.csrf !== session.csrf)
        return fail('FORBIDDEN', 403);
    if (session.role === 'organiser') {
        if (
            session.organiserVersion !== digest(config.auth.organiserHash ?? '')
        )
            return fail('UNAUTHENTICATED', 401);
        return session;
    }
    return participantSession(tx, session, season);
};
const participantSession = async (
    tx: Transaction,
    session: Session,
    season: Season
): Promise<Session> => {
    if (session.seasonId !== season.id || !session.participantId)
        return fail('SEASON_CHANGED', 401);
    const [person] = await tx
        .select()
        .from(participants)
        .where(eq(participants.id, session.participantId));
    if (person?.generation !== session.generation || !person.passwordHash)
        return fail('UNAUTHENTICATED', 401);
    return session;
};
export const participantId = async (context: Context): Promise<string> =>
    context.actor.role === 'participant' && context.actor.participantId
        ? context.actor.participantId
        : fail('FORBIDDEN', 403);
export const organiser = async (context: Context) => {
    if (context.actor.role !== 'organiser') return fail('FORBIDDEN', 403);
};
export const ensureOpen = async (season: Season) => {
    if (season.status !== 'open') return fail('SEASON_NOT_OPEN');
};
export const seasonDto = (season: Season) => ({
    id: season.id,
    status: season.status,
    setupRevision: season.setupRevision,
    drawRevision: season.drawRevision,
});
export const newSession = async (
    tx: Transaction,
    config: AppConfig,
    season: Season,
    person?: typeof participants.$inferSelect
) => {
    const token = secret();
    const csrf = secret();
    const duration = person
        ? config.auth.participantDays * 86400_000
        : config.auth.organiserHours * 3600_000;
    await tx.insert(sessions).values({
        tokenHash: digest(token),
        csrf,
        role: person ? 'participant' : 'organiser',
        participantId: person?.id,
        seasonId: person ? season.id : null,
        generation: person?.generation,
        organiserVersion: person
            ? null
            : digest(config.auth.organiserHash ?? ''),
        expiresAt: new Date(Date.now() + duration),
    });
    return { status: 200, body: { ok: true, csrf }, token };
};
