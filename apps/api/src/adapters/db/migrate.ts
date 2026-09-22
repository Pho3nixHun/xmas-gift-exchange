import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { loadConfig } from '../../config.js';

import { connectDatabase } from './connection.js';

const config = await loadConfig(process.env);
if (!config.databaseUrl) {
    // eslint-disable-next-line functional/no-throw-statements -- fail the explicit migration command before any writes
    throw new Error('Database configuration is required for migrations.');
}
const database = connectDatabase(config.databaseUrl);
try {
    await migrate(database.db, {
        migrationsFolder: fileURLToPath(
            new URL('../../../drizzle', import.meta.url)
        ),
    });
} finally {
    await database.close();
}
