import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    webServer: process.env['CI']
        ? {
              command: 'node e2e/server.mjs',
              url: 'http://localhost:3000/api/v1/ready',
              env: {
                  WORKBENCH_ENABLED: 'true',
                  PUBLIC_ORIGIN: 'http://localhost:3000',
              },
              timeout: 30_000,
          }
        : undefined,
    testDir: './e2e',
    fullyParallel: false,
    use: {
        locale: 'hu-HU',
        baseURL: process.env['E2E_URL'] ?? 'http://localhost:4200',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    executablePath: process.env['CHROMIUM_PATH'],
                    args: [
                        '--no-sandbox',
                        '--use-gl=angle',
                        '--use-angle=swiftshader',
                        '--enable-unsafe-swiftshader',
                    ],
                },
            },
        },
    ],
});
