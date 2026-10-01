import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('startup configuration', () => {
    it('fails closed for missing production database configuration', async () => {
        await expect(loadConfig({ NODE_ENV: 'production' })).rejects.toThrow(
            'Production requires database configuration'
        );
    });
    it('rejects conflicting plain and file secrets', async () => {
        await expect(
            loadConfig({
                DATABASE_URL: 'postgresql://example',
                DATABASE_URL_FILE: '/ignored',
            })
        ).rejects.toThrow('not both');
    });
    it('does not accept an origin with a path or credentials', async () => {
        await expect(
            loadConfig({ PUBLIC_ORIGIN: 'https://user:pass@example.com/path' })
        ).rejects.toThrow('origin');
    });
    it('logs at info unless a known level is configured', async () => {
        expect((await loadConfig({})).logLevel).toBe('info');
        expect((await loadConfig({ LOG_LEVEL: 'warn' })).logLevel).toBe('warn');
        await expect(loadConfig({ LOG_LEVEL: 'verbose' })).rejects.toThrow();
    });
});
