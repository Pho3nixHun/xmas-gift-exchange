import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { digest } from '../adapters/auth/passwords.js';
import { participants, receipts, seasons } from '../adapters/db/schema.js';
import type { AppConfig } from '../config.js';
import { ExchangeError, fail } from '../errors.js';

import { authentication } from './authentication.js';
import { actor, currentSeason, participantId, seasonDto } from './context.js';
import type { Context, Database } from './context.js';
import { assignment, draw, pool } from './draw.js';
import { idSchema } from './exchange.js';
import type {
    Command,
    ExchangeService,
    MutationOperation,
    Outcome,
    ReadOperation,
    ReadRequest,
} from './exchange.js';
import {
    openSeason,
    resetSeason,
    setup,
    updateSetup,
    validateSetup,
} from './organiser.js';
import { createPreviews } from './previews.js';
import { changeClaim, changeWish, createWish, wishList } from './wishes.js';

const envelope = z.object({ seasonId: idSchema });
const canonical = (input: unknown): string => {
    if (Array.isArray(input)) return `[${input.map(canonical).join(',')}]`;
    if (input && typeof input === 'object')
        return `{${Object.entries(input)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${JSON.stringify(key)}:${canonical(value)}`)
            .join(',')}}`;
    return JSON.stringify(input);
};
type Handler<R> = (
    context: Context,
    request: R
) => Promise<Readonly<Record<string, unknown>>>;
// Records rather than maps: every operation in the union needs an entry here,
// so adding one to the type without wiring it up fails to compile.
const readHandlers: Record<ReadOperation, Handler<ReadRequest>> = {
    assignment: context => assignment(context),
    pool: context => pool(context),
    setup: context => setup(context),
    wishes: (context, request) =>
        wishList(context, request.target, request.cursor),
    me: async context => {
        const id = await participantId(context);
        const [person] = await context.tx
            .select({
                id: participants.id,
                displayName: participants.displayName,
            })
            .from(participants)
            .where(eq(participants.id, id));
        return {
            person,
            seasonId: context.season.id,
            csrf: context.actor.csrf,
        };
    },
    revision: async context => {
        await participantId(context);
        return {
            seasonId: context.season.id,
            drawRevision: context.season.drawRevision,
        };
    },
    people: async context => ({
        people: await context.tx
            .select({
                id: participants.id,
                displayName: participants.displayName,
            })
            .from(participants)
            .where(ne(participants.id, await participantId(context)))
            .orderBy(participants.displayName),
    }),
};
const mutations: Record<MutationOperation, Handler<Command>> = {
    draw: (context, request) => draw(context, request.input),
    setup: (context, request) => updateSetup(context, request.input),
    validate: context => validateSetup(context),
    open: (context, request) => openSeason(context, request.input),
    reset: (context, request) => resetSeason(context, request.input),
    'create-wish': (context, request) => createWish(context, request.input),
    'edit-wish': (context, request) =>
        changeWish(context, request.input, request.target ?? '', false),
    'delete-wish': (context, request) =>
        changeWish(context, request.input, request.target ?? '', true),
    claim: (context, request) =>
        changeClaim(context, request.input, request.target ?? '', false),
    release: (context, request) =>
        changeClaim(context, request.input, request.target ?? '', true),
};
const domainOutcome = async (
    action: () => Promise<Readonly<Record<string, unknown>>>
): Promise<Outcome> => {
    try {
        return { status: 200, body: await action() };
    } catch (error) {
        if (error instanceof ExchangeError)
            return {
                status: error.statusCode,
                body: { error: { code: error.code } },
            };
        throw error;
    }
};
export const createExchange = async (
    db: Database,
    config: AppConfig
): Promise<ExchangeService> => {
    await db.insert(seasons).values({}).onConflictDoNothing();
    return {
        ...authentication(db, config),
        ...createPreviews(db, config),
        bootstrap: () =>
            db.transaction(
                async tx => {
                    const season = await currentSeason(tx);
                    const people =
                        season.status === 'open'
                            ? await tx
                                  .select()
                                  .from(participants)
                                  .orderBy(participants.displayName)
                            : [];
                    return {
                        status: 200,
                        body: {
                            season: seasonDto(season),
                            people: people.map(person => ({
                                id: person.id,
                                displayName: person.displayName,
                                protected: person.passwordHash !== null,
                            })),
                        },
                    };
                },
                { isolationLevel: 'repeatable read', accessMode: 'read only' }
            ),
        read: request =>
            db.transaction(
                async tx => {
                    const season = await currentSeason(tx);
                    const session = await actor(tx, request, season, config);
                    const handler = readHandlers[request.operation];
                    return {
                        status: 200,
                        body: await handler(
                            { tx, season, actor: session },
                            request
                        ),
                    };
                },
                { isolationLevel: 'repeatable read', accessMode: 'read only' }
            ),
        mutate: request =>
            db.transaction(async tx => {
                const input = envelope.parse(request.input);
                idSchema.parse(request.key);
                const season = await currentSeason(tx, true);
                const session = await actor(tx, request, season, config);
                const actorId = session.participantId ?? 'organiser';
                const operation = request.target
                    ? `${request.operation}:${request.target}`
                    : request.operation;
                const payloadDigest = digest(canonical(request.input));
                const [receipt] = await tx
                    .select()
                    .from(receipts)
                    .where(
                        and(
                            eq(receipts.actor, actorId),
                            eq(receipts.seasonId, input.seasonId),
                            eq(receipts.operation, operation),
                            eq(receipts.key, request.key)
                        )
                    );
                if (receipt) {
                    if (receipt.digest !== payloadDigest)
                        return fail('IDEMPOTENCY_KEY_REUSED');
                    return { status: receipt.status, body: receipt.response };
                }
                if (season.id !== input.seasonId) return fail('SEASON_CHANGED');
                const handler = mutations[request.operation];
                const outcome = await domainOutcome(() =>
                    handler({ tx, season, actor: session }, request)
                );
                await tx.insert(receipts).values({
                    actor: actorId,
                    seasonId: input.seasonId,
                    operation,
                    key: request.key,
                    digest: payloadDigest,
                    status: outcome.status,
                    response: outcome.body,
                });
                return outcome;
            }),
    };
};
