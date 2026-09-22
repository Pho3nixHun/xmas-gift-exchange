// Disposable browser-test server only. Production never imports this file.
import { passwords } from '../apps/api/dist/adapters/auth/passwords.js';

process.env.ORGANISER_HASH = await passwords().hash('Winter-browser-test-8');
process.env.NODE_ENV = 'test';
process.env.PUBLIC_ORIGIN ??= 'http://localhost:3000';
await import('../apps/api/dist/main.js');
