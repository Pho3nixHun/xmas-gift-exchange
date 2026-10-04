import { afterEach, assert, describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ExchangeService } from '../application/exchange.js';
import { loadConfig } from '../config.js';

import { createApp } from './app.js';

const apps = new Set<Awaited<ReturnType<typeof createApp>>>();
afterEach(async () => {
    await Promise.all([...apps].map(app => app.close()));
    apps.clear();
});
// Every app writes its log lines into `lines`, which keeps test output clean
// and lets the logging tests read what an operator would see.
const open = async (
    enabled = 'true',
    ready: () => Promise<boolean> = () => Promise.resolve(false),
    lines: string[] = []
) => {
    const config = await loadConfig({
        NODE_ENV: 'test',
        WORKBENCH_ENABLED: enabled,
    });
    const app = await createApp(
        { ...config, staticRoot: '/nonexistent/winter-test' },
        {
            ready,
            logStream: {
                write: line => {
                    lines.push(line);
                },
            },
        }
    );
    apps.add(app);
    return app;
};
const entrySchema = z.looseObject({
    level: z.number(),
    msg: z.string(),
    reqId: z.string().optional(),
});
const entries = (lines: readonly string[]) =>
    lines.map(line => entrySchema.parse(JSON.parse(line)));
const secrets = {
    cookie: 'winter-participant=session-secret-cookie',
    authorization: 'Bearer bearer-secret',
    'x-csrf-token': 'csrf-secret',
};

describe('public API boundary', () => {
    it('exposes editorial configuration without server secrets', async () => {
        const app = await open();
        const result = await app.inject({ url: '/api/v1/public-config' });
        expect(result.statusCode).toBe(200);
        expect(result.headers['cache-control']).toBe('no-store');
        expect(result.body).toContain('15000-20000');
        expect(result.body).toContain('$30-60');
        expect(result.body).not.toMatch(
            /databaseUrl|staticRoot|postgresql|password/
        );
    });
    it('validates a draft without storing it or pretending to save', async () => {
        const app = await open();
        const result = await app.inject({
            method: 'POST',
            url: '/api/v1/workbench/wish-check',
            headers: { origin: 'http://localhost:4200' },
            payload: {
                description: '  A book  ',
                url: 'https://example.com/book',
                priority: 'high',
            },
        });
        expect(result.statusCode).toBe(200);
        expect(result.json()).toEqual({
            wish: {
                description: 'A book',
                url: 'https://example.com/book',
                priority: 'high',
            },
        });
    });
    it('rejects cross-origin requests and overposted fields', async () => {
        const app = await open();
        const payload = {
            description: 'A book',
            url: '',
            priority: 'low',
            ownerId: 'not-me',
        };
        const foreign = await app.inject({
            method: 'POST',
            url: '/api/v1/workbench/wish-check',
            headers: { origin: 'https://other.example' },
            payload,
        });
        expect(foreign.statusCode).toBe(403);
        const invalid = await app.inject({
            method: 'POST',
            url: '/api/v1/workbench/wish-check',
            headers: { origin: 'http://localhost:4200' },
            payload,
        });
        expect(invalid.statusCode).toBe(422);
        expect(invalid.body).not.toContain('not-me');
    });
    it('does not expose the workbench when disabled', async () => {
        const app = await open('false');
        const result = await app.inject({
            method: 'POST',
            url: '/api/v1/workbench/wish-check',
            headers: { origin: 'http://localhost:4200' },
            payload: {},
        });
        expect(result.statusCode).toBe(404);
    });
    it('does not report readiness when the database is unavailable', async () => {
        const app = await open();
        expect((await app.inject('/api/v1/ready')).statusCode).toBe(503);
        expect((await app.inject('/api/v1/health')).statusCode).toBe(200);
    });
});

