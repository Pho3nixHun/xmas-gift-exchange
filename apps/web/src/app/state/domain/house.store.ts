import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    withMethods,
    withProps,
    withState,
} from '@ngrx/signals';

import type { WishInput } from '../../core/wish';
import { HouseApi } from '../../data-access/house-api';

export const HouseStore = signalStore(
    { providedIn: 'root' },
    withState({ checking: false, result: 'idle' }),
    withProps(() => ({ api: inject(HouseApi) })),
    withMethods(store => ({
        reload: () => store.api.config.reload(),
        async check(wish: WishInput) {
            if (store.checking()) return;
            patchState(store, { checking: true, result: 'idle' });
            try {
                await store.api.check(wish);
                patchState(store, { result: 'checked' });
            } catch {
                patchState(store, { result: 'failed' });
            } finally {
                patchState(store, { checking: false });
            }
        },
    }))
);
