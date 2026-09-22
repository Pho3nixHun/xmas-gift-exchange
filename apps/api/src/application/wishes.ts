import { and, desc, eq, lt, or, sql } from 'drizzle-orm';

import { claims, participants, wishes } from '../adapters/db/schema.js';
import { fail } from '../errors.js';

import { ensureOpen, participantId } from './context.js';
import type { Context } from './context.js';
import {
    createWishSchema,
    editWishSchema,
    versionCommandSchema,
} from './exchange.js';

export const wishList = async (
    context: Context,
    target?: string,
    cursor?: string
) => {
    const viewer = await participantId(context);
    const owner = target ?? viewer;
    const [person] = await context.tx
        .select({ id: participants.id })
        .from(participants)
        .where(eq(participants.id, owner));
    if (!person) return fail('NOT_FOUND', 404);
    const [after] = cursor
        ? await context.tx
              .select()
              .from(wishes)
              .where(
                  and(
                      eq(wishes.id, cursor),
                      eq(wishes.ownerId, owner),
                      eq(wishes.seasonId, context.season.id)
                  )
              )
        : [];
    if (cursor && !after) return fail('INVALID_CURSOR', 400);
    const rows = await context.tx
        .select({ wish: wishes, claim: claims })
        .from(wishes)
        .leftJoin(claims, eq(claims.wishId, wishes.id))
        .where(
            and(
                eq(wishes.ownerId, owner),
                eq(wishes.seasonId, context.season.id),
                after
                    ? or(
                          lt(wishes.createdAt, after.createdAt),
                          and(
                              eq(wishes.createdAt, after.createdAt),
                              lt(wishes.id, after.id)
                          )
                      )
                    : undefined
            )
        )
        .orderBy(desc(wishes.createdAt), desc(wishes.id))
        .limit(21);
    const projected = rows.slice(0, 20).map(({ wish, claim }) => ({
        id: wish.id,
        ownerId: wish.ownerId,
        description: wish.description,
        url: wish.url,
        priority: wish.priority,
        contentVersion: wish.contentVersion,
        createdAt: wish.createdAt.toISOString(),
        updatedAt: wish.updatedAt.toISOString(),
        canEdit: viewer === owner && !claim,
        canDelete: viewer === owner && !claim,
        ...(viewer === owner
            ? {}
            : {
                  claimState: claim
                      ? claim.claimerId === viewer
                          ? 'mine'
                          : 'claimed'
                      : 'available',
              }),
    }));
    return {
        viewerId: viewer,
        seasonId: context.season.id,
        wishes: projected,
        nextCursor: rows.length > 20 ? (projected.at(-1)?.id ?? null) : null,
    };
};
export const createWish = async (context: Context, raw: unknown) => {
    const ownerId = await participantId(context);
    await ensureOpen(context.season);
    const input = createWishSchema.parse(raw);
    const [row] = await context.tx
        .insert(wishes)
        .values({
            seasonId: context.season.id,
            ownerId,
            description: input.description,
            url: input.url,
            priority: input.priority,
        })
        .returning({ id: wishes.id });
    return { id: row?.id };
};
const findWish = async (context: Context, target: string) => {
    const [row] = await context.tx
        .select()
        .from(wishes)
        .where(
            and(eq(wishes.id, target), eq(wishes.seasonId, context.season.id))
        )
        .for('update');
    return row ?? fail('NOT_FOUND', 404);
};
export const changeWish = async (
    context: Context,
    raw: unknown,
    target: string,
    remove: boolean
) => {
    const owner = await participantId(context);
    const input = remove
        ? versionCommandSchema.parse(raw)
        : editWishSchema.parse(raw);
    const row = await findWish(context, target);
    if (row.ownerId !== owner) return fail('NOT_FOUND', 404);
    const [claim] = await context.tx
        .select()
        .from(claims)
        .where(eq(claims.wishId, row.id));
    if (claim) return fail('WISH_LOCKED');
    if (row.contentVersion !== input.expectedVersion)
        return fail('CONTENT_CHANGED');
    if (remove) await context.tx.delete(wishes).where(eq(wishes.id, row.id));
    else {
        const draft = editWishSchema.parse(raw);
        await context.tx
            .update(wishes)
            .set({
                description: draft.description,
                url: draft.url,
                priority: draft.priority,
                contentVersion: sql`${wishes.contentVersion} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(wishes.id, row.id));
    }
    return { ok: true };
};
export const changeClaim = async (
    context: Context,
    raw: unknown,
    target: string,
    release: boolean
) => {
    const claimerId = await participantId(context);
    const row = await findWish(context, target);
    if (row.ownerId === claimerId) return fail('FORBIDDEN', 403);
    const [claim] = await context.tx
        .select()
        .from(claims)
        .where(eq(claims.wishId, row.id));
    if (claim && claim.claimerId !== claimerId)
        return fail('CLAIM_UNAVAILABLE');
    if (release)
        await context.tx.delete(claims).where(eq(claims.wishId, row.id));
    else {
        const input = versionCommandSchema.parse(raw);
        if (row.contentVersion !== input.expectedVersion)
            return fail('CONTENT_CHANGED');
        if (!claim)
            await context.tx
                .insert(claims)
                .values({ wishId: row.id, claimerId });
    }
    return { ok: true };
};
