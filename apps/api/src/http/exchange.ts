import {
    assignmentSchema,
    bootstrapSchema,
    createWishSchema,
    credentialsSchema,
    enrolmentSchema,
    drawCommandSchema,
    editWishSchema,
    idSchema,
    meSchema,
    openSchema,
    passwordOnlySchema,
    personSchema,
    poolSchema,
    recoverySchema,
    resetSchema,
    seasonCommandSchema,
    setupCommandSchema,
    setupSchema,
    versionCommandSchema,
    wishListSchema,
} from '@winter/contracts/exchange';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type {
    ExchangeService,
    Outcome,
    Role,
} from '../application/exchange.js';
import type { AppConfig } from '../config.js';
import { fail } from '../errors.js';

import { createStreams } from './streams.js';

const cookieName = (config: AppConfig, role: Role) =>
    `${config.auth.secure ? '__Host-' : ''}winter-${role}`;
const cookie = (request: FastifyRequest, name: string) =>
    request.headers.cookie
        ?.split(';')
        .map(part => part.trim())
        .find(part => part.startsWith(`${name}=`))
        ?.slice(name.length + 1) ?? '';
const actorRequest = (
    request: FastifyRequest,
    config: AppConfig,
    role: Role,
    write = false
) => ({
    token: cookie(request, cookieName(config, role)),
    role,
    ...(write ? { csrf: String(request.headers['x-csrf-token'] ?? '') } : {}),
});
const response = (reply: FastifyReply, outcome: Outcome) =>
    reply.code(outcome.status).send(outcome.body);
const setCookie = (
    reply: FastifyReply,
    config: AppConfig,
    role: Role,
    token: string,
    clear = false
) => {
    const age = clear
        ? 0
        : role === 'participant'
          ? config.auth.participantDays * 86400
          : config.auth.organiserHours * 3600;
    reply.header(
        'Set-Cookie',
        `${cookieName(config, role)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${config.auth.secure ? '; Secure' : ''}`
    );
};
const jsonSchema = (schema: z.ZodType) =>
    z.toJSONSchema(schema, { io: 'input', target: 'draft-7' });
const okSchema = z.strictObject({ ok: z.boolean() });
const mutationResponse = (operation: string) =>
    new Map<string, z.ZodType>([
        ['draw', assignmentSchema],
        ['create-wish', z.strictObject({ id: idSchema })],
        ['reset', z.strictObject({ ok: z.boolean(), seasonId: idSchema })],
        ['validate', z.strictObject({ valid: z.boolean() })],
    ]).get(operation) ?? okSchema;
const paramsSchema = z.object({ id: idSchema });
const target = (request: FastifyRequest) =>
    paramsSchema.safeParse(request.params).data?.id;

