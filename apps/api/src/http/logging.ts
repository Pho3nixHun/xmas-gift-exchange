import { LogController } from 'fastify';
import type { FastifyInstance } from 'fastify';

import type { AppConfig } from '../config.js';

// Where JSON log lines go. Production writes to stdout; tests capture lines.
export interface LogStream {
    readonly write: (line: string) => void;
}

// Logs carry no family data and nothing that proves who someone is: no
// bodies, names, URLs, wish text, cookies, CSRF tokens or passwords. The
// serializers below emit only allowlisted fields. These redact paths are a
// second boundary for a later `log.info({ headers })` or `{ body }` call.
const secretHeaders = [
    'cookie',
    'set-cookie',
    'authorization',
    'x-csrf-token',
] as const;
const secretFields = [
    'password',
    'newPassword',
    'token',
    'csrf',
    'organiserHash',
    'databaseUrl',
    'url',
] as const;
const redactPaths = [
    ...['headers', 'req.headers', 'res.headers'].flatMap(parent =>
        secretHeaders.map(header => `${parent}["${header}"]`)
    ),
    ...secretFields.flatMap(field => [field, `*.${field}`]),
];

const property = (value: unknown, key: string): unknown =>
    typeof value === 'object' && value !== null && key in value
        ? Reflect.get(value, key)
        : undefined;

const kind = (error: unknown) => {
    const code = property(error, 'code');
    return {
        type: error instanceof Error ? error.constructor.name : typeof error,
        ...(typeof code === 'string' || typeof code === 'number'
            ? { code: String(code) }
            : {}),
    };
};

// An error message can quote what caused it: Drizzle puts query parameters in
// its message, and PostgreSQL and JSON parse errors echo the input. Keep the
// class, the machine-readable code (a PostgreSQL SQLSTATE for a wrapped
// database error) and the stack frames, which locate a fault without
// repeating the request.
const safeError = (error: unknown) => {
    const stack = property(error, 'stack');
    const cause = property(error, 'cause');
    return {
        ...kind(error),
        message: '[redacted]',
        stack:
            typeof stack === 'string'
                ? stack
                      .split('\n')
                      .map(line => line.trim())
                      .filter(line => line.startsWith('at '))
                      .join('\n')
                : '',
        ...(cause === undefined ? {} : { cause: kind(cause) }),
    };
};

// Fastify's built-in request lines include the raw URL, which can carry IDs or
// a recovery token. They are replaced by one line per response from
// `installAccessLog`.
export const logging = (
    level: AppConfig['logLevel'],
    stream: LogStream | undefined
) => ({
    logger: {
        level,
        redact: { paths: redactPaths, censor: '[redacted]' },
        // Fastify's remaining built-in lines, such as the 503 sent while the
        // server closes, pass `req` and `res` through these.
        serializers: {
            req: (request: { readonly method: string }) => ({
                method: request.method,
            }),
            res: (reply: { readonly statusCode: number }) => ({
                statusCode: reply.statusCode,
            }),
            err: (error: unknown) => safeError(error),
        },
        ...(stream ? { stream } : {}),
    },
    logController: new LogController({ disableRequestLogging: true }),
});

// The container health check calls these every few seconds; a successful
// probe is not worth an info line.
const probes: ReadonlySet<string> = new Set([
    '/api/v1/health',
    '/api/v1/ready',
]);
const levelOf = (route: string | undefined, status: number) =>
    status >= 500
        ? 'error'
        : status < 400 && route !== undefined && probes.has(route)
          ? 'debug'
          : 'info';

// One line per response: request ID (bound by Fastify as `reqId`), method,
// route template, status and duration. The template stands in for the URL.
export const installAccessLog = (app: FastifyInstance) => {
    app.addHook('onResponse', (request, reply) => {
        const route = request.routeOptions.url;
        const status = reply.statusCode;
        request.log[levelOf(route, status)](
            {
                method: request.method,
                route: route ?? null,
                statusCode: status,
                durationMs: Math.round(reply.elapsedTime),
            },
            status >= 500 ? 'request failed' : 'request completed'
        );
        return Promise.resolve();
    });
};
