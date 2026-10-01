import { existsSync } from 'node:fs';

import staticPlugin from '@fastify/static';
import {
    apiErrorSchema,
    publicConfigSchema,
    wishCheckSchema,
    wishDraftSchema,
} from '@winter/contracts';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { ExchangeService } from '../application/exchange.js';
import type { AppConfig } from '../config.js';
import { ExchangeError } from '../errors.js';

import { registerExchange } from './exchange.js';
import { installAccessLog, logging } from './logging.js';
import type { LogStream } from './logging.js';
import { installOpenApi } from './openapi.js';

export type AppServices = { readonly ready: () => Promise<boolean> } & {
    readonly exchange?: ExchangeService;
    readonly logStream?: LogStream;
};

export const createApp = async (
    config: AppConfig,
    services: AppServices
): Promise<FastifyInstance> => {
    const app = Fastify({
        ...logging(config.logLevel, services.logStream),
        bodyLimit: config.bodyLimit,
        trustProxy: config.trustedProxies.length
            ? [...config.trustedProxies]
            : false,
        requestTimeout: 10_000,
        ajv: { customOptions: { removeAdditional: false } },
    });
    installAccessLog(app);
    installOpenApi(app);
    app.addHook('onRequest', async (request, reply) => {
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('Referrer-Policy', 'no-referrer');
        reply.header(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        );
        if (request.url.startsWith('/api/'))
            reply.header('Cache-Control', 'no-store');
        if (config.auth.secure)
            reply.header('Strict-Transport-Security', 'max-age=31536000');
        if (
            config.maintenance &&
            !['/api/v1/health', '/api/v1/ready'].includes(request.url)
        )
            return reply
                .header('Retry-After', '60')
                .code(503)
                .send({
                    error: { code: 'MAINTENANCE', requestId: request.id },
                });
        if (
            !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
            (request.headers.origin !== config.origin ||
                request.headers['sec-fetch-site'] === 'cross-site')
        ) {
            return reply.code(403).send({
                error: { code: 'ORIGIN_REJECTED', requestId: request.id },
            });
        }
    });
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof ExchangeError) {
            if (error.statusCode === 429) reply.header('Retry-After', '60');
            void reply
                .code(error.statusCode)
                .send({ error: { code: error.code, requestId: request.id } });
            return;
        }
        if (error instanceof z.ZodError) {
            void reply.code(422).send({
                error: { code: 'VALIDATION_FAILED', requestId: request.id },
            });
            return;
        }
        // Never log user input, URLs, credentials or raw validation exceptions:
        // the err serializer keeps only the error's type, code and stack frames.
        const status =
            typeof error === 'object' &&
            error !== null &&
            'statusCode' in error &&
            typeof error.statusCode === 'number' &&
            error.statusCode >= 400 &&
            error.statusCode < 500
                ? error.statusCode
                : 500;
        if (status >= 500) request.log.error({ err: error }, 'unhandled error');
        void reply.code(status).send({
            error: {
                code: status < 500 ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR',
                requestId: request.id,
            },
        });
    });
    app.get('/api/v1/health', () => ({ status: 'ok' }));
    if (services.exchange) registerExchange(app, services.exchange, config);
    app.get('/api/v1/ready', async (_request, reply) => {
        const ready = await services.ready();
        return reply
            .code(ready ? 200 : 503)
            .send({ status: ready ? 'ready' : 'unavailable' });
    });
    app.get(
        '/api/v1/public-config',
        { schema: { response: { 200: z.toJSONSchema(publicConfigSchema) } } },
        () => publicConfigSchema.parse(config.public)
    );
    if (config.public.workbenchEnabled) {
        app.post(
            '/api/v1/workbench/wish-check',
            {
                schema: {
                    response: {
                        200: z.toJSONSchema(wishCheckSchema),
                        422: z.toJSONSchema(apiErrorSchema),
                    },
                },
            },
            (request, reply) => {
                const result = wishDraftSchema.safeParse(request.body);
                if (!result.success)
                    return reply.code(422).send({
                        error: {
                            code: 'VALIDATION_FAILED',
                            requestId: request.id,
                        },
                    });
                // P0 validates only. No unauthenticated persistence or exchange data.
                return { wish: result.data };
            }
        );
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- operator-configured static asset directory
    if (existsSync(config.staticRoot)) {
        await app.register(staticPlugin, {
            root: config.staticRoot,
            wildcard: false,
        });
        app.setNotFoundHandler((request, reply) => {
            if (
                request.method === 'GET' &&
                !request.url.startsWith('/api/') &&
                !request.url.includes('.')
            ) {
                return reply
                    .header('Cache-Control', 'no-store')
                    .sendFile('index.html');
            }
            return reply
                .code(404)
                .send({ error: { code: 'NOT_FOUND', requestId: request.id } });
        });
    }
    return app;
};
