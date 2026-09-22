import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { digest } from '../adapters/auth/passwords.js';
import { previews } from '../adapters/db/schema.js';
import {
    fetchPreview,
    metadata,
    previewUrl,
} from '../adapters/previews/fetch.js';
import type { AppConfig } from '../config.js';
import { fail } from '../errors.js';

import type { Database } from './context.js';
import { actor, currentSeason, participantId } from './context.js';
import type { ActorRequest, Outcome } from './exchange.js';

const inputSchema = z.strictObject({
    seasonId: z.uuid(),
    url: z.string().max(2048),
});
const dto = (row: typeof previews.$inferSelect) => ({
    id: row.id,
    status: row.status,
    title: row.title,
    site: row.site,
});
export const createPreviews = (db: Database, config: AppConfig) => {
    const jobs = new Map<
        string,
        { readonly url: string; readonly seasonId: string }
    >();
    const active = new Set<string>();
    const drain = () => {
        const next = [...jobs.entries()].find(([id]) => !active.has(id));
        if (!next || active.size >= 2) return;
        const [id, job] = next;
        active.add(id);
        void fetchPreview(job.url)
            .then(html => ({
                ...metadata(html, job.url),
                status: 'ready',
                expiresAt: new Date(Date.now() + 86400_000),
            }))
            .catch(() => ({
                title: '',
                site: '',
                status: 'unavailable',
                expiresAt: new Date(Date.now() + 600_000),
            }))
            .then(async result => {
                await db.transaction(async tx => {
                    const season = await currentSeason(tx, true);
                    if (season.id !== job.seasonId) return;
                    await tx
                        .update(previews)
                        .set(result)
                        .where(
                            and(
                                eq(previews.id, id),
                                eq(previews.seasonId, season.id)
                            )
                        );
                });
            })
            .catch(() => undefined)
            .finally(() => {
                active.delete(id);
                jobs.delete(id);
                drain();
            });
        drain();
    };
    return {
        preview: async (
            request: ActorRequest,
            raw: unknown
        ): Promise<Outcome> => {
            const input = inputSchema.parse(raw);
            const url = previewUrl(input.url);
            const outcome = await db.transaction(async tx => {
                const season = await currentSeason(tx, true);
                const session = await actor(tx, request, season, config);
                await participantId({ tx, season, actor: session });
                if (season.id !== input.seasonId) return fail('SEASON_CHANGED');
                if (!config.previewsEnabled || !url)
                    return {
                        status: 200,
                        body: {
                            id: null,
                            status: 'unavailable',
                            title: '',
                            site: '',
                        },
                    };
                const urlHash = digest(url.href);
                const [cached] = await tx
                    .select()
                    .from(previews)
                    .where(
                        and(
                            eq(previews.seasonId, season.id),
                            eq(previews.urlHash, urlHash)
                        )
                    );
                if (cached && cached.expiresAt.getTime() > Date.now())
                    return { status: 200, body: dto(cached) };
                if (jobs.size >= 16) return fail('BUSY', 503);
                const id = randomUUID();
                await tx
                    .insert(previews)
                    .values({
                        id,
                        seasonId: season.id,
                        urlHash,
                        status: 'pending',
                        expiresAt: new Date(Date.now() + 15000),
                    })
                    .onConflictDoUpdate({
                        target: [previews.seasonId, previews.urlHash],
                        set: {
                            id,
                            status: 'pending',
                            title: '',
                            site: '',
                            expiresAt: new Date(Date.now() + 15000),
                        },
                    });
                return {
                    status: 200,
                    body: { id, status: 'pending', title: '', site: '' },
                };
            });
            if (
                outcome.body.status === 'pending' &&
                url &&
                outcome.body.id &&
                !jobs.has(outcome.body.id)
            ) {
                jobs.set(outcome.body.id, {
                    url: url.href,
                    seasonId: input.seasonId,
                });
                drain();
            }
            return outcome;
        },
        readPreview: (request: ActorRequest, id: string) =>
            db.transaction(
                async tx => {
                    const season = await currentSeason(tx);
                    const session = await actor(tx, request, season, config);
                    await participantId({ tx, season, actor: session });
                    const [row] = await tx
                        .select()
                        .from(previews)
                        .where(
                            and(
                                eq(previews.id, id),
                                eq(previews.seasonId, season.id)
                            )
                        );
                    if (!row) return fail('NOT_FOUND', 404);
                    return { status: 200, body: dto(row) };
                },
                { isolationLevel: 'repeatable read', accessMode: 'read only' }
            ),
    };
};
