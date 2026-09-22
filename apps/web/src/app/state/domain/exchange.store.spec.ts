// `@angular/common/http` reaches partially compiled injectables, which need the
// JIT compiler outside an Angular build. The store itself needs no DOM.
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import type {
    Assignment,
    DrawPool,
    WishList,
} from '@winter/contracts/exchange';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExchangeApi } from '../../data-access/exchange-api';

import { ExchangeStore } from './exchange.store';

const SEASON = '00000000-0000-4000-8000-000000000001';
const VIEWER = '00000000-0000-4000-8000-000000000002';
const OTHER = '00000000-0000-4000-8000-000000000003';
const SLOT = '00000000-0000-4000-8000-000000000004';

const identity = (id: string = VIEWER) => ({
    person: { id, displayName: 'Anna' },
    seasonId: SEASON,
    csrf: 'csrf-token',
});
const assignment = (over: Partial<Assignment> = {}): Assignment => ({
    viewerId: VIEWER,
    seasonId: SEASON,
    recipient: null,
    slotId: null,
    ...over,
});
const pool = (over: Partial<DrawPool> = {}): DrawPool => ({
    viewerId: VIEWER,
    seasonId: SEASON,
    drawRevision: 1,
    slots: [{ slotId: SLOT, ordinal: 0, color: 'red', available: true }],
    ...over,
});
const wishes = (over: Partial<WishList> = {}): WishList => ({
    viewerId: VIEWER,
    seasonId: SEASON,
    wishes: [],
    nextCursor: null,
    ...over,
});
const httpError = (code: string, status = 409) =>
    new HttpErrorResponse({ status, error: { error: { code } } });

// A deferred promise, so a test can let a request land after the identity it was
// issued for has already been replaced.
const deferred = <T>() => {
    const box: {
        resolve: (value: T) => void;
        reject: (reason: unknown) => void;
        promise: Promise<T>;
    } = {
        resolve: () => undefined,
        reject: () => undefined,
        promise: Promise.resolve() as Promise<T>,
    };
    box.promise = new Promise<T>((resolve, reject) => {
        box.resolve = resolve;
        box.reject = reject;
    });
    return box;
};

const createApi = () => {
    const stored = { pending: null as unknown };
    return {
        bootstrap: vi.fn(() =>
            Promise.resolve({
                season: {
                    id: SEASON,
                    status: 'open' as const,
                    setupRevision: 1,
                    drawRevision: 1,
                },
                people: [],
            })
        ),
        me: vi.fn(() => Promise.resolve(identity())),
        people: vi.fn(() => Promise.resolve({ people: [] })),
        assignment: vi.fn(() => Promise.resolve(assignment())),
        pool: vi.fn(() => Promise.resolve(pool())),
        wishes: vi.fn(() => Promise.resolve(wishes())),
        // Typed like the real client so a test can assert on the idempotency
        // key the store sent.
        write: vi.fn<
            (
                path: string,
                body: unknown,
                options?: {
                    readonly csrf?: string;
                    readonly key?: string;
                    readonly method?: string;
                }
            ) => Promise<unknown>
        >(() => Promise.resolve({ ok: true })),
        preview: vi.fn(),
        watchDraw: vi.fn(() => () => undefined),
        pending: {
            get: () => stored.pending,
            set: (value: unknown) => {
                stored.pending = value;
            },
        },
        preferences: {
            get: () => ({ locale: null, simple: false, paused: false }),
            set: () => undefined,
        },
        preferredLocale: () => null,
    };
};
type FakeApi = ReturnType<typeof createApi>;

const build = (api: FakeApi) => {
    const injector = Injector.create({
        providers: [
            { provide: ExchangeApi, useValue: api },
            { provide: ExchangeStore, useClass: ExchangeStore, deps: [] },
        ],
    });
    return injector.get(ExchangeStore);
};