describe('structured logs', () => {
    it('records a 5xx with request ID, route, status and duration, without the error message', async () => {
        const lines: string[] = [];
        const app = await open(
            'true',
            () =>
                Promise.reject(
                    new Error('invalid input syntax: "Aunt Mary\'s wish"')
                ),
            lines
        );
        const result = await app.inject({
            url: '/api/v1/ready?token=recovery-secret',
            headers: secrets,
        });
        expect(result.statusCode).toBe(500);
        const requestId = z
            .object({ error: z.object({ requestId: z.string() }) })
            .parse(result.json()).error.requestId;
        const logged = entries(lines);
        expect(logged).toContainEqual(
            expect.objectContaining({
                level: 50,
                msg: 'request failed',
                reqId: requestId,
                method: 'GET',
                route: '/api/v1/ready',
                statusCode: 500,
                durationMs: expect.any(Number) as unknown,
            })
        );
        expect(logged).toContainEqual(
            expect.objectContaining({
                level: 50,
                msg: 'unhandled error',
                reqId: requestId,
                err: expect.objectContaining({
                    type: 'Error',
                    message: '[redacted]',
                    stack: expect.stringContaining('at ') as unknown,
                }) as unknown,
            })
        );
        const text = lines.join('');
        expect(text).not.toContain('Aunt Mary');
        expect(text).not.toContain('recovery-secret');
        Object.values(secrets).forEach(secret =>
            expect(text).not.toContain(secret)
        );
    });
    it('logs route templates and statuses, never credentials, bodies or URLs', async () => {
        const lines: string[] = [];
        const app = await open('true', () => Promise.resolve(false), lines);
        const saved = await app.inject({
            method: 'POST',
            url: '/api/v1/workbench/wish-check?token=recovery-secret',
            headers: { ...secrets, origin: 'http://localhost:4200' },
            payload: {
                description: 'A private wish',
                url: 'https://example.com/private-wish',
                priority: 'high',
            },
        });
        expect(saved.statusCode).toBe(200);
        expect(
            (await app.inject('/organiser/participants/recovery-secret'))
                .statusCode
        ).toBe(404);
        const logged = entries(lines);
        expect(logged).toContainEqual(
            expect.objectContaining({
                level: 30,
                msg: 'request completed',
                method: 'POST',
                route: '/api/v1/workbench/wish-check',
                statusCode: 200,
            })
        );
        expect(logged).toContainEqual(
            expect.objectContaining({ route: null, statusCode: 404 })
        );
        const text = lines.join('');
        ['recovery-secret', 'private wish', 'example.com']
            .concat(Object.values(secrets))
            .forEach(secret => expect(text).not.toContain(secret));
    });
    it('redacts secret headers and fields if a later log call includes them', async () => {
        const lines: string[] = [];
        const app = await open('true', () => Promise.resolve(false), lines);
        app.log.warn(
            {
                headers: secrets,
                body: {
                    password: 'password-secret',
                    newPassword: 'new-password-secret',
                    token: 'token-secret',
                },
            },
            'probe'
        );
        const text = lines.join('');
        expect(text).toContain('[redacted]');
        Object.values(secrets)
            .concat(['password-secret', 'new-password-secret', 'token-secret'])
            .forEach(secret => expect(text).not.toContain(secret));
    });
    it('keeps healthy probes below info but logs an unready service', async () => {
        const lines: string[] = [];
        const app = await open('true', () => Promise.resolve(false), lines);
        expect((await app.inject('/api/v1/health')).statusCode).toBe(200);
        expect((await app.inject('/api/v1/ready')).statusCode).toBe(503);
        const logged = entries(lines);
        expect(logged).not.toContainEqual(
            expect.objectContaining({ route: '/api/v1/health' })
        );
        expect(logged).toContainEqual(
            expect.objectContaining({
                level: 50,
                route: '/api/v1/ready',
                statusCode: 503,
            })
        );
    });
});

// Every session is valid and the draw never moves, so a stream opens and then
// idles the way a family member's forgotten tab does.
const unused = () => Promise.reject(new Error('not used by the stream test'));
const idleExchange: ExchangeService = {
    preview: unused,
    readPreview: unused,
    bootstrap: unused,
    authenticate: unused,
    recover: unused,
    read: () =>
        Promise.resolve({
            status: 200,
            body: { seasonId: 'season', drawRevision: 0 },
        }),
    mutate: unused,
    logout: unused,
    reauthenticate: unused,
    issueRecovery: unused,
};

describe('live-update streams', () => {
    it('ends open streams on close instead of waiting for the clients to leave', async () => {
        const config = await loadConfig({ NODE_ENV: 'test' });
        const app = await createApp(
            { ...config, staticRoot: '/nonexistent/winter-test' },
            {
                ready: () => Promise.resolve(true),
                exchange: idleExchange,
                logStream: { write: () => undefined },
            }
        );
        const client = new AbortController();
        let closing: Promise<void> | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const address = await app.listen({ host: '127.0.0.1', port: 0 });
            const response = await fetch(`${address}/api/v1/me/draw-events`, {
                signal: client.signal,
            });
            expect(response.status).toBe(200);
            assert(response.body);
            const reader = response.body.getReader();
            expect(
                new TextDecoder().decode((await reader.read()).value)
            ).toContain('event: ready');
            closing = app.close();
            const stalled = new Promise<string>(resolve => {
                timer = setTimeout(
                    resolve,
                    2000,
                    'still waiting for the stream'
                );
            });
            expect(
                await Promise.race([closing.then(() => 'closed'), stalled])
            ).toBe('closed');
            // The client sees its stream end, so EventSource reconnects to
            // the next process instead of hanging on a dead one.
            expect(
                await reader.read().then(
                    result => result.done,
                    () => true
                )
            ).toBe(true);
        } finally {
            clearTimeout(timer);
            client.abort();
            await (closing ?? app.close());
        }
    });
});
