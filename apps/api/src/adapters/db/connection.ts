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
