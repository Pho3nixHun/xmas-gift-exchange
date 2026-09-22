import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

import { createApp } from './app.js';

const apps = new Set<Awaited<ReturnType<typeof createApp>>>();
afterEach(async () => {
    await Promise.all([...apps].map(app => app.close()));
    apps.clear();
});
const open = async (enabled = 'true') => {
    const config = await loadConfig({
        NODE_ENV: 'test',
        WORKBENCH_ENABLED: enabled,
    });
    const app = await createApp(
        { ...config, staticRoot: '/nonexistent/winter-test' },
        { ready: () => Promise.resolve(false) }
    );
    apps.add(app);
    return app;
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
