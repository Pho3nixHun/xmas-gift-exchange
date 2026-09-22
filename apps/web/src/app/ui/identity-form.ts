import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
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

import type { ExchangeCopy } from '../core/exchange-copy';

@Component({
    selector: 'wh-identity-form',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<form (submit)="submit($event)">
        <p class="eyebrow">
            {{ selected()?.displayName ?? copy().arrivalEye }}
        </p>
        <h2>{{ selected() ? copy().signIn : copy().who }}</h2>
        @if (!selected()) {
            <p class="intro">{{ copy().arrivalIntro }}</p>
            <div class="name-grid" role="group" [attr.aria-label]="copy().name">
                @for (person of people(); track person.id) {
                    <button
                        type="button"
                        [attr.aria-label]="person.displayName"
                        [attr.aria-description]="
                            person.protected ? copy().protectedName : null
                        "
                        (click)="choose(person.id)"
                    >
                        {{ person.displayName }}
                        @if (person.protected) {
                            <span aria-hidden="true">⌑</span>
                        }
                    </button>
                }
            </div>
        } @else if (selected(); as person) {
            <button type="button" class="text-button" (click)="choose('')">
                ← {{ copy().changeName }}
            </button>
            @if (!person.protected) {
                <p>{{ copy().protect }}</p>
                <p id="password-rules">{{ copy().passwordRules }}</p>
            }
            <label for="identity-password">{{ copy().password }}</label
            ><input
                id="identity-password"
                type="password"
                [attr.aria-describedby]="
                    person.protected ? null : 'password-rules'
                "
                [attr.autocomplete]="
                    person.protected ? 'current-password' : 'new-password'
                "
                [formField]="fields.password"
            />
            @if (!person.protected) {
                <label for="identity-repeat">{{ copy().repeat }}</label
                ><input
                    id="identity-repeat"
                    type="password"
                    autocomplete="new-password"
                    [formField]="fields.repeat"
                />
            }
            <button type="submit" class="primary" [disabled]="pending()">
                {{ copy().signIn }} ↗
            </button>
            @if (person.protected) {
                <button
                    type="button"
                    class="text-button"
                    (click)="help.set(!help())"
                >
                    {{ copy().forgot }}
                </button>
            }
        }
        @if (help()) {
            <p>{{ copy().recoverHelp }}</p>
            <p>{{ contact() }}</p>
        }
        <p role="alert">{{ localError() || error() }}</p>
    </form>`,
    styles: `
        :host {
            display: block;
        }
        :host::before {
            content: '';
            position: absolute;
            inset: 0 0 auto;
            height: 7px;
            background: repeating-linear-gradient(
                90deg,
                #9e4f37 0 16px,
                #f7e9ce 16px 24px,
                #43614b 24px 40px,
                #f7e9ce 40px 48px
            );
            pointer-events: none;
        }
        :host::after {
            content: '';
            position: absolute;
            top: 7px;
            left: 0;
            border-top: 38px solid #fff8e955;
            border-right: 38px solid transparent;
            pointer-events: none;
        }
        .eyebrow {
            font-size: 9px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #9e7546;
        }
        .intro {
            color: #806c53;
        }
        .name-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 24px;
        }
        .name-grid button {
            position: relative;
            margin: 0;
            min-height: 48px;
            background: #ead9b94d;
            border: 1px solid #b69a6a70;
            border-radius: 3px;
            color: #655236;
            font:
                18px Georgia,
                serif;
            padding: 12px 18px;
            overflow-wrap: anywhere;
        }
        .name-grid button:hover {
            background: #e2c89d;
        }
        .name-grid span {
            position: absolute;
            right: 7px;
            top: 5px;
            font-size: 11px;
        }
        h2 {
            font:
                normal 30px Georgia,
                serif;
            margin: 0 0 20px;
        }
        label {
            display: block;
            font-size: 12px;
            margin: 12px 0 5px;
        }
        select,
        input {
            width: 100%;
            min-height: 44px;
            padding: 10px;
            border: 1px solid #91734d60;
            border-radius: 4px;
            background: #fff7df;
            color: #3d3024;
            font: inherit;
            font-size: 16px;
        }
        p {
            font-size: 12px;
            line-height: 1.6;
        }
        button {
            margin-top: 12px;
        }
        .primary {
            width: 100%;
        }
        .text-button {
            border: 0;
            background: none;
            color: inherit;
            text-decoration: underline;
            min-height: 44px;
        }
    `,
})
export class IdentityForm {
    readonly people = input.required<
        readonly {
            readonly id: string;
            readonly displayName: string;
            readonly protected: boolean;
        }[]
    >();
    readonly copy = input.required<ExchangeCopy>();
    readonly contact = input('');
    readonly error = input('');
    readonly pending = input(false);
    readonly login = output<{
        readonly id: string;
        readonly password: string;
        readonly enrol: boolean;
    }>();
    readonly values = signal({ id: '', password: '', repeat: '' });
    readonly fields = form(this.values, fields => {
        required(fields.password);
        minLength(fields.password, 1);
        maxLength(fields.password, 128);
    });
    readonly help = signal(false);
    readonly localError = signal('');
    readonly selected = computed(() =>
        this.people().find(person => person.id === this.values().id)
    );
    choose(id: string) {
        this.values.set({ id, password: '', repeat: '' });
        this.help.set(false);
        this.localError.set('');
    }
    submit(event: SubmitEvent) {
        event.preventDefault();
        const person = this.selected();
        if (!person || this.pending()) return;
        if (
            !person.protected &&
            !passwordSchema.safeParse(this.values().password).success
        ) {
            this.localError.set(this.copy().passwordRules);
            return;
        }
        if (
            !person.protected &&
            this.values().password !== this.values().repeat
        ) {
            this.localError.set(this.copy().mismatch);
            return;
        }
        this.localError.set('');
        this.login.emit({
            id: person.id,
            password: this.values().password,
            enrol: !person.protected,
        });
    }
}
