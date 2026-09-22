import { DOCUMENT } from '@angular/common';
import {
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
    viewChild,
    DestroyRef,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

import {
    exchangeEnglish,
    exchangeHungarian,
    exchangeError,
} from '../core/exchange-copy';
import type { HouseAction } from '../core/house-scene';
import type { Note } from '../core/note';
import { emptyWish } from '../core/wish';
import type { WishInput } from '../core/wish';
import { english, hungarian } from '../i18n/messages';
import { DeskViewport } from '../scene/runtime/desk-viewport';
import { HouseSound } from '../scene/runtime/sound';
import { ExchangeStore } from '../state/domain/exchange.store';
import { HouseStore } from '../state/domain/house.store';
import { DeskStore } from '../state/view/desk.store';
import { NotesStore } from '../state/view/notes.store';
import { HouseMenu } from '../ui/house-menu';
import { HouseToast } from '../ui/house-toast';
import { IdentityForm } from '../ui/identity-form';
import { LoadingCard } from '../ui/loading-card';
import { NoteStack } from '../ui/note-stack';
import { WishForm } from '../ui/wish-form';

@Component({
    selector: 'wh-house-page',
    imports: [
        DeskViewport,
        WishForm,
        IdentityForm,
        NoteStack,
        LoadingCard,
        HouseMenu,
        HouseToast,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class HousePage {
    readonly house = inject(HouseStore);
    readonly sound = inject(HouseSound);
    readonly exchange = inject(ExchangeStore);
    readonly x = computed(() =>
        this.locale() === 'hu' ? exchangeHungarian : exchangeEnglish
    );
    readonly error = computed(() =>
        exchangeError(this.exchange.error(), this.x())
    );
    readonly notes = inject(NotesStore);
    readonly toast = signal('');
    private readonly toastTimers = new Set<ReturnType<typeof setTimeout>>();
    // Derived from domain data, so it stays here: view stores never read the
    // roster or the draw pool.
    readonly boardPeople = computed(() =>
        this.exchange
            .people()
            .slice(this.notes.boardPage() * 8, this.notes.boardPage() * 8 + 8)
    );
    readonly ornaments = computed(
        () =>
            this.exchange
                .pool()
                ?.slots.slice(
                    this.notes.branch() * 7,
                    this.notes.branch() * 7 + 7
                ) ?? []
    );
    readonly noteOwner = computed(() =>
        this.desk.stage() === 'desk' ? undefined : this.notes.selected()?.id
    );
    readonly productionCopy = computed(() => ({
        ...this.copy(),
        check: this.x().save,
        checking: this.x().saving,
        unsaved: '',
    }));
    readonly paper = viewChild<ElementRef<HTMLElement>>('paper');
    readonly seat = viewChild<ElementRef<HTMLButtonElement>>('seat');
    readonly desk = inject(DeskStore);
    private readonly document = inject(DOCUMENT);
    readonly chosenLocale = signal<'hu' | 'en' | null>(
        this.exchange.api.preferredLocale()
    );
    readonly sceneReady = signal(false);
    readonly config = computed(() =>
        this.house.api.config.hasValue()
            ? this.house.api.config.value()
            : undefined
    );
    readonly locale = computed(
        () => this.chosenLocale() ?? this.config()?.defaultLocale ?? 'hu'
    );
    readonly copy = computed(() =>
        this.locale() === 'hu' ? hungarian : english
    );
    readonly guidelines = computed(
        () => this.config()?.guidelines[this.locale()]
    );
    readonly graphicsFailed = signal(false);
    readonly restoreFocus = signal(false);
    readonly result = computed(() => {
        const status = this.house.result();
        return status === 'checked'
            ? this.copy().checked
            : status === 'failed'
              ? this.copy().failed
              : '';
    });

    constructor() {
        afterRenderEffect(() =>
            this.sound.configureMusic(this.config()?.audio)
        );
        afterRenderEffect(() => {
            if (
                !this.exchange.loading() &&
                !this.exchange.identity() &&
                !['outside', 'door'].includes(this.desk.stage())
            ) {
                this.desk.updateDraft(emptyWish());
                this.notes.reset();
                this.desk.visit('outside');
            }
        });
        const preferences = this.exchange.api.preferences.get();
        if (preferences.simple) this.desk.toggleSimple();
        if (preferences.paused) this.desk.togglePause();
        afterRenderEffect(() =>
            this.exchange.api.preferences.set({
                locale: this.chosenLocale(),
                simple: this.desk.simple(),
                paused: this.desk.paused(),
            })
        );
        void this.exchange.load().then(() => {
            if (this.exchange.identity()) {
                if (this.exchange.assignment()?.recipient) this.openRecipient();
                else this.desk.visit('room');
            }
        });
        const live = new Set<() => void>();
        afterRenderEffect(() => {
            const watching =
                this.desk.stage() === 'tree' &&
                !!this.exchange.identity() &&
                !this.exchange.assignment()?.recipient;
            if (watching && !live.size) live.add(this.exchange.watch());
            if (!watching) {
                live.forEach(stop => stop());
                live.clear();
            }
        });
        inject(DestroyRef).onDestroy(() => {
            live.forEach(stop => stop());
            live.clear();
            this.toastTimers.forEach(clearTimeout);
            this.sound.configureMusic();
        });
        afterRenderEffect(() => {
            this.document.documentElement.lang = this.locale();
        });
        afterRenderEffect(() => {
            if (this.desk.simple() && this.desk.writing()) {
                this.paper()?.nativeElement.removeAttribute('inert');
                this.paper()?.nativeElement.focus({ preventScroll: true });
            }
        });
    }

    leaveZoom() {
        if (
            !this.desk.busy() &&
            ['tree', 'letters', 'desk', 'notes', 'recipient'].includes(
                this.desk.stage()
            )
        )
            this.leave();
    }
    leave() {
        this.restoreFocus.set(true);
        this.desk.leave();
        if (this.desk.simple()) this.sceneSettled();
    }
    sceneSettled() {
        this.sceneReady.set(true);
        this.desk.settled();
        if (this.restoreFocus()) {
            this.restoreFocus.set(false);
            requestAnimationFrame(() =>
                this.seat()?.nativeElement.focus({ preventScroll: true })
            );
        }
    }

    activate(action: HouseAction) {
        if (this.desk.busy()) return;
        if (action === this.desk.stage() && action !== 'door') return;
        if (action === 'room') {
            this.leave();
            return;
        }
        if (action === 'door') {
            this.enter();
            return;
        }
        if (!this.exchange.identity()) return;
        if (action === 'desk') {
            this.notes.cancel();
            this.notes.select(null);
            void this.exchange.loadNotes();
            this.desk.sit();
            if (this.desk.simple()) this.sceneSettled();
            return;
        }
        if (action === 'recipient') {
            this.openRecipient();
            return;
        }
        if (action === 'tree' || action === 'letters') {
            this.desk.visit(action);
            return;
        }
        this.play(action);
    }
    private play(action: HouseAction) {
        if (action === 'cat') {
            this.toastTimers.forEach(clearTimeout);
            this.toastTimers.clear();
            this.toast.set(this.x().catSays);
            this.toastTimers.add(setTimeout(() => this.toast.set(''), 3500));
        }
        this.desk.act(action);
    }

    private enter() {
        if (this.desk.simple() || this.desk.stage() === 'door')
            this.sound.effect('knock');
        this.desk.visit(
            this.desk.stage() === 'outside'
                ? 'door'
                : this.exchange.identity()
                  ? 'room'
                  : 'door'
        );
    }
    switchLanguage() {
        this.chosenLocale.set(this.locale() === 'hu' ? 'en' : 'hu');
    }
    fallback() {
        this.sceneReady.set(true);
        this.graphicsFailed.set(true);
        this.desk.fallback();
    }
    async login(value: {
        readonly id: string;
        readonly password: string;
        readonly enrol: boolean;
    }) {
        if (await this.exchange.login(value.id, value.password, value.enrol))
            this.desk.visit('room');
    }
    async logout() {
        await this.exchange.logout();
        if (!this.exchange.identity()) {
            this.desk.updateDraft(emptyWish());
        }
    }
    openRecipient() {
        const recipient = this.exchange.assignment()?.recipient;
        this.notes.select(recipient ?? null);
        if (recipient) void this.exchange.loadNotes(recipient.id);
        this.desk.visit('recipient');
    }
    openNotes(person: { readonly id: string; readonly displayName: string }) {
        this.notes.select(person);
        this.desk.act(
            'notes',
            Math.max(
                0,
                this.boardPeople().findIndex(item => item.id === person.id)
            )
        );
        void this.exchange.loadNotes(person.id);
        this.desk.visit('notes');
    }
    compose(note?: Note) {
        const draft = this.notes.compose(note);
        if (draft === 'replace' && note)
            this.desk.updateDraft({
                description: note.description,
                url: note.url,
                priority: note.priority,
            });
        else if (draft === 'reset') this.desk.updateDraft(emptyWish());
    }
    cancelWriting() {
        this.desk.updateDraft(emptyWish());
        this.notes.cancel();
    }
    refreshNotes() {
        void this.exchange.loadNotes(this.noteOwner());
    }
    async save(draft: WishInput) {
        if (await this.exchange.saveWish(draft, this.notes.editing())) {
            this.desk.updateDraft(emptyWish());
            this.notes.saveCompleted();
            await this.exchange.loadNotes();
        }
    }
    async remove(note: Note) {
        if (await this.exchange.deleteWish(note))
            await this.exchange.loadNotes();
    }
    async claim(note: Note) {
        await this.exchange.claim(note);
        await this.exchange.loadNotes(this.noteOwner(), undefined, true);
    }
    async pick(index?: number) {
        const slot = index === undefined ? undefined : this.ornaments()[index];
        const chosen = await this.exchange.pick(slot?.slotId);
        if (chosen && slot?.slotId === chosen && index !== undefined)
            this.desk.act('ornament', index);
    }
}
