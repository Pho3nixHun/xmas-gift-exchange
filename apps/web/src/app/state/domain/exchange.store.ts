import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    withMethods,
    withProps,
    withState,
} from '@ngrx/signals';
import { assignmentSchema } from '@winter/contracts/exchange';
import type {
    Assignment,
    Bootstrap,
    DrawPool,
    Identity,
    Person,
    Wish,
    WishList,
} from '@winter/contracts/exchange';

import type { WishInput } from '../../core/wish';
import { errorCode, ExchangeApi } from '../../data-access/exchange-api';
import type { PendingDraw } from '../../data-access/exchange-api';

interface ExchangeState {
    readonly linkPreview: {
        readonly title: string;
        readonly site: string;
    } | null;
    readonly bootstrap: Bootstrap | null;
    readonly identity: Identity | null;
    readonly assignment: Assignment | null;
    readonly pool: DrawPool | null;
    readonly people: readonly Person[];
    readonly notes: WishList | null;
    readonly loading: boolean;
    readonly busy: boolean;
    readonly error: string;
    readonly pending: PendingDraw | null;
    readonly drawState: 'ready' | 'pending' | 'unknown' | 'committed';
}
const belongsToIdentity = (
    value: { readonly viewerId: string; readonly seasonId: string },
    identity: Identity
) =>
    value.viewerId === identity.person.id &&
    value.seasonId === identity.seasonId;
