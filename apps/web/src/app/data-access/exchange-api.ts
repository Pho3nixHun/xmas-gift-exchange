import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
    assignmentSchema,
    bootstrapSchema,
    meSchema,
    personSchema,
    poolSchema,
    setupSchema,
    wishListSchema,
} from '@winter/contracts/exchange';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

import { supportedLocale } from '../core/locale';

const pendingSchema = z.object({
    seasonId: z.uuid(),
    slotId: z.uuid(),
    key: z.uuid(),
});
export type PendingDraw = Readonly<z.infer<typeof pendingSchema>>;
export const errorCode = (error: unknown) =>
    error instanceof HttpErrorResponse
        ? (z
              .object({ error: z.object({ code: z.string() }) })
              .safeParse(error.error).data?.error.code ??
          (error.status === 0 ? 'OFFLINE' : 'UNAVAILABLE'))
        : 'UNAVAILABLE';

const definiteFailure = (error: unknown) =>
    error instanceof HttpErrorResponse &&
    error.status > 0 &&
    error.status < 500;
const previewSchema = z.object({
    id: z.string().nullable(),
    status: z.enum(['pending', 'ready', 'unavailable']),
    title: z.string(),
    site: z.string(),
});

@Injectable({ providedIn: 'root' })
export class ExchangeApi {
    preferredLocale() {
        return (
            this.preferences.get().locale ??
            supportedLocale(navigator.languages)
        );
    }
    private readonly http = inject(HttpClient);
    private readonly mutationKeys = new Map<string, string>();
    readonly preferences = {
        get: () => {
            try {
                return z
                    .object({
                        locale: z.enum(['hu', 'en']).nullable().default(null),
                        simple: z.boolean().default(false),
                        paused: z.boolean().default(false),
                    })
                    .parse(
                        JSON.parse(
                            localStorage.getItem('winter.preferences') ?? '{}'
                        )
                    );
            } catch {
                return { locale: null, simple: false, paused: false };
            }
        },
        set: (value: {
            readonly locale: 'hu' | 'en' | null;
            readonly simple: boolean;
            readonly paused: boolean;
        }) => {
            try {
                localStorage.setItem(
                    'winter.preferences',
                    JSON.stringify(value)
                );
            } catch {
                /* Device preferences are optional. */
            }
        },
    };
    private read<T>(
        path: string,
        schema: { readonly parse: (input: unknown) => T }
    ) {
        return firstValueFrom(this.http.get<unknown>(`/api/v1${path}`)).then(
            value => schema.parse(value)
        );
    }
    readonly bootstrap = () => this.read('/bootstrap', bootstrapSchema);
    readonly me = () => this.read('/me', meSchema);
    readonly assignment = () => this.read('/me/assignment', assignmentSchema);
    readonly pool = () => this.read('/me/draw-options', poolSchema);
    readonly people = () =>
        this.read('/participants', z.object({ people: z.array(personSchema) }));
    readonly setup = () => this.read('/organiser/setup', setupSchema);
    readonly wishes = (owner?: string, cursor?: string) =>
        this.read(
            `${owner ? `/participants/${owner}/wishes` : '/me/wishes'}${cursor ? `?cursor=${cursor}` : ''}`,
            wishListSchema
        );
    readonly write = async (
        path: string,
        body: unknown,
        options: {
            readonly csrf?: string;
            readonly key?: string;
            readonly method?: string;
        } = {}
    ) => {
        const fingerprint = JSON.stringify([
            path,
            options.method ?? 'POST',
            body,
        ]);
        const key =
            options.key ??
            this.mutationKeys.get(fingerprint) ??
            crypto.randomUUID();
        if (!path.includes('auth') && !path.includes('recovery'))
            this.mutationKeys.set(fingerprint, key);
        try {
            const result = await firstValueFrom(
                this.http.request<unknown>(
                    options.method ?? 'POST',
                    `/api/v1${path}`,
                    {
                        body,
                        headers: {
                            'X-CSRF-Token': options.csrf ?? '',
                            'Idempotency-Key': key,
                        },
                    }
                )
            );
            this.mutationKeys.delete(fingerprint);
            return result;
        } catch (error) {
            if (definiteFailure(error)) this.mutationKeys.delete(fingerprint);
            throw error;
        }
    };
    async preview(url: string, seasonId: string, csrf: string) {
        const initial = previewSchema.parse(
            await this.write('/previews', { url, seasonId }, { csrf })
        );
        const poll = async (
            value: z.infer<typeof previewSchema>,
            remaining: number
        ): Promise<z.infer<typeof previewSchema>> => {
            if (value.status !== 'pending' || !value.id || remaining === 0)
                return value;
            await new Promise<void>(resolve => setTimeout(resolve, 700));
            return poll(
                await this.read(`/previews/${value.id}`, previewSchema),
                remaining - 1
            );
        };
        return poll(initial, 8);
    }
    readonly pending = {
        get: (): PendingDraw | null => {
            try {
                return (
                    pendingSchema.safeParse(
                        JSON.parse(
                            sessionStorage.getItem('winter.pending') ?? 'null'
                        )
                    ).data ?? null
                );
            } catch {
                return null;
            }
        },
        set: (value: PendingDraw | null) => {
            try {
                if (value)
                    sessionStorage.setItem(
                        'winter.pending',
                        JSON.stringify(value)
                    );
                else sessionStorage.removeItem('winter.pending');
            } catch {
                /* Private browsing can deny persistence; keep the in-memory command. */
            }
        },
    };
    takeRecoveryToken() {
        const token =
            new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
        history.replaceState(null, '', location.pathname);
        return token;
    }
    watchDraw(refresh: () => Promise<void>, ended: () => void) {
        const sources = new Set<EventSource>();
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const flags = new Set<string>();
        const schedule = (action: () => void, delay: number) => {
            const timer = setTimeout(() => {
                timers.delete(timer);
                action();
            }, delay);
            timers.add(timer);
        };
        const sync = () => {
            if (flags.has('busy')) {
                flags.add('dirty');
                return;
            }
            flags.add('busy');
            void refresh()
                .catch(() => undefined)
                .finally(() => {
                    flags.delete('busy');
                    if (flags.delete('dirty') && !flags.has('closed')) sync();
                });
        };
        const disconnect = () => {
            sources.forEach(source => source.close());
            sources.clear();
            timers.forEach(clearTimeout);
            timers.clear();
        };
        const connect = () => {
            if (document.hidden || flags.has('closed')) return;
            disconnect();
            sync();
            const source = new EventSource('/api/v1/me/draw-events');
            sources.add(source);
            const beats = new Map([['last', Date.now()]]);
            const poll = () => {
                if (!flags.has('live')) sync();
                schedule(poll, 3000 + Math.random() * 300);
            };
            const retry = () => {
                flags.delete('live');
                source.close();
                sources.delete(source);
                schedule(connect, 5000 + Math.random() * 1000);
            };
            const received = () => {
                beats.set('last', Date.now());
            };
            source.addEventListener('ready', () => {
                flags.add('live');
                received();
                sync();
            });
            source.addEventListener('draw-invalidated', () => {
                received();
                sync();
            });
            source.addEventListener('heartbeat', received);
            source.addEventListener('session-ended', () => {
                disconnect();
                ended();
            });
            source.addEventListener('error', retry);
            schedule(() => {
                if (!flags.has('live')) retry();
            }, 8000);
            const watchdog = () => {
                if (Date.now() - (beats.get('last') ?? 0) > 45000) retry();
                else schedule(watchdog, 15000);
            };
            schedule(watchdog, 15000);
            schedule(poll, 3000);
        };
        const visibility = () => {
            flags.delete('live');
            disconnect();
            if (!document.hidden) connect();
        };
        document.addEventListener('visibilitychange', visibility);
        connect();
        return () => {
            flags.add('closed');
            disconnect();
            document.removeEventListener('visibilitychange', visibility);
        };
    }
}
