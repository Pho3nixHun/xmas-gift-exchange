import { DOCUMENT } from '@angular/common';
import {
    afterRenderEffect,
    DestroyRef,
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import {
    form,
    FormField,
    minLength,
    maxLength,
    required,
} from '@angular/forms/signals';
import { passwordSchema } from '@winter/contracts/exchange';

import {
    exchangeEnglish,
    exchangeHungarian,
    exchangeError,
} from '../core/exchange-copy';
import { AccountStore } from '../state/domain/account.store';

@Component({
    selector: 'wh-account-page',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<main class="account">
        <header>
            <a href="/">✳ {{ copy().back }}</a
            ><button
                type="button"
                (click)="locale.set(locale() === 'hu' ? 'en' : 'hu')"
            >
                {{ locale() === 'hu' ? 'EN' : 'HU' }}
            </button>
        </header>
        @if (account.recovery()) {
            <h1>{{ copy().recovery }}</h1>
            @if (account.done()) {
                <p role="status">{{ copy().recovered }}</p>
                <a href="/">{{ copy().back }}</a>
            } @else if (!account.hasToken()) {
                <p>{{ copy().reopen }}</p>
            } @else {
                <form (submit)="recover($event)">
                    <p id="password-rules">{{ copy().passwordRules }}</p>
                    <label for="new-password">{{ copy().newPassword }}</label
                    ><input
                        id="new-password"
                        type="password"
                        autocomplete="new-password"
                        aria-describedby="password-rules"
                        [formField]="fields.password"
                    /><label for="repeat-password">{{ copy().repeat }}</label
                    ><input
                        id="repeat-password"
                        type="password"
                        autocomplete="new-password"
                        [formField]="fields.repeat"
                    /><button type="submit" [disabled]="account.busy()">
                        {{ copy().resetPassword }}
                    </button>
                </form>
            }
        } @else {
            <h1>{{ copy().setup }}</h1>
            @if (account.setup(); as setup) {
                <p>
                    {{
                        setup.season.status === 'open'
                            ? copy().open
                            : copy().waiting
                    }}
                </p>
                @if (setup.season.status === 'setup') {
                    <form (submit)="save($event)">
                        <label for="roster">{{ copy().roster }}</label
                        ><textarea
                            id="roster"
                            rows="8"
                            [formField]="fields.names"
                        ></textarea
                        ><button type="submit" [disabled]="account.busy()">
                            {{ copy().saveSetup }}
                        </button>
                    </form>
                    @if (setup.people.length) {
                        <fieldset>
                            <legend>{{ copy().exclusions }}</legend>
                            <p>
                                {{
                                    locale() === 'hu'
                                        ? 'A kizárások egyirányúak.'
                                        : 'Exclusions are one-way.'
                                }}
                            </p>
                            @for (person of setup.people; track person.id) {
                                <details>
                                    <summary>{{ person.displayName }}</summary>
                                    <div class="exclusions">
                                        @for (
                                            other of setup.people;
                                            track other.id
                                        ) {
                                            @if (other.id !== person.id) {
                                                <label
                                                    ><input
                                                        type="checkbox"
                                                        [checked]="
                                                            excluded(
                                                                person.id,
                                                                other.id
                                                            )
                                                        "
                                                        (change)="
                                                            account.toggleExclusion(
                                                                person.id,
                                                                other.id
                                                            )
                                                        "
                                                    />{{
                                                        other.displayName
                                                    }}</label
                                                >
                                            }
                                        }
                                    </div>
                                </details>
                            }
                        </fieldset>
                        <button
                            type="button"
                            [disabled]="account.busy()"
                            (click)="account.saveExclusions()"
                        >
                            {{ copy().saveSetup }}
                        </button>
                    }
                    <div class="buttons">
                        <button
                            type="button"
                            [disabled]="account.busy()"
                            (click)="account.validate()"
                        >
                            {{ copy().validate }}</button
                        ><button
                            type="button"
                            [disabled]="account.busy()"
                            (click)="account.open()"
                        >
                            {{ copy().open }}
                        </button>
                    </div>
                    @if (account.valid()) {
                        <p role="status">{{ copy().valid }}</p>
                    }
                } @else {
                    <label for="reauth-password">{{ copy().reauth }}</label
                    ><input
                        id="reauth-password"
                        type="password"
                        autocomplete="current-password"
                        [formField]="fields.password"
                    />
                    <ul>
                        @for (person of setup.people; track person.id) {
                            <li>
                                <span>{{ person.displayName }}</span>
                                @if (person.protected) {
                                    <button
                                        type="button"
                                        [disabled]="account.busy()"
                                        (click)="
                                            account.issue(
                                                person.id,
                                                values().password
                                            )
                                        "
                                    >
                                        {{ copy().issue }}
                                    </button>
                                }
                            </li>
                        }
                    </ul>
                    @if (account.link()) {
                        <p>{{ copy().copyLink }}</p>
                        <label for="recovery-link">{{ copy().issue }}</label
                        ><input
                            id="recovery-link"
                            readonly
                            [value]="account.link()"
                        />
                    }
                }
                <details class="reset">
                    <summary>{{ copy().reset }}</summary>
                    <p>{{ copy().resetHelp }}</p>
                    <form (submit)="reset($event)">
                        <label for="reset-confirmation">RESET</label
                        ><input
                            id="reset-confirmation"
                            [formField]="fields.confirmation"
                            autocomplete="off"
                        /><button
                            type="submit"
                            [disabled]="
                                account.busy() ||
                                values().confirmation !== 'RESET'
                            "
                        >
                            {{ copy().reset }}
                        </button>
                    </form>
                </details>
                <button type="button" (click)="account.logout()">
                    {{ copy().logout }}
                </button>
            } @else {
                <p>{{ copy().noSetup }}</p>
                <form (submit)="login($event)">
                    <label for="organiser-password">{{ copy().password }}</label
                    ><input
                        id="organiser-password"
                        type="password"
                        autocomplete="current-password"
                        [formField]="fields.password"
                    /><button type="submit" [disabled]="account.busy()">
                        {{ copy().signIn }}
                    </button>
                </form>
            }
        }
        <p role="alert">{{ localError() || error() }}</p>
    </main>`,
    styleUrl: './account-page.scss',
})
export class AccountPage {
    readonly account = inject(AccountStore);
    readonly locale = signal<'hu' | 'en'>(
        this.account.api.preferredLocale() ?? 'hu'
    );
    private readonly document = inject(DOCUMENT);
    readonly copy = computed(() =>
        this.locale() === 'hu' ? exchangeHungarian : exchangeEnglish
    );
    readonly error = computed(() =>
        exchangeError(this.account.error(), this.copy())
    );
    readonly localError = signal('');
    readonly values = signal({
        password: '',
        repeat: '',
        names: '',
        confirmation: '',
    });
    readonly fields = form(this.values, fields => {
        required(fields.password);
        minLength(fields.password, 1);
        maxLength(fields.password, 128);
    });
    constructor() {
        const reopen = () => {
            if (location.hash.startsWith('#token=')) void this.account.load();
        };
        window.addEventListener('hashchange', reopen);
        inject(DestroyRef).onDestroy(() =>
            window.removeEventListener('hashchange', reopen)
        );
        afterRenderEffect(() => {
            this.document.documentElement.lang = this.locale();
            this.account.api.preferences.set({
                ...this.account.api.preferences.get(),
                locale: this.locale(),
            });
        });
        void this.account.load().then(() => this.fillNames());
    }
    private fillNames() {
        this.values.update(value => ({
            ...value,
            names:
                this.account
                    .setup()
                    ?.people.map(person => person.displayName)
                    .join('\n') ?? '',
            password: '',
        }));
    }
    async login(event: SubmitEvent) {
        event.preventDefault();
        await this.account.login(this.values().password);
        this.fillNames();
    }
    async save(event: SubmitEvent) {
        event.preventDefault();
        await this.account.saveNames(this.values().names);
        this.fillNames();
    }
    async reset(event: SubmitEvent) {
        event.preventDefault();
        await this.account.reset(this.values().confirmation);
        this.fillNames();
        this.values.update(value => ({ ...value, confirmation: '' }));
    }
    async recover(event: SubmitEvent) {
        event.preventDefault();
        if (!passwordSchema.safeParse(this.values().password).success) {
            this.localError.set(this.copy().passwordRules);
            return;
        }
        if (this.values().password !== this.values().repeat) {
            this.localError.set(this.copy().mismatch);
            return;
        }
        this.localError.set('');
        await this.account.recover(this.values().password);
        this.values.update(value => ({ ...value, password: '', repeat: '' }));
    }
    excluded(giverId: string, recipientId: string) {
        return this.account
            .exclusions()
            .some(
                edge =>
                    edge.giverId === giverId && edge.recipientId === recipientId
            );
    }
}
