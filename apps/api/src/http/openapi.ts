import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const record = z.record(z.string(), z.unknown());
export const installOpenApi = (app: FastifyInstance) => {
    const paths = new Map<string, Readonly<Record<string, unknown>>>();
    app.addHook('onRoute', route => {
        if (
            !route.url.startsWith('/api/v1/') ||
            route.url.endsWith('/openapi.json')
        )
            return;
        const path = route.url.replace(/:([a-z]+)/gu, '{$1}');
        const methods = Array.isArray(route.method)
            ? route.method
            : [route.method];
        const body = record.safeParse(route.schema?.body).data;
        const params =
            record.safeParse(
                record.safeParse(route.schema?.params).data?.['properties']
            ).data ?? {};
        const responses = record.safeParse(route.schema?.response).data ?? {
            '200': { type: 'object' },
        };
        methods
            .filter(method => method !== 'HEAD')
            .forEach(method => {
                const entry = {
                    operationId: `${method.toLowerCase()}_${path.replace(/[^a-z0-9]+/giu, '_')}`,
                    ...(body
                        ? {
                              requestBody: {
                                  required: true,
                                  content: {
                                      'application/json': { schema: body },
                                  },
                              },
                          }
                        : {}),
                    parameters: Object.entries(params).map(
                        ([name, schema]) => ({
                            name,
                            in: 'path',
                            required: true,
                            schema,
                        })
                    ),
                    responses: Object.fromEntries(
                        Object.entries(responses).map(([status, schema]) => [
                            status,
                            {
                                description:
                                    status === '200' ? 'Success' : 'Error',
                                content: { 'application/json': { schema } },
                            },
                        ])
                    ),
                };
                paths.set(path, {
                    ...paths.get(path),
                    [method.toLowerCase()]: entry,
                });
            });
    });
    app.get('/api/v1/openapi.json', () => ({
        openapi: '3.1.0',
        info: { title: 'The little winter house', version: '1.0.0' },
        servers: [{ url: '/' }],
        paths: Object.fromEntries(paths),
    }));
};