describe('exchange store', () => {
    let api: FakeApi;
    beforeEach(() => {
        api = createApi();
    });

    it('signs in and keeps the viewer-matched assignment and pool', async () => {
        const store = build(api);
        await store.load();
        expect(store.identity()?.person.id).toBe(VIEWER);
        expect(store.pool()?.slots).toHaveLength(1);
        expect(store.loading()).toBe(false);
    });

    it('discards a note response that lands after the identity changed', async () => {
        const store = build(api);
        await store.load();
        const late = deferred<WishList>();
        api.wishes.mockReturnValueOnce(late.promise);
        const pendingNotes = store.loadNotes();
        await store.logout();
        late.resolve(wishes({ wishes: [] }));
        await pendingNotes;
        // The signed-out store must not be repopulated by the earlier request.
        expect(store.identity()).toBeNull();
        expect(store.notes()).toBeNull();
    });

    it('discards a note response for the viewer who was replaced in another tab', async () => {
        const store = build(api);
        await store.load();
        const late = deferred<WishList>();
        api.wishes.mockReturnValueOnce(late.promise);
        const pendingNotes = store.loadNotes();
        // Another tab signs a different family member in; this path swaps the
        // identity without clearing the in-flight request bookkeeping.
        api.me.mockResolvedValueOnce(identity(OTHER));
        api.assignment.mockResolvedValueOnce(assignment({ viewerId: OTHER }));
        api.pool.mockResolvedValueOnce(pool({ viewerId: OTHER }));
        await store.login(OTHER, 'password', false);
        late.resolve(wishes({ wishes: [] }));
        await pendingNotes;
        expect(store.identity()?.person.id).toBe(OTHER);
        expect(store.notes()).toBeNull();
    });

    it('clears the session when a response belongs to another viewer', async () => {
        const store = build(api);
        await store.load();
        api.wishes.mockResolvedValueOnce(wishes({ viewerId: OTHER }));
        await store.loadNotes();
        expect(store.identity()).toBeNull();
        expect(store.notes()).toBeNull();
    });

    it('keeps the pending draw when the outcome is unknown, so a retry reuses its key', async () => {
        const store = build(api);
        await store.load();
        api.write.mockRejectedValueOnce(httpError('OFFLINE', 0));
        expect(await store.pick(SLOT)).toBeNull();
        expect(store.drawState()).toBe('unknown');
        expect(store.pending()?.slotId).toBe(SLOT);
        const first = store.pending()?.key;
        // The retry must not mint a second key for the same intent.
        api.write.mockResolvedValueOnce(
            assignment({
                recipient: { id: OTHER, displayName: 'Bea' },
                slotId: SLOT,
            })
        );
        expect(await store.pick()).toBe(SLOT);
        expect(api.write.mock.calls[1]?.[2]).toMatchObject({ key: first });
        expect(store.pending()).toBeNull();
        expect(store.drawState()).toBe('committed');
    });

    it('drops the pending draw when the server refuses it outright', async () => {
        const store = build(api);
        await store.load();
        api.write.mockRejectedValueOnce(httpError('SLOT_TAKEN'));
        expect(await store.pick(SLOT)).toBeNull();
        expect(store.pending()).toBeNull();
        expect(store.drawState()).toBe('ready');
        expect(store.error()).toBe('SLOT_TAKEN');
    });

    it('refuses a second draw once one is committed', async () => {
        const store = build(api);
        api.assignment.mockResolvedValue(
            assignment({
                recipient: { id: OTHER, displayName: 'Bea' },
                slotId: SLOT,
            })
        );
        await store.load();
        expect(store.drawState()).toBe('committed');
        expect(await store.pick(SLOT)).toBeNull();
        expect(api.write).not.toHaveBeenCalled();
    });

    it('clears private state when the season changes underneath the viewer', async () => {
        const store = build(api);
        await store.load();
        api.wishes.mockRejectedValueOnce(httpError('SEASON_CHANGED'));
        await store.loadNotes();
        expect(store.identity()).toBeNull();
        expect(store.assignment()).toBeNull();
        expect(store.pool()).toBeNull();
        expect(store.error()).toBe('SEASON_CHANGED');
    });
});
