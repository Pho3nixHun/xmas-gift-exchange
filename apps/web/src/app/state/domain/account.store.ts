import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    withMethods,
    withProps,
    withState,
} from '@ngrx/signals';
import type { Setup } from '@winter/contracts/exchange';
import { z } from 'zod';

import { errorCode, ExchangeApi } from '../../data-access/exchange-api';

export const AccountStore = signalStore(
    { providedIn: 'root' },
    withState<{
        readonly setup: Setup | null;
        readonly busy: boolean;
        readonly error: string;
        readonly valid: boolean;
        readonly link: string;
        readonly done: boolean;
        readonly recovery: boolean;
        readonly hasToken: boolean;
        readonly exclusions: readonly {
            readonly giverId: string;
            readonly recipientId: string;
        }[];
    }>({
        setup: null,
        busy: false,
        error: '',
        valid: false,
        link: '',
        done: false,
        recovery: false,
        hasToken: false,
        exclusions: [],
    }),
    withProps(() => ({ api: inject(ExchangeApi) })),
    withMethods(store => {
        const secrets = new Map<string, string>();
        const refresh = async () => {
            const setup = await store.api.setup();
            patchState(store, { setup, exclusions: setup.exclusions });
        };
        const perform = async (action: () => Promise<void>) => {
            if (store.busy()) return;
            patchState(store, { busy: true, error: '' });
            try {
                await action();
            } catch (error) {
                patchState(store, { error: errorCode(error) });
            } finally {
                patchState(store, { busy: false });
            }
        };
        const write = (
            path: string,
            body: Readonly<Record<string, unknown>>,
            method = 'POST'
        ) =>
            store.api.write(
                path,
                { ...body, seasonId: store.setup()?.season.id },
                { csrf: store.setup()?.csrf, method }
            );
        return {
            async load() {
                const recovery = location.pathname === '/recover';
                if (recovery) {
                    const token = store.api.takeRecoveryToken();
                    secrets.set('recovery', token);
                    patchState(store, {
                        recovery,
                        hasToken: !!token,
                        done: false,
                        error: '',
                    });
                    return;
                }
                secrets.delete('recovery');
                patchState(store, {
                    recovery: false,
                    hasToken: false,
                    done: false,
                    error: '',
                });
                try {
                    await refresh();
                } catch (error) {
                    if (errorCode(error) !== 'UNAUTHENTICATED')
                        patchState(store, { error: errorCode(error) });
                }
            },
            login: (password: string) =>
                perform(async () => {
                    await store.api.write('/organiser/auth/login', {
                        password,
                    });
                    await refresh();
                }),
            logout: () =>
                perform(async () => {
                    await store.api.write(
                        '/organiser/auth/logout',
                        {},
                        { csrf: store.setup()?.csrf }
                    );
                    patchState(store, {
                        setup: null,
                        link: '',
                        exclusions: [],
                    });
                }),
            recover: (newPassword: string) =>
                perform(async () => {
                    await store.api.write('/auth/recover', {
                        token: secrets.get('recovery'),
                        newPassword,
                    });
                    secrets.delete('recovery');
                    patchState(store, { done: true, hasToken: false });
                }),
            saveNames: (text: string) =>
                perform(async () => {
                    const previous = store.setup()?.people ?? [];
                    const people = text
                        .split('\n')
                        .map(name => name.trim())
                        .filter(Boolean)
                        .map(displayName => ({
                            id:
                                previous.find(
                                    person => person.displayName === displayName
                                )?.id ?? crypto.randomUUID(),
                            displayName,
                        }));
                    const ids = new Set(people.map(person => person.id));
                    await write(
                        '/organiser/setup',
                        {
                            expectedVersion:
                                store.setup()?.season.setupRevision,
                            people,
                            exclusions: store
                                .exclusions()
                                .filter(
                                    edge =>
                                        ids.has(edge.giverId) &&
                                        ids.has(edge.recipientId)
                                ),
                        },
                        'PUT'
                    );
                    await refresh();
                    patchState(store, { valid: false });
                }),
            toggleExclusion: (giverId: string, recipientId: string) =>
                patchState(store, {
                    exclusions: store
                        .exclusions()
                        .some(
                            edge =>
                                edge.giverId === giverId &&
                                edge.recipientId === recipientId
                        )
                        ? store
                              .exclusions()
                              .filter(
                                  edge =>
                                      edge.giverId !== giverId ||
                                      edge.recipientId !== recipientId
                              )
                        : [...store.exclusions(), { giverId, recipientId }],
                    valid: false,
                }),
            saveExclusions: () =>
                perform(async () => {
                    await write(
                        '/organiser/setup',
                        {
                            expectedVersion:
                                store.setup()?.season.setupRevision,
                            people: store
                                .setup()
                                ?.people.map(({ id, displayName }) => ({
                                    id,
                                    displayName,
                                })),
                            exclusions: store.exclusions(),
                        },
                        'PUT'
                    );
                    await refresh();
                }),
            validate: () =>
                perform(async () => {
                    const result = z
                        .object({ valid: z.boolean() })
                        .parse(await write('/organiser/validate', {}));
                    patchState(store, {
                        valid: result.valid,
                        error: result.valid ? '' : 'IMPOSSIBLE_DRAW',
                    });
                }),
            open: () =>
                perform(async () => {
                    await write('/organiser/open', {
                        expectedVersion: store.setup()?.season.setupRevision,
                    });
                    await refresh();
                }),
            reset: (confirmation: string) =>
                perform(async () => {
                    await write('/organiser/reset', { confirmation });
                    await refresh();
                    patchState(store, { link: '', valid: false });
                }),
            issue: (id: string, password: string) =>
                perform(async () => {
                    await store.api.write(
                        '/organiser/reauth',
                        { password },
                        { csrf: store.setup()?.csrf }
                    );
                    const result = z
                        .object({ url: z.string() })
                        .parse(
                            await write(
                                `/organiser/participants/${id}/recovery`,
                                {}
                            )
                        );
                    patchState(store, { link: result.url });
                }),
        };
    })
);