export const registerExchange = (
    app: FastifyInstance,
    service: ExchangeService,
    config: AppConfig
) => {
    const streams = createStreams(service);
    const limits = new Map<
        string,
        { readonly count: number; readonly until: number }
    >();
    // Keys include caller-supplied session cookies, so an anonymous caller can
    // mint them without limit. Bound the table by dropping the entries closest
    // to expiry: refusing every caller once it is full would turn a table that
    // is cheap to fill into an outage for the whole family.
    const capacity = 20_000;
    const evict = (now: number) => {
        limits.forEach((value, id) => {
            if (value.until <= now) limits.delete(id);
        });
        if (limits.size < capacity) return;
        [...limits]
            .sort(([, a], [, b]) => a.until - b.until)
            .slice(0, Math.ceil(capacity / 10))
            .forEach(([id]) => limits.delete(id));
    };
    const limit = async (key: string, count: number, duration: number) => {
        const now = Date.now();
        if (limits.size >= capacity) evict(now);
        const previous = limits.get(key);
        const value =
            previous && previous.until > now
                ? previous
                : { count: 0, until: now + duration };
        if (value.count >= count) return fail('RATE_LIMITED', 429);
        limits.set(key, { ...value, count: value.count + 1 });
    };
    const undoLimit = (key: string) => {
        const value = limits.get(key);
        if (value)
            limits.set(key, { ...value, count: Math.max(0, value.count - 1) });
    };
    app.addHook('onClose', () => {
        streams.close();
        return Promise.resolve();
    });
    app.get(
        '/api/v1/bootstrap',
        { schema: { response: { 200: jsonSchema(bootstrapSchema) } } },
        async (_request, reply) => response(reply, await service.bootstrap())
    );
    const reads = [
        ['me', '/me', meSchema, 'participant'],
        ['assignment', '/me/assignment', assignmentSchema, 'participant'],
        ['pool', '/me/draw-options', poolSchema, 'participant'],
        [
            'people',
            '/participants',
            z.strictObject({ people: z.array(personSchema) }),
            'participant',
        ],
        ['wishes', '/me/wishes', wishListSchema, 'participant'],
        ['wishes', '/participants/:id/wishes', wishListSchema, 'participant'],
        ['setup', '/organiser/setup', setupSchema, 'organiser'],
    ] as const;
    reads.forEach(([operation, path, schema, role]) =>
        app.get(
            `/api/v1${path}`,
            {
                schema: {
                    response: { 200: jsonSchema(schema) },
                    ...(path.includes(':id')
                        ? { params: jsonSchema(paramsSchema) }
                        : {}),
                },
            },
            async (request, reply) => {
                const query = z
                    .object({ cursor: idSchema.optional() })
                    .parse(request.query);
                return response(
                    reply,
                    await service.read({
                        ...actorRequest(request, config, role),
                        operation,
                        target: target(request),
                        cursor: query.cursor,
                    })
                );
            }
        )
    );
    const writes = [
        ['POST', '/me/draw', 'draw', drawCommandSchema, 'participant'],
        ['POST', '/me/wishes', 'create-wish', createWishSchema, 'participant'],
        ['PATCH', '/me/wishes/:id', 'edit-wish', editWishSchema, 'participant'],
        [
            'DELETE',
            '/me/wishes/:id',
            'delete-wish',
            versionCommandSchema,
            'participant',
        ],
        [
            'PUT',
            '/wishes/:id/claim',
            'claim',
            versionCommandSchema,
            'participant',
        ],
        [
            'DELETE',
            '/wishes/:id/claim',
            'release',
            seasonCommandSchema,
            'participant',
        ],
        ['PUT', '/organiser/setup', 'setup', setupCommandSchema, 'organiser'],
        [
            'POST',
            '/organiser/validate',
            'validate',
            seasonCommandSchema,
            'organiser',
        ],
        ['POST', '/organiser/open', 'open', openSchema, 'organiser'],
        ['POST', '/organiser/reset', 'reset', resetSchema, 'organiser'],
    ] as const;
    writes.forEach(([method, path, operation, schema, role]) =>
        app.route({
            method,
            url: `/api/v1${path}`,
            schema: {
                body: jsonSchema(schema),
                response: { 200: jsonSchema(mutationResponse(operation)) },
                ...(path.includes(':id')
                    ? { params: jsonSchema(paramsSchema) }
                    : {}),
            },
            handler: async (request, reply) => {
                const actor = actorRequest(request, config, role, true);
                await limit(`write:${actor.token}`, 60, 60_000);
                const key = idSchema.parse(request.headers['idempotency-key']);
                const outcome = await service.mutate({
                    ...actor,
                    operation,
                    input: schema.parse(request.body),
                    target: target(request),
                    key,
                });
                if (outcome.status === 200) streams.refresh();
                return response(reply, outcome);
            },
        })
    );
    (['participant', 'organiser'] as const).forEach(role => {
        const prefix = role === 'organiser' ? '/organiser/auth' : '/auth';
        (role === 'organiser'
            ? (['login'] as const)
            : (['login', 'enrol'] as const)
        ).forEach(mode =>
            app.post(
                `/api/v1${prefix}/${mode}`,
                {
                    schema: {
                        body: jsonSchema(
                            role === 'participant'
                                ? mode === 'enrol'
                                    ? enrolmentSchema
                                    : credentialsSchema
                                : passwordOnlySchema
                        ),
                        response: {
                            200: jsonSchema(
                                okSchema.extend({ csrf: z.string() })
                            ),
                        },
                    },
                },
                async (request, reply) => {
                    await limit(`auth:${request.ip}`, 30, 900_000);
                    const input =
                        role === 'participant'
                            ? (mode === 'enrol'
                                  ? enrolmentSchema
                                  : credentialsSchema
                              ).parse(request.body)
                            : passwordOnlySchema.parse(request.body);
                    const identity =
                        role === 'participant'
                            ? credentialsSchema.parse(input).participantId
                            : 'organiser';
                    await limit(`identity:${identity}`, 5, 900_000);
                    const outcome = await service.authenticate({
                        role,
                        enrol: mode === 'enrol',
                        input,
                    });
                    limits.delete(`identity:${identity}`);
                    undoLimit(`auth:${request.ip}`);
                    if (outcome.token)
                        setCookie(reply, config, role, outcome.token);
                    return response(reply, outcome);
                }
            )
        );
        app.post(`/api/v1${prefix}/logout`, async (request, reply) => {
            const outcome = await service.logout(
                actorRequest(request, config, role, true)
            );
            setCookie(reply, config, role, '', true);
            streams.refresh();
            return response(reply, outcome);
        });
    });
    app.post(
        '/api/v1/auth/recover',
        {
            schema: {
                body: jsonSchema(recoverySchema),
                response: { 200: jsonSchema(okSchema) },
            },
        },
        async (request, reply) => {
            await limit(`recover:${request.ip}`, 10, 900_000);
            const outcome = await service.recover(
                recoverySchema.parse(request.body)
            );
            streams.refresh();
            return response(reply, outcome);
        }
    );
    app.post(
        '/api/v1/organiser/reauth',
        {
            schema: {
                body: jsonSchema(passwordOnlySchema),
                response: { 200: jsonSchema(okSchema) },
            },
        },
        async (request, reply) => {
            await limit(`reauth:${request.ip}`, 10, 900_000);
            return response(
                reply,
                await service.reauthenticate(
                    actorRequest(request, config, 'organiser', true),
                    request.body
                )
            );
        }
    );
    app.post(
        '/api/v1/organiser/participants/:id/recovery',
        {
            schema: {
                params: jsonSchema(paramsSchema),
                body: jsonSchema(seasonCommandSchema),
                response: {
                    200: jsonSchema(z.strictObject({ url: z.string() })),
                },
            },
        },
        async (request, reply) => {
            const id = paramsSchema.parse(request.params).id;
            const actor = actorRequest(request, config, 'organiser', true);
            await limit(`issue:${id}`, 5, 3600_000);
            await limit(`issuer:${actor.token}`, 20, 3600_000);
            return response(
                reply,
                await service.issueRecovery(actor, request.body, id)
            );
        }
    );
    app.get('/api/v1/me/draw-events', async (request, reply) => {
        if (
            request.headers['sec-fetch-site'] === 'cross-site' ||
            (request.headers.origin && request.headers.origin !== config.origin)
        )
            return fail('ORIGIN_REJECTED', 403);
        return streams.open(
            actorRequest(request, config, 'participant'),
            request,
            reply
        );
    });
    app.post('/api/v1/previews', async (request, reply) => {
        const actor = actorRequest(request, config, 'participant', true);
        await limit(`preview:${actor.token}`, 5, 60_000);
        return response(reply, await service.preview(actor, request.body));
    });
    app.get(
        '/api/v1/previews/:id',
        { schema: { params: jsonSchema(paramsSchema) } },
        async (request, reply) =>
            response(
                reply,
                await service.readPreview(
                    actorRequest(request, config, 'participant'),
                    paramsSchema.parse(request.params).id
                )
            )
    );
};
