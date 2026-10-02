import { afterEach, describe, expect, it } from 'vitest';

import { connectDatabase } from './connection.js';

const databases = new Set<ReturnType<typeof connectDatabase>>();
afterEach(async () => {
    await Promise.all([...databases].map(database => database.close()));
    databases.clear();
});

// What PostgreSQL sends every open session when it shuts down or restarts.
const adminShutdown = () =>
    Object.assign(
        new Error('terminating connection due to administrator command'),
        { code: '57P01' }
    );

describe('connectDatabase', () => {
    it('survives an idle connection dying instead of crashing the process', () => {
        // No connection is opened: pg's pool connects on the first query.
        const database = connectDatabase('postgres://127.0.0.1:1/none');
        databases.add(database);

        expect(() =>
            database.pool.emit('error', adminShutdown(), undefined)
        ).not.toThrow();
    });
});
