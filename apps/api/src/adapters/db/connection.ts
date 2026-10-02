import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

export const connectDatabase = (
    connectionString: string,
    settings = { poolSize: 5, queryTimeout: 5000 }
) => {
    const pool = new pg.Pool({
        connectionString,
        max: settings.poolSize,
        connectionTimeoutMillis: 3000,
        statement_timeout: settings.queryTimeout,
        lock_timeout: settings.queryTimeout,
    });
    // pg emits 'error' on the pool when an IDLE client's connection dies, e.g. when
    // PostgreSQL restarts and sends FATAL 57P01 to every session. Without a listener
    // Node treats that as an uncaught exception and the process exits (2026-10-02,
    // the PostgreSQL 18.6 update). pg has already discarded the client and the next
    // query connects again, so nothing needs doing here; bootstrap also logs it.
    pool.on('error', () => undefined);
    const db = drizzle(pool);
    return {
        db,
        pool,
        close: () => pool.end(),
        ready: () =>
            pool
                .query('SELECT 1')
                .then(() => true)
                .catch(() => false),
    };
};
