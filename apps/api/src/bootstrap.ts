import { connectDatabase } from './adapters/db/connection.js';
import { createExchange } from './application/service.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';

// The one place that decides which concrete adapters the use cases run against.
// Without a database the app still answers health, readiness and public config,
// so an operator can tell a missing configuration from a crashed process.
export const bootstrap = async (env: NodeJS.ProcessEnv) => {
    const config = await loadConfig(env);
    const database = config.databaseUrl
        ? connectDatabase(config.databaseUrl, config.database)
        : undefined;
    const app = await createApp(config, {
        ready: database?.ready ?? (() => Promise.resolve(false)),
        exchange: database
            ? await createExchange(database.db, config)
            : undefined,
    });
    database?.pool.on('error', error => {
        app.log.warn(
            { err: error },
            'database connection dropped; the next query reconnects'
        );
    });
    app.addHook('onClose', async () => {
        await database?.close();
    });
    return { app, config };
};
