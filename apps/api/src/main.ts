import { bootstrap } from './bootstrap.js';

const { app, config } = await bootstrap(process.env);
await app.listen({ host: config.host, port: config.port });
process.once('SIGTERM', () => {
    void app.close();
});
process.once('SIGINT', () => {
    void app.close();
});
