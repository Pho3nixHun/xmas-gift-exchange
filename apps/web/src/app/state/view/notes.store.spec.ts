// `signalStore` is partially compiled, so instantiating one outside an Angular
// build needs the JIT compiler. The store itself needs no DOM.
import '@angular/compiler';

import { Injector } from '@angular/core';
import { describe, expect, it } from 'vitest';

import type { Note } from '../../core/note';

import { NotesStore } from './notes.store';

const note = (id: string): Note => ({
    id,
    ownerId: 'owner',
    description: `wish ${id}`,
    url: '',
    priority: 'medium',
    contentVersion: 1,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
    canEdit: true,
    canDelete: true,
});
const build = () =>
    Injector.create({
        providers: [{ provide: NotesStore, useClass: NotesStore, deps: [] }],
    }).get(NotesStore);

describe('notes view store', () => {
    it('asks for a fresh draft only when the sheet actually changes', () => {
        const store = build();
        expect(store.compose(note('a'))).toBe('replace');
        expect(store.editing()?.id).toBe('a');
        // Reopening the same sheet must not discard what was typed into it.
        expect(store.compose(note('a'))).toBe('keep');
        expect(store.compose(note('b'))).toBe('replace');
    });

    it('resets the draft when the editor turns from a sheet to a blank wish', () => {
        const store = build();
        store.compose(note('a'));
        expect(store.compose()).toBe('reset');
        expect(store.editing()).toBeUndefined();
        // A blank editor opened twice has nothing to reset.
        expect(store.compose()).toBe('keep');
    });

    it('keeps the edited sheet when the paper is only closed', () => {
        const store = build();
        store.compose(note('a'));
        store.closeEditor();
        expect(store.composing()).toBe(false);
        expect(store.editing()?.id).toBe('a');
        // So reopening it is a continuation, not a replacement.
        expect(store.compose(note('a'))).toBe('keep');
    });

    it('clears the sheet when editing is cancelled outright', () => {
        const store = build();
        store.compose(note('a'));
        store.cancel();
        expect(store.composing()).toBe(false);
        expect(store.editing()).toBeUndefined();
    });

    it('marks a completed save and closes the editor', () => {
        const store = build();
        store.compose(note('a'));
        store.saveCompleted();
        expect(store.saved()).toBe(true);
        expect(store.composing()).toBe(false);
        expect(store.editing()).toBeUndefined();
        // Opening the editor again starts unsaved.
        store.compose(note('b'));
        expect(store.saved()).toBe(false);
    });

    it('never pages before the first board page or tree branch', () => {
        const store = build();
        store.showBoardPage(-1);
        store.showBranch(-3);
        expect([store.boardPage(), store.branch()]).toEqual([0, 0]);
        store.showBoardPage(2);
        store.showBranch(1);
        expect([store.boardPage(), store.branch()]).toEqual([2, 1]);
    });

    it('drops the editor and the selection together when the house is left', () => {
        const store = build();
        store.compose(note('a'));
        store.select({ id: 'p1', displayName: 'Anna' });
        store.saveCompleted();
        store.reset();
        expect([
            store.composing(),
            store.editing(),
            store.saved(),
            store.selected(),
        ]).toEqual([false, undefined, false, null]);
    });
});
