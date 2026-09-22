import { randomInt } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';

import {
    assignments,
    exclusions,
    participants,
    seasons,
    slots,
} from '../adapters/db/schema.js';
import { available, legal } from '../domain/matching.js';
import { fail } from '../errors.js';

import { ensureOpen, participantId } from './context.js';
import type { Context, Transaction } from './context.js';
import { drawCommandSchema } from './exchange.js';

export const graph = async (tx: Transaction) => ({
    people: (await tx.select({ id: participants.id }).from(participants)).map(
        person => person.id
    ),
    exclusions: await tx.select().from(exclusions),
    assignments: await tx
        .select({
            giverId: assignments.giverId,
            recipientId: assignments.recipientId,
        })
        .from(assignments),
});
export const seedSlots = async (tx: Transaction, seasonId: string) => {
    const state = await graph(tx);
    const colors = ['red', 'purple', 'blue', 'gold'] as const;
    // Sampling without replacement gives an independent unbiased order per giver.
    const shuffle = (remaining: readonly string[]): readonly string[] => {
        if (remaining.length === 0) return [];
        const index = randomInt(remaining.length);
        const chosen = remaining[index];
        return chosen
            ? [chosen, ...shuffle(remaining.filter((_, i) => i !== index))]
            : [];
    };
    const values = state.people.flatMap(giverId =>
        shuffle(
            state.people.filter(recipient => legal(state, giverId, recipient))
        ).map((recipientId, ordinal) => ({
            seasonId,
            giverId,
            recipientId,
            ordinal,
            color: colors[randomInt(colors.length)] ?? 'gold',
        }))
    );
    await tx.insert(slots).values(values);
};
export const assignment = async (context: Context) => {
    const id = await participantId(context);
    const [row] = await context.tx
        .select({
            slotId: assignments.slotId,
            id: participants.id,
            displayName: participants.displayName,
        })
        .from(assignments)
        .innerJoin(participants, eq(participants.id, assignments.recipientId))
        .where(
            and(
                eq(assignments.giverId, id),
                eq(assignments.seasonId, context.season.id)
            )
        );
    return {
        viewerId: id,
        seasonId: context.season.id,
        slotId: row?.slotId ?? null,
        recipient: row ? { id: row.id, displayName: row.displayName } : null,
    };
};
export const pool = async (context: Context) => {
    const id = await participantId(context);
    await ensureOpen(context.season);
    const state = await graph(context.tx);
    const ownSlots = await context.tx
        .select()
        .from(slots)
        .where(
            and(eq(slots.seasonId, context.season.id), eq(slots.giverId, id))
        )
        .orderBy(slots.ordinal);
    return {
        viewerId: id,
        seasonId: context.season.id,
        drawRevision: context.season.drawRevision,
        slots: ownSlots.map(slot => ({
            slotId: slot.id,
            ordinal: slot.ordinal,
            color: slot.color,
            available: available(state, {
                giverId: id,
                recipientId: slot.recipientId,
            }),
        })),
    };
};
export const draw = async (context: Context, raw: unknown) => {
    const input = drawCommandSchema.parse(raw);
    const giverId = await participantId(context);
    await ensureOpen(context.season);
    const state = await graph(context.tx);
    if (state.assignments.some(edge => edge.giverId === giverId))
        return fail('DRAW_ALREADY_COMPLETE');
    const [slot] = await context.tx
        .select()
        .from(slots)
        .where(
            and(
                eq(slots.id, input.slotId),
                eq(slots.giverId, giverId),
                eq(slots.seasonId, context.season.id)
            )
        );
    if (!slot || !available(state, { giverId, recipientId: slot.recipientId }))
        return fail('OPTION_UNAVAILABLE');
    await context.tx.insert(assignments).values({
        seasonId: context.season.id,
        giverId,
        recipientId: slot.recipientId,
        slotId: slot.id,
    });
    await context.tx
        .update(seasons)
        .set({ drawRevision: sql`${seasons.drawRevision} + 1` })
        .where(eq(seasons.id, context.season.id));
    return assignment(context);
};