export const ExchangeStore = signalStore(
    { providedIn: 'root' },
    withState<ExchangeState>({
        linkPreview: null,
        bootstrap: null,
        identity: null,
        assignment: null,
        pool: null,
        people: [],
        notes: null,
        loading: true,
        busy: false,
        error: '',
        pending: null,
        drawState: 'ready',
    }),
    withProps(() => ({ api: inject(ExchangeApi) })),
    withMethods(store => {
        const noteRequests = new Set<symbol>();
        const previewRequests = new Set<symbol>();
        const clear = () => {
            noteRequests.clear();
            previewRequests.clear();
            store.api.pending.set(null);
            patchState(store, {
                identity: null,
                linkPreview: null,
                assignment: null,
                pool: null,
                people: [],
                notes: null,
                pending: null,
                drawState: 'ready',
            });
            void store.api
                .bootstrap()
                .then(bootstrap => patchState(store, { bootstrap }))
                .catch(() => undefined);
        };
        const failure = (error: unknown) => {
            const code = errorCode(error);
            if (['UNAUTHENTICATED', 'SEASON_CHANGED'].includes(code)) clear();
            patchState(store, { error: code });
        };
        const refresh = async () => {
            const identity = store.identity();
            if (!identity) return;
            try {
                const [assignment, pool] = await Promise.all([
                    store.api.assignment(),
                    store.api.pool(),
                ]);
                if (store.identity() !== identity) return;
                if (
                    assignment.viewerId !== identity.person.id ||
                    pool.viewerId !== identity.person.id
                ) {
                    clear();
                    return;
                }
                if (pool.seasonId !== identity.seasonId) return;
                if (pool.drawRevision >= (store.pool()?.drawRevision ?? -1))
                    patchState(store, { assignment, pool });
                if (assignment.recipient) {
                    store.api.pending.set(null);
                    patchState(store, {
                        pending: null,
                        drawState: 'committed',
                    });
                }
            } catch (error) {
                if (store.identity() === identity) failure(error);
            }
        };
        const resume = async () => {
            const identity = await store.api.me();
            const { people } = await store.api.people();
            const pending = store.api.pending.get();
            patchState(store, {
                identity,
                people,
                pending:
                    pending?.seasonId === identity.seasonId ? pending : null,
                drawState:
                    pending?.seasonId === identity.seasonId
                        ? 'unknown'
                        : 'ready',
            });
            await refresh();
        };
        const ownerChanged = (owner: string) =>
            store.notes()?.wishes.some(wish => wish.ownerId !== owner) ?? false;
        const notes = async (
            owner?: string,
            cursor?: string,
            preserveError = false
        ) => {
            const identity = store.identity();
            if (!identity) return;
            const request = Symbol();
            noteRequests.clear();
            noteRequests.add(request);
            if (ownerChanged(owner ?? identity.person.id))
                patchState(store, { notes: null });
            try {
                const result = await store.api.wishes(owner, cursor);
                if (!noteRequests.has(request) || store.identity() !== identity)
                    return;
                if (!belongsToIdentity(result, identity)) {
                    clear();
                    return;
                }
                patchState(store, { notes: result });
                if (!preserveError) patchState(store, { error: '' });
            } catch (error) {
                if (noteRequests.has(request) && store.identity() === identity)
                    failure(error);
            }
        };
        const drawBlocked = () =>
            store.busy() || !!store.assignment()?.recipient;
        const pick = async (slotId?: string) => {
            const identity = store.identity();
            if (!identity || drawBlocked()) return null;
            const pending =
                store.pending() ??
                (slotId
                    ? {
                          seasonId: identity.seasonId,
                          slotId,
                          key: crypto.randomUUID(),
                      }
                    : null);
            if (!pending) return null;
            store.api.pending.set(pending);
            patchState(store, {
                pending,
                drawState: 'pending',
                busy: true,
                error: '',
            });
            try {
                const assignment = assignmentSchema.parse(
                    await store.api.write(
                        '/me/draw',
                        { seasonId: pending.seasonId, slotId: pending.slotId },
                        { csrf: identity.csrf, key: pending.key }
                    )
                );
                if (store.identity() !== identity) return null;
                if (assignment.viewerId !== identity.person.id) {
                    clear();
                    return null;
                }
                store.api.pending.set(null);
                patchState(store, {
                    assignment,
                    pending: null,
                    drawState: 'committed',
                });
                return assignment.slotId;
            } catch (error) {
                if (store.identity() !== identity) return null;
                const code = errorCode(error);
                if (['OFFLINE', 'UNAVAILABLE', 'BUSY'].includes(code))
                    patchState(store, { drawState: 'unknown' });
                else {
                    store.api.pending.set(null);
                    patchState(store, { pending: null, drawState: 'ready' });
                    await refresh();
                }
                failure(error);
                return null;
            } finally {
                patchState(store, { busy: false });
            }
        };
        const writeWish = async (
            path: string,
            body: Readonly<Record<string, unknown>>,
            method: string
        ) => {
            const identity = store.identity();
            if (!identity || store.busy()) return false;
            patchState(store, { busy: true, error: '' });
            try {
                await store.api.write(
                    path,
                    { ...body, seasonId: identity.seasonId },
                    { csrf: identity.csrf, method }
                );
                return true;
            } catch (error) {
                failure(error);
                return false;
            } finally {
                patchState(store, { busy: false });
            }
        };
        return {
            async loadPreview(url: string) {
                previewRequests.clear();
                patchState(store, { linkPreview: null });
                const identity = store.identity();
                if (!url || !identity) return;
                const request = Symbol();
                previewRequests.add(request);
                try {
                    const value = await store.api.preview(
                        url,
                        identity.seasonId,
                        identity.csrf
                    );
                    if (
                        previewRequests.has(request) &&
                        store.identity()?.person.id === identity.person.id &&
                        value.status === 'ready'
                    )
                        patchState(store, {
                            linkPreview: {
                                title: value.title,
                                site: value.site,
                            },
                        });
                } catch {
                    /* Saving and reading never depend on a preview. */
                }
            },
            refresh,
            loadNotes: notes,
            pick,
            clear,
            async load() {
                patchState(store, { loading: true, error: '' });
                try {
                    patchState(store, {
                        bootstrap: await store.api.bootstrap(),
                    });
                    await resume();
                } catch (error) {
                    if (errorCode(error) !== 'UNAUTHENTICATED') failure(error);
                } finally {
                    patchState(store, { loading: false });
                }
            },
            async login(
                participantId: string,
                password: string,
                enrol: boolean
            ) {
                if (store.busy()) return false;
                patchState(store, { busy: true, error: '' });
                try {
                    await store.api.write(
                        `/auth/${enrol ? 'enrol' : 'login'}`,
                        {
                            participantId,
                            password,
                            seasonId: store.bootstrap()?.season.id,
                        }
                    );
                    await resume();
                    return true;
                } catch (error) {
                    failure(error);
                    return false;
                } finally {
                    patchState(store, { busy: false });
                }
            },
            async logout() {
                const identity = store.identity();
                try {
                    await store.api.write(
                        '/auth/logout',
                        {},
                        { csrf: identity?.csrf }
                    );
                    clear();
                } catch (error) {
                    failure(error);
                }
            },
            saveWish: (draft: WishInput, existing?: Wish) =>
                writeWish(
                    existing ? `/me/wishes/${existing.id}` : '/me/wishes',
                    {
                        ...draft,
                        ...(existing
                            ? { expectedVersion: existing.contentVersion }
                            : {}),
                    },
                    existing ? 'PATCH' : 'POST'
                ),
            deleteWish: (wish: Wish) =>
                writeWish(
                    `/me/wishes/${wish.id}`,
                    { expectedVersion: wish.contentVersion },
                    'DELETE'
                ),
            claim: (wish: Wish) =>
                writeWish(
                    `/wishes/${wish.id}/claim`,
                    wish.claimState === 'mine'
                        ? {}
                        : { expectedVersion: wish.contentVersion },
                    wish.claimState === 'mine' ? 'DELETE' : 'PUT'
                ),
            watch: () => store.api.watchDraw(refresh, clear),
        };
    })
);
