import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import type {
    HouseAction,
    HouseStage,
    SceneCommand,
} from '../../core/house-scene';
import { emptyWish } from '../../core/wish';
import type { WishInput } from '../../core/wish';

interface DeskState {
    readonly stage: HouseStage;
    readonly command: SceneCommand;
    readonly busy: boolean;
    readonly writing: boolean;
    readonly simple: boolean;
    readonly paused: boolean;
    readonly draft: WishInput;
}
const initialCommand: SceneCommand = { action: 'room', revision: 0 };

export const DeskStore = signalStore(
    { providedIn: 'root' },
    withState<DeskState>({
        writing: false,
        stage: 'outside',
        command: initialCommand,
        busy: false,
        simple: false,
        paused: false,
        draft: emptyWish(),
    }),
    withMethods(store => ({
        sit: () =>
            patchState(store, { writing: true, stage: 'desk', busy: true }),
        visit: (stage: HouseStage) =>
            patchState(store, {
                stage,
                writing:
                    stage === 'desk' ||
                    stage === 'recipient' ||
                    stage === 'notes',
                busy: !store.simple(),
            }),
        settled: () => patchState(store, { busy: false }),
        act: (action: HouseAction, index?: number) =>
            patchState(store, {
                command: {
                    action,
                    index,
                    revision: store.command().revision + 1,
                },
            }),
        leave: () =>
            patchState(store, { writing: false, stage: 'room', busy: true }),
        toggleSimple: () =>
            patchState(store, {
                simple: !store.simple(),
                busy: false,
            }),
        fallback: () =>
            patchState(store, {
                simple: true,
                busy: false,
            }),
        togglePause: () => patchState(store, { paused: !store.paused() }),
        updateDraft: (draft: WishInput) => patchState(store, { draft }),
    }))
);
