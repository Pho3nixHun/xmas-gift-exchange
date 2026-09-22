import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, it, assert } from 'vitest';
import { z } from 'zod';

import { passwords } from '../adapters/auth/passwords.js';
import { connectDatabase } from '../adapters/db/connection.js';
import { loadConfig } from '../config.js';
import { createApp } from '../http/app.js';

import {
    assignmentSchema,
    bootstrapSchema,
    meSchema,
    poolSchema,
    setupSchema,
    wishListSchema,
} from './exchange.js';
import type {
    ActorRequest,
    ExchangeService,
    MutationOperation,
} from './exchange.js';
import { createExchange } from './service.js';

const baseUrl = process.env['TEST_DATABASE_URL'];
if (!baseUrl) expect.fail('TEST_DATABASE_URL is required.');
const schema = `winter_test_${randomUUID().replaceAll('-', '')}`;
const base = connectDatabase(baseUrl);
const url = new URL(baseUrl);
url.pathname = `/${schema}`;
const database = connectDatabase(url.toString());
const password = 'Winter12';
const state = new Map<string, ExchangeService>();
const service = () => {
    const result = state.get('service');
    if (!result) return expect.fail('fixture not ready');
    return result;
};
beforeAll(async () => {
    await base.pool.query(`CREATE DATABASE "${schema}"`);
    await migrate(database.db, {
        migrationsFolder: fileURLToPath(
            new URL('../../drizzle', import.meta.url)
        ),
    });
    const config = await loadConfig({
        NODE_ENV: 'test',
        ORGANISER_HASH: await passwords().hash(password),
    });
    state.set('service', await createExchange(database.db, config));
}, 30000);
afterAll(async () => {
    await database.close();
    await base.pool.query(`DROP DATABASE "${schema}"`);
    await base.close();
});
const session = async (
    participantId?: string,
    seasonId?: string
): Promise<ActorRequest> => {
    const outcome = await service().authenticate({
        role: participantId ? 'participant' : 'organiser',
        enrol: !!participantId,
        input: participantId
            ? { participantId, seasonId, password }
            : { password },
    });
    return {
        token: outcome.token ?? '',
        role: participantId ? 'participant' : 'organiser',
        csrf: z.object({ csrf: z.string() }).parse(outcome.body).csrf,
    };
};
const mutate = (
    actor: ActorRequest,
    operation: MutationOperation,
    input: unknown,
    target?: string,
    key = randomUUID()
) => service().mutate({ ...actor, operation, input, target, key });

