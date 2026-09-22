import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    linkedSignal,
    output,
    signal,
    afterRenderEffect,
} from '@angular/core';

import type { ExchangeCopy } from '../core/exchange-copy';
import type { Note } from '../core/note';

@Component({
    selector: 'wh-note-stack',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<article tabindex="-1" (keydown)="turnKey($event)">
        <button
            type="button"
            class="close"
            (click)="closePaper.emit()"
            [attr.aria-label]="copy().back"
        >
            ×
        </button>
        <div class="eyebrow">
            <span>✉ {{ name() }}</span>
            <button
                type="button"
                class="refresh"
                [attr.aria-label]="copy().refresh"
                [title]="copy().refresh"
                [disabled]="pending()"
                (click)="refresh.emit()"
            >
                <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M20 5v5h-5M4 19v-5h5M5.6 7a8 8 0 0 1 13.7 1M4.7 16a8 8 0 0 0 13.7 1"
                    />
                </svg>
            </button>
        </div>
        @if (current(); as wish) {
            <div
                class="note-content"
                role="region"
                tabindex="0"
                [attr.aria-label]="name()"
                (pointerdown)="startSwipe($event)"
                (pointerup)="endSwipe($event)"
                (pointercancel)="swipe.set(null)"
            >
                <p class="wish-text">{{ wish.description }}</p>
                <div class="note-meta">
                    <p
                        class="rating"
                        [attr.aria-label]="priorityLabels()[wish.priority]"
                    >
                        {{
                            wish.priority === 'high'
                                ? '★ ★ ★'
                                : wish.priority === 'medium'
                                  ? '★ ★'
                                  : '★'
                        }}
                    </p>
                    @if (own() && wish.canEdit) {
                        <div class="actions">
                            <button
                                type="button"
                                class="icon"
                                (click)="edit.emit(wish)"
                                [disabled]="pending()"
                                [attr.aria-label]="copy().edit"
                                [title]="copy().edit"
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    width="18"
                                    height="18"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.6"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"
                                    />
                                </svg>
                            </button>
                            <button
                                type="button"
                                class="icon remove"
                                (click)="removing.set(wish.id)"
                                [disabled]="pending()"
                                [attr.aria-label]="copy().remove"
                                [title]="copy().remove"
                            >
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    width="18"
                                    height="18"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.6"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"
                                    />
                                </svg>
                            </button>
                        </div>
                    }
                </div>
                @if (wish.url) {
                    <a
                        [href]="wish.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ copy().link }} ↗</a
                    >
                }
            </div>
            @if (preview(); as link) {
                <p class="preview">
                    <strong>{{ link.title }}</strong
                    ><br /><small>{{ link.site }}</small>
                </p>
            }
            @if (own()) {
                @if (!wish.canEdit) {
                    <p class="notice">{{ copy().locked }}</p>
                }
                @if (removing() === wish.id) {
                    <div
                        class="confirmation"
                        role="group"
                        [attr.aria-label]="copy().confirmRemove"
                    >
                        <p>{{ copy().confirmRemove }}</p>
                        <button
                            type="button"
                            (click)="remove.emit(wish); removing.set('')"
                        >
                            {{ copy().yesRemove }}</button
                        ><button type="button" (click)="removing.set('')">
                            {{ copy().cancel }}
                        </button>
                    </div>
                }
            } @else {
                <button
                    type="button"
                    class="primary"
                    [disabled]="pending() || wish.claimState === 'claimed'"
                    (click)="claim.emit(wish)"
                >
                    {{
                        wish.claimState === 'mine'
                            ? copy().release
                            : wish.claimState === 'claimed'
                              ? copy().claimed
                              : copy().bought
                    }}
                </button>
                @if (wish.claimState === 'mine') {
                    <p class="notice">{{ copy().mine }}</p>
                }
            }
        } @else {
            <h2>{{ own() ? copy().empty : copy().emptyOther }}</h2>
        }
        <ng-content select="[noteDisclosure]" />
        <div class="note-footer">
            @if (notes().length > 1) {
                <nav [attr.aria-label]="copy().page">
                    <button
                        type="button"
                        [disabled]="index() === 0"
                        [attr.aria-label]="copy().previous"
                        [title]="copy().previous"
                        (click)="index.set(index() - 1)"
                    >
                        <span aria-hidden="true">←</span></button
                    ><span>{{ index() + 1 }} / {{ notes().length }}</span
                    ><button
                        type="button"
                        [disabled]="index() + 1 >= notes().length"
                        [attr.aria-label]="copy().next"
                        [title]="copy().next"
                        (click)="index.set(index() + 1)"
                    >
                        <span aria-hidden="true">→</span>
                    </button>
                </nav>
            }
            @if (own()) {
                <button type="button" class="primary add" (click)="add.emit()">
                    <span aria-hidden="true">+</span> {{ copy().add }}
                </button>
            }
        </div>
        @if (more()) {
            <button type="button" class="load-more" (click)="nextPage.emit()">
                {{ copy().loadMore }}
            </button>
        }
        <p role="alert">{{ error() }}</p>
    </article>`,
    styles: `
        :host {
            display: block;
            height: 100%;
            color: #443422;
        }
        article {
            position: relative;
            padding: 24px;
            height: 100%;
            overflow: auto;
            scrollbar-width: thin;
            overscroll-behavior: contain;
        }
        .close {
            position: absolute;
            right: 8px;
            top: 8px;
            background: none;
            border: 0;
            font-size: 28px;
        }
        .eyebrow {
            display: flex;
            align-items: center;
            gap: 4px;
            margin: 0 0 20px;
            font:
                italic 20px Georgia,
                serif;
            padding-right: 25px;
            border-bottom: 1px solid #b99a6844;
            padding-bottom: 10px;
        }
        .eyebrow > span {
            min-width: 0;
            overflow-wrap: anywhere;
        }
        .refresh,
        .icon {
            display: grid;
            place-items: center;
            flex: 0 0 44px;
            width: 44px;
            height: 44px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            background: transparent;
            color: #8a785c;
        }
        .refresh:hover:not(:disabled),
        .icon:hover:not(:disabled),
        nav button:hover:not(:disabled) {
            color: #493b2a;
            background: #b99a6814;
        }
        h2 {
            font:
                normal 27px/1.4 Georgia,
                serif;
        }
        .wish-text {
            margin: 0 0 8px;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font:
                22px/1.4 Georgia,
                serif;
        }
        .rating {
            color: #946d25;
            letter-spacing: 3px;
            font-size: 14px;
            margin: 0;
        }
        .note-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 44px;
            margin-bottom: 4px;
        }
        .note-content {
            touch-action: pan-y;
        }
        a {
            color: #684b31;
            font-size: 12px;
            text-underline-offset: 3px;
        }
        button {
            min-height: 44px;
            border: 1px solid #9e7f4e55;
            background: #e9d7b844;
            color: #493b2a;
            padding: 9px 13px;
            border-radius: 4px;
            font-size: 12px;
        }
        button.primary {
            background: #244a39;
            color: #fff1d4;
            width: 100%;
            margin-top: 14px;
        }
        .actions {
            display: flex;
            align-items: center;
            gap: 2px;
        }
        .icon.remove:hover:not(:disabled) {
            color: #963b34;
        }
        .confirmation {
            padding: 12px;
            border: 1px solid #b99a6844;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 12px;
        }
        .confirmation p {
            margin: 0 0 8px;
        }
        .confirmation button + button {
            margin-left: 8px;
        }
        .note-footer {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            justify-content: space-between;
            margin-top: 16px;
        }
        nav {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: #806c53;
        }
        nav button {
            font-size: 18px;
            border: 0;
            background: transparent;
            padding: 0;
        }
        button.add {
            width: auto;
            margin: 0 0 0 auto;
            padding: 8px 14px;
        }
        .load-more {
            margin-top: 8px;
            border: 0;
            background: transparent;
            text-decoration: underline;
        }
        [role='alert']:empty {
            display: none;
        }
        @media (max-width: 380px) {
            article {
                padding: 20px;
            }
        }
        .notice,
        [role='alert'] {
            font-size: 12px;
            line-height: 1.5;
        }
    `,
})
export class NoteStack {
    readonly preview = input<{
        readonly title: string;
        readonly site: string;
    } | null>(null);
    readonly previewUrl = output<string>();
    constructor() {
        afterRenderEffect(() =>
            this.previewUrl.emit(this.current()?.url ?? '')
        );
    }
    readonly copy = input.required<ExchangeCopy>();
    readonly name = input('');
    readonly notes = input<readonly Note[]>([]);
    readonly own = input(false);
    readonly pending = input(false);
    readonly more = input(false);
    readonly error = input('');
    readonly priorityLabels =
        input.required<Readonly<Record<'low' | 'medium' | 'high', string>>>();
    readonly index = linkedSignal<readonly Note[], number>({
        source: this.notes,
        computation: (notes, previous) =>
            Math.max(
                0,
                notes.findIndex(
                    note => note.id === previous?.source[previous.value]?.id
                )
            ),
    });
    readonly current = computed(() => this.notes()[this.index()]);
    readonly removing = signal('');
    readonly edit = output<Note>();
    readonly remove = output<Note>();
    readonly claim = output<Note>();
    readonly add = output();
    readonly nextPage = output();
    readonly closePaper = output();
    readonly refresh = output();
    readonly swipe = signal<{ readonly x: number; readonly y: number } | null>(
        null
    );
    private turn(direction: number) {
        this.index.update(index =>
            Math.max(0, Math.min(this.notes().length - 1, index + direction))
        );
    }
    turnKey(event: KeyboardEvent) {
        if (
            !(event.target instanceof Element) ||
            !event.target.closest('.note-content, nav') ||
            !window.getSelection()?.isCollapsed
        )
            return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            this.turn(event.key === 'ArrowRight' ? 1 : -1);
        }
    }
    startSwipe(event: PointerEvent) {
        if (event.pointerType === 'touch')
            this.swipe.set({ x: event.clientX, y: event.clientY });
    }
    endSwipe(event: PointerEvent) {
        const start = this.swipe();
        this.swipe.set(null);
        if (!start) return;
        const dx = event.clientX - start.x;
        if (
            Math.abs(dx) > 60 &&
            Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.5
        )
            this.turn(dx < 0 ? 1 : -1);
    }
}
