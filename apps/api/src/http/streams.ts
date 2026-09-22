import { PassThrough } from 'node:stream';

import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { ActorRequest, ExchangeService } from '../application/exchange.js';
import { fail } from '../errors.js';

const revisionSchema = z.object({
    seasonId: z.string(),
    drawRevision: z.number(),
});
export const createStreams = (service: ExchangeService) => {
    const connections = new Map<
        PassThrough,
        {
            readonly actor: ActorRequest;
            readonly revision: number;
            readonly seasonId: string;
            readonly heartbeat: number;
        }
    >();
    const timers = new Set<ReturnType<typeof setInterval>>();
    const busy = new Set<PassThrough>();
    const send = (stream: PassThrough, event: string, data: unknown) => {
        if (stream.readableLength > 16384) {
            stream.destroy();
            return;
        }
        stream.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const refreshOne = async (stream: PassThrough) => {
        const state = connections.get(stream);
        if (!state || busy.has(stream)) return;
        busy.add(stream);
        try {
            const snapshot = revisionSchema.parse(
                (await service.read({ ...state.actor, operation: 'revision' }))
                    .body
            );
            if (stream.destroyed) return;
            if (state.seasonId && state.seasonId !== snapshot.seasonId) {
                send(stream, 'session-ended', { reason: 'season-changed' });
                stream.end();
                return;
            }
            const initial = state.revision < 0;
            if (initial || snapshot.drawRevision > state.revision)
                send(stream, initial ? 'ready' : 'draw-invalidated', snapshot);
            const heartbeat = Date.now() - state.heartbeat >= 15000;
            if (heartbeat) send(stream, 'heartbeat', {});
            connections.set(stream, {
                ...state,
                revision: snapshot.drawRevision,
                seasonId: snapshot.seasonId,
                heartbeat: heartbeat ? Date.now() : state.heartbeat,
            });
        } catch {
            send(stream, 'session-ended', { reason: 'revoked' });
            stream.end();
        } finally {
            busy.delete(stream);
        }
    };
    const refresh = () => {
        connections.forEach((_value, stream) => {
            void refreshOne(stream);
        });
    };
    return {
        refresh,
        open: async (
            actor: ActorRequest,
            request: FastifyRequest,
            reply: FastifyReply
        ) => {
            await service.read({ ...actor, operation: 'revision' });
            if (
                connections.size >= 120 ||
                [...connections.values()].filter(
                    value => value.actor.token === actor.token
                ).length >= 4
            )
                return fail('RATE_LIMITED', 429);
            const stream = new PassThrough({ highWaterMark: 16384 });
            connections.set(stream, {
                actor,
                revision: -1,
                seasonId: '',
                heartbeat: Date.now(),
            });
            const cleanup = () => {
                connections.delete(stream);
                busy.delete(stream);
                stream.destroy();
                if (!connections.size) {
                    timers.forEach(clearInterval);
                    timers.clear();
                }
            };
            request.raw.once('close', cleanup);
            stream.once('close', cleanup);
            if (!timers.size) timers.add(setInterval(refresh, 2000));
            reply
                .header('Content-Type', 'text/event-stream')
                .header('Cache-Control', 'no-store, no-transform')
                .header('X-Accel-Buffering', 'no');
            void refreshOne(stream);
            return reply.send(stream);
        },
        close: () => {
            timers.forEach(clearInterval);
            timers.clear();
            connections.forEach((_value, stream) => stream.destroy());
            connections.clear();
        },
    };
};
