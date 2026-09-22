import { randomUUID } from 'node:crypto';

import { eq, ne, sql } from 'drizzle-orm';

import {
    assignments,
    claims,
    exclusions,
    participants,
    receipts,
    recoveries,
    recoveryAudit,
    seasons,
    sessions,
    slots,
    wishes,
    previews,
} from '../adapters/db/schema.js';
import { canComplete } from '../domain/matching.js';
import { fail } from '../errors.js';

import { organiser, seasonDto } from './context.js';
import type { Context } from './context.js';
import { graph, seedSlots } from './draw.js';
import { openSchema, resetSchema, setupCommandSchema } from './exchange.js';

export const setup = async (context: Context) => {
    await organiser(context);
    const people = await context.tx
        .select()
        .from(participants)
        .orderBy(participants.displayName);
    return {
        season: seasonDto(context.season),
        csrf: context.actor.csrf,
        people: people.map(person => ({
            id: person.id,
            displayName: person.displayName,
            protected: person.passwordHash !== null,
        })),
        exclusions: await context.tx.select().from(exclusions),
    };
};
export const updateSetup = async (context: Context, raw: unknown) => {
    await organiser(context);
    const input = setupCommandSchema.parse(raw);
    if (context.season.status !== 'setup') return fail('SETUP_CLOSED');
    if (context.season.setupRevision !== input.expectedVersion)
        return fail('CONTENT_CHANGED');
    const names = input.people.map(person =>
        person.displayName.toLocaleLowerCase('hu')
    );
    const ids = new Set(input.people.map(person => person.id));
    if (
        new Set(names).size !== names.length ||
        ids.size !== input.people.length
    )
        return fail('DUPLICATE_NAME', 422);
    if (
        input.exclusions.some(
            edge =>
                edge.giverId === edge.recipientId ||
                !ids.has(edge.giverId) ||
                !ids.has(edge.recipientId)
        )
    )
        return fail('INVALID_EXCLUSIONS', 422);
    await context.tx.delete(exclusions);
    await context.tx.delete(participants);
    await context.tx.insert(participants).values(
        input.people.map(person => ({
            ...person,
            normalizedName: person.displayName.toLocaleLowerCase('hu'),
        }))
    );
    if (input.exclusions.length)
        await context.tx
            .insert(exclusions)
            .values(input.exclusions)
            .onConflictDoNothing();
    await context.tx
        .update(seasons)
        .set({ setupRevision: sql`${seasons.setupRevision} + 1` })
        .where(eq(seasons.id, context.season.id));
    return { ok: true };
};
export const validateSetup = async (context: Context) => {
    await organiser(context);
    if (context.season.status !== 'setup') return fail('SETUP_CLOSED');
    const state = await graph(context.tx);
    return {
        valid:
            state.people.length >= 2 &&
            state.people.length <= 30 &&
            canComplete(state),
    };
};
export const openSeason = async (context: Context, raw: unknown) => {
    const input = openSchema.parse(raw);
    const validation = await validateSetup(context);
    if (!validation.valid) return fail('IMPOSSIBLE_DRAW', 422);
    if (input.expectedVersion !== context.season.setupRevision)
        return fail('CONTENT_CHANGED');
    await seedSlots(context.tx, context.season.id);
    await context.tx
        .update(seasons)
        .set({ status: 'open' })
        .where(eq(seasons.id, context.season.id));
    return { ok: true };
};
export const resetSeason = async (context: Context, raw: unknown) => {
    await organiser(context);
    resetSchema.parse(raw);
    // Keep the same physical singleton row locked while replacing the season ID.
    await context.tx.delete(claims);
    await context.tx.delete(wishes);
    await context.tx.delete(assignments);
    await context.tx.delete(slots);
    await context.tx.delete(recoveries);
    await context.tx.delete(recoveryAudit);
    await context.tx.delete(previews);
    await context.tx.delete(receipts).where(ne(receipts.operation, 'reset'));
    await context.tx.delete(sessions).where(eq(sessions.role, 'participant'));
    await context.tx.update(participants).set({
        passwordHash: null,
        generation: sql`${participants.generation} + 1`,
    });
    const id = randomUUID();
    await context.tx
        .update(seasons)
        .set({
            id,
            status: 'setup',
            setupRevision: 0,
            drawRevision: 0,
            createdAt: new Date(),
        })
        .where(eq(seasons.id, context.season.id));
    return { ok: true, seasonId: id };
};
