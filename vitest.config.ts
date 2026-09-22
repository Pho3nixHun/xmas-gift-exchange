import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['packages/**/*.spec.ts', 'apps/**/*.spec.ts'],
        exclude: ['**/*.integration.spec.ts'],
        environment: 'node',
    },
});
