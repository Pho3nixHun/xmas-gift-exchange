import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import type { Note } from '../../core/note';

export interface BoardPerson {
    readonly id: string;
    readonly displayName: string;
}
interface NotesState {
    // Which sheet the editor is open on, and whether it is open at all.
    readonly composing: boolean;
    readonly editing: Note | undefined;
    readonly saved: boolean;
    // Whose stack the viewer is looking at; null while seated at their own desk.
    readonly selected: BoardPerson | null;
    // Paging positions for the names board and the tree's ornament branches.
    readonly boardPage: number;
    readonly branch: number;
}

// The pages the viewer is on and the sheet they are editing are view state, so
// they live beside the desk's navigation rather than inside the container that
// happens to render them. Nothing private is kept here: the container passes
// identifiers to the domain store, which owns every wish and claim.
export const NotesStore = signalStore(
    { providedIn: 'root' },
    withState<NotesState>({
        composing: false,
        editing: undefined,
        saved: false,
        selected: null,
        boardPage: 0,
        branch: 0,
    }),
    withMethods(store => ({
        // Returns whether the draft should be replaced, which only the caller
        // holding the draft can act on.
        compose: (note?: Note) => {
            const previous = store.editing();
            patchState(store, { editing: note, composing: true, saved: false });
            if (note) return note.id !== previous?.id ? 'replace' : 'keep';
            return previous ? 'reset' : 'keep';
        },
        cancel: () =>
            patchState(store, { editing: undefined, composing: false }),
        // Closing the paper leaves `editing` set: reopening the same sheet must
        // find the draft the viewer had already typed into it.
        closeEditor: () => patchState(store, { composing: false }),
        saveCompleted: () =>
            patchState(store, {
                editing: undefined,
                composing: false,
                saved: true,
            }),
        select: (person: BoardPerson | null) =>
            patchState(store, { selected: person }),
        showBoardPage: (page: number) =>
            patchState(store, { boardPage: Math.max(0, page) }),
        showBranch: (branch: number) =>
            patchState(store, { branch: Math.max(0, branch) }),
        // Leaving the house clears the editor and the selection together, so no
        // sheet stays open against an identity that is no longer signed in.
        reset: () =>
            patchState(store, {
                composing: false,
                editing: undefined,
                saved: false,
                selected: null,
            }),
    }))
);