describe('transactional exchange and privacy', () => {
    it('rejects unauthenticated SSE before opening a stream', async () => {
        const admin = await session();
        const setup = setupSchema.parse(
            (await service().read({ ...admin, operation: 'setup' })).body
        );
        // This first test has no open roster yet; unauthenticated streams must fail before opening.
        const config = await loadConfig({ NODE_ENV: 'test' });
        const app = await createApp(
            { ...config, staticRoot: '/missing' },
            { ready: database.ready, exchange: service() }
        );
        try {
            const address = await app.listen({ host: '127.0.0.1', port: 0 });
            const response = await fetch(`${address}/api/v1/me/draw-events`);
            expect(response.status).toBe(401);
            expect(setup.season.status).toBe('setup');
        } finally {
            await app.close();
        }
    });
    it('protects concurrent choices, receipts, wish locks, recovery and full reset', async () => {
        const admin = await session();
        const setup = setupSchema.parse(
            (await service().read({ ...admin, operation: 'setup' })).body
        );
        const seasonId = setup.season.id;
        const people = ['Anna', 'Béla', 'Csilla', 'Dávid'].map(displayName => ({
            id: randomUUID(),
            displayName,
        }));
        expect(
            (
                await mutate(admin, 'setup', {
                    seasonId,
                    expectedVersion: 0,
                    people,
                    exclusions: [],
                })
            ).status
        ).toBe(200);
        expect(
            (await mutate(admin, 'open', { seasonId, expectedVersion: 1 }))
                .status
        ).toBe(200);
        await expect(
            service().authenticate({
                role: 'participant',
                enrol: true,
                input: {
                    participantId: people[0]?.id,
                    seasonId,
                    password: 'lowercase-only',
                },
            })
        ).rejects.toBeInstanceOf(z.ZodError);
        const [a, b, c, d] = await people.reduce<Promise<ActorRequest[]>>(
            async (pending, person) => [
                ...(await pending),
                await session(person.id, seasonId),
            ],
            Promise.resolve([])
        );
        assert(a && b && c && d);
        const me = meSchema.parse(
            (await service().read({ ...a, operation: 'me' })).body
        );
        await expect(
            service().read({ ...admin, operation: 'assignment' })
        ).rejects.toMatchObject({ code: 'FORBIDDEN' });
        const pool = poolSchema.parse(
            (await service().read({ ...a, operation: 'pool' })).body
        );
        expect(JSON.stringify(pool)).not.toMatch(
            /recipientId|displayName|giverId/
        );
        const slot = pool.slots.find(value => value.available);
        assert(slot);
        const key = randomUUID();
        const input = { seasonId, slotId: slot.slotId };
        const outcomes = await Promise.all([
            mutate(a, 'draw', input, undefined, key),
            mutate(a, 'draw', input, undefined, key),
        ]);
        expect(outcomes[0]).toEqual(outcomes[1]);
        const saved = assignmentSchema.parse(outcomes[0].body);
        expect(saved.recipient?.id).not.toBe(me.person.id);
        await expect(
            mutate(
                a,
                'draw',
                { seasonId, slotId: randomUUID() },
                undefined,
                key
            )
        ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
        expect((await mutate(a, 'draw', input)).body).toEqual({
            error: { code: 'DRAW_ALREADY_COMPLETE' },
        });
        await [b, c, d].reduce(async (previous, viewer) => {
            await previous;
            const current = poolSchema.parse(
                (await service().read({ ...viewer, operation: 'pool' })).body
            );
            const choice = current.slots.find(value => value.available);
            expect(choice).toBeDefined();
            expect(
                (
                    await mutate(viewer, 'draw', {
                        seasonId,
                        slotId: choice?.slotId,
                    })
                ).status
            ).toBe(200);
        }, Promise.resolve());
        const recipients = await Promise.all(
            [a, b, c, d].map(
                async viewer =>
                    assignmentSchema.parse(
                        (
                            await service().read({
                                ...viewer,
                                operation: 'assignment',
                            })
                        ).body
                    ).recipient?.id
            )
        );
        expect(new Set(recipients).size).toBe(4);
        const draft = {
            seasonId,
            description: 'A beautiful book',
            url: '',
            priority: 'high',
        };
        const created = z
            .object({ id: z.uuid() })
            .parse((await mutate(a, 'create-wish', draft)).body);
        const results = await Promise.all([
            mutate(b, 'claim', { seasonId, expectedVersion: 1 }, created.id),
            mutate(c, 'claim', { seasonId, expectedVersion: 1 }, created.id),
        ]);
        expect(results.map(result => result.status).sort()).toEqual([200, 409]);
        const owner = wishListSchema.parse(
            (await service().read({ ...a, operation: 'wishes' })).body
        );
        expect(owner.wishes[0]).toMatchObject({
            canEdit: false,
            canDelete: false,
            contentVersion: 1,
        });
        expect(JSON.stringify(owner)).not.toMatch(
            /claimState|claimerId|claimedAt/
        );
        expect(
            (
                await mutate(
                    a,
                    'edit-wish',
                    { ...draft, description: 'changed', expectedVersion: 1 },
                    created.id
                )
            ).body
        ).toEqual({ error: { code: 'WISH_LOCKED' } });
        expect(
            (
                await mutate(
                    a,
                    'claim',
                    { seasonId, expectedVersion: 1 },
                    created.id
                )
            ).status
        ).toBe(403);
        const firstLink = z
            .object({ url: z.string() })
            .parse(
                (
                    await service().issueRecovery(
                        admin,
                        { seasonId },
                        me.person.id
                    )
                ).body
            ).url;
        const link = z
            .object({ url: z.string() })
            .parse(
                (
                    await service().issueRecovery(
                        admin,
                        { seasonId },
                        me.person.id
                    )
                ).body
            ).url;
        const token = new URLSearchParams(new URL(link).hash.slice(1)).get(
            'token'
        );
        await expect(
            service().recover({
                token: new URLSearchParams(
                    new URL(firstLink).hash.slice(1)
                ).get('token'),
                newPassword: 'Newgift8',
            })
        ).rejects.toMatchObject({ code: 'RECOVERY_INVALID' });
        await expect(
            service().recover({ token, newPassword: 'lowercase-only' })
        ).rejects.toBeInstanceOf(z.ZodError);
        const redemption = await Promise.allSettled([
            service().recover({ token, newPassword: 'Newgift8' }),
            service().recover({ token, newPassword: 'Newgift8' }),
        ]);
        expect(
            redemption.filter(result => result.status === 'fulfilled')
        ).toHaveLength(1);
        await expect(
            service().read({ ...a, operation: 'me' })
        ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
        const login = await service().authenticate({
            role: 'participant',
            enrol: false,
            input: {
                participantId: me.person.id,
                seasonId,
                password: 'Newgift8',
            },
        });
        expect(
            assignmentSchema.parse(
                (
                    await service().read({
                        token: login.token ?? '',
                        role: 'participant',
                        operation: 'assignment',
                    })
                ).body
            )
        ).toEqual(saved);
        const resetKey = randomUUID();
        const reset = await mutate(
            admin,
            'reset',
            { seasonId, confirmation: 'RESET' },
            undefined,
            resetKey
        );
        expect(
            await mutate(
                admin,
                'reset',
                { seasonId, confirmation: 'RESET' },
                undefined,
                resetKey
            )
        ).toEqual(reset);
        const next = setupSchema.parse(
            (await service().read({ ...admin, operation: 'setup' })).body
        );
        expect(next.people.every(person => !person.protected)).toBe(true);
        expect(next.season.id).not.toBe(seasonId);
        expect(
            (
                await mutate(admin, 'open', {
                    seasonId: next.season.id,
                    expectedVersion: 0,
                })
            ).status
        ).toBe(200);
        const concurrentEnrol = await Promise.allSettled([
            session(me.person.id, next.season.id),
            session(me.person.id, next.season.id),
        ]);
        expect(
            concurrentEnrol.filter(result => result.status === 'fulfilled')
        ).toHaveLength(1);
    }, 30000);
    it('validates HTTP schemas and rejects missing CSRF or foreign origins', async () => {
        const config = await loadConfig({ NODE_ENV: 'test' });
        const app = await createApp(
            { ...config, staticRoot: '/missing' },
            { ready: database.ready, exchange: service() }
        );
        try {
            const boot = await app.inject('/api/v1/bootstrap');
            expect(boot.statusCode).toBe(200);
            bootstrapSchema.parse(boot.json());
            const foreign = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                headers: { origin: 'https://evil.test' },
                payload: {},
            });
            expect(foreign.statusCode).toBe(403);
            const invalid = await app.inject({
                method: 'POST',
                url: '/api/v1/me/draw',
                headers: { origin: config.origin },
                payload: {
                    seasonId: randomUUID(),
                    slotId: randomUUID(),
                    recipientId: randomUUID(),
                },
            });
            expect([400, 422]).toContain(invalid.statusCode);
        } finally {
            await app.close();
        }
    });
    it('streams only safe revisions after commit, then ends a revoked session', async () => {
        const bootstrap = bootstrapSchema.parse(
            (await service().bootstrap()).body
        );
        const actors = await Promise.all(
            bootstrap.people.slice(0, 2).map(async person => {
                const result = await service().authenticate({
                    role: 'participant',
                    enrol: !person.protected,
                    input: {
                        seasonId: bootstrap.season.id,
                        participantId: person.id,
                        password,
                    },
                });
                return {
                    role: 'participant' as const,
                    token: result.token ?? '',
                    csrf: z.object({ csrf: z.string() }).parse(result.body)
                        .csrf,
                };
            })
        );
        const [giver, viewer] = actors;
        assert(giver && viewer);
        const config = await loadConfig({ NODE_ENV: 'test' });
        const app = await createApp(
            { ...config, staticRoot: '/missing' },
            { ready: database.ready, exchange: service() }
        );
        const controller = new AbortController();
        try {
            const address = await app.listen({ host: '127.0.0.1', port: 0 });
            const response = await fetch(`${address}/api/v1/me/draw-events`, {
                headers: { cookie: `winter-participant=${viewer.token}` },
                signal: AbortSignal.any([
                    controller.signal,
                    AbortSignal.timeout(8000),
                ]),
            });
            expect(response.status).toBe(200);
            assert(response.body);
            const reader = response.body.getReader();
            const ready = new TextDecoder().decode((await reader.read()).value);
            expect(ready).toContain('event: ready');
            expect(ready).not.toMatch(/recipient|giver|claim|slot|Guest/);
            const pool = poolSchema.parse(
                (await service().read({ ...giver, operation: 'pool' })).body
            );
            const slot = pool.slots.find(option => option.available);
            assert(slot);
            const started = Date.now();
            const committed = await app.inject({
                method: 'POST',
                url: '/api/v1/me/draw',
                headers: {
                    origin: config.origin,
                    cookie: `winter-participant=${giver.token}`,
                    'x-csrf-token': giver.csrf,
                    'idempotency-key': randomUUID(),
                },
                payload: { seasonId: bootstrap.season.id, slotId: slot.slotId },
            });
            expect(committed.statusCode).toBe(200);
            const invalidated = new TextDecoder().decode(
                (await reader.read()).value
            );
            expect(invalidated).toContain('event: draw-invalidated');
            expect(Date.now() - started).toBeLessThan(1000);
            expect(invalidated).not.toMatch(/recipient|giver|claim|slot/);
            await app.inject({
                method: 'POST',
                url: '/api/v1/auth/logout',
                headers: {
                    origin: config.origin,
                    cookie: `winter-participant=${viewer.token}`,
                    'x-csrf-token': viewer.csrf,
                },
                payload: {},
            });
            expect(
                new TextDecoder().decode((await reader.read()).value)
            ).toContain('event: session-ended');
            expect((await service().logout(viewer)).status).toBe(200);
            await reader.cancel();
        } finally {
            controller.abort();
            await app.close();
        }
    }, 15000);
    it('updates thirty simultaneous viewers without exposing a chosen identity', async () => {
        const admin = await session();
        const prior = setupSchema.parse(
            (await service().read({ ...admin, operation: 'setup' })).body
        );
        await mutate(admin, 'reset', {
            seasonId: prior.season.id,
            confirmation: 'RESET',
        });
        const current = setupSchema.parse(
            (await service().read({ ...admin, operation: 'setup' })).body
        );
        const seasonId = current.season.id;
        const people = Array.from({ length: 30 }, (_, i) => ({
            id: randomUUID(),
            displayName: `Viewer ${i + 1}`,
        }));
        await mutate(admin, 'setup', {
            seasonId,
            expectedVersion: 0,
            people,
            exclusions: [],
        });
        await mutate(admin, 'open', { seasonId, expectedVersion: 1 });
        const viewers = await Promise.all(
            people.map(person => session(person.id, seasonId))
        );
        const config = await loadConfig({ NODE_ENV: 'test' });
        const app = await createApp(
            { ...config, staticRoot: '/missing' },
            { ready: database.ready, exchange: service() }
        );
        const controller = new AbortController();
        try {
            const address = await app.listen({ host: '127.0.0.1', port: 0 });
            const readers = await Promise.all(
                viewers.map(async viewer => {
                    const result = await fetch(
                        `${address}/api/v1/me/draw-events`,
                        {
                            headers: {
                                cookie: `winter-participant=${viewer.token}`,
                            },
                            signal: AbortSignal.any([
                                controller.signal,
                                AbortSignal.timeout(15000),
                            ]),
                        }
                    );
                    expect(result.status).toBe(200);
                    assert(result.body);
                    const reader = result.body.getReader();
                    expect(
                        new TextDecoder().decode((await reader.read()).value)
                    ).toContain('event: ready');
                    return reader;
                })
            );
            const giver = viewers[0];
            assert(giver);
            const pool = poolSchema.parse(
                (await service().read({ ...giver, operation: 'pool' })).body
            );
            const slot = pool.slots.find(option => option.available);
            assert(slot);
            const started = Date.now();
            const result = await app.inject({
                method: 'POST',
                url: '/api/v1/me/draw',
                headers: {
                    origin: config.origin,
                    cookie: `winter-participant=${giver.token}`,
                    'x-csrf-token': giver.csrf ?? '',
                    'idempotency-key': randomUUID(),
                },
                payload: { seasonId, slotId: slot.slotId },
            });
            expect(result.statusCode).toBe(200);
            const latencies = await Promise.all(
                readers.map(async reader => {
                    const data = new TextDecoder().decode(
                        (await reader.read()).value
                    );
                    expect(data).toContain('event: draw-invalidated');
                    expect(data).not.toMatch(/giver|recipient|slot|claim/);
                    return Date.now() - started;
                })
            );
            expect(latencies.sort((a, b) => a - b)[28]).toBeLessThan(1000);
            await Promise.all(readers.map(reader => reader.cancel()));
            const saved = assignmentSchema.parse(result.json());
            const competing = people.slice(1, 3);
            const common = people.find(
                person =>
                    person.id !== saved.recipient?.id &&
                    !competing.some(giver => giver.id === person.id)
            );
            assert(common);
            const hidden = await database.pool.query<{
                id: string;
                giver_id: string;
            }>(
                'SELECT id,giver_id FROM draw_slot WHERE season_id=$1 AND recipient_id=$2 AND giver_id=ANY($3::uuid[])',
                [seasonId, common.id, competing.map(person => person.id)]
            );
            expect(hidden.rows).toHaveLength(2);
            const raced = await Promise.all(
                hidden.rows.map(row => {
                    const actor =
                        viewers[
                            people.findIndex(
                                person => person.id === row.giver_id
                            )
                        ];
                    assert(actor);
                    return mutate(actor, 'draw', { seasonId, slotId: row.id });
                })
            );
            expect(raced.map(outcome => outcome.status).sort()).toEqual([
                200, 409,
            ]);
        } finally {
            controller.abort();
            await app.close();
        }
    }, 30000);
});
