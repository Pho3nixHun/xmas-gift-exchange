import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    schema: './apps/api/src/adapters/db/schema.ts',
    out: './apps/api/drizzle',
});
