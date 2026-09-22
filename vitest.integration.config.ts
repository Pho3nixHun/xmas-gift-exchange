import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['apps/**/*.integration.spec.ts'],
        environment: 'node',
        fileParallelism: false,
    },
});
