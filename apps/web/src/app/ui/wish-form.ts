import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    model,
    output,
    signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

import type { Messages } from '../core/messages';
import { emptyWish } from '../core/wish';
import type { WishInput } from '../core/wish';

@Component({
    selector: 'wh-wish-form',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './wish-form.html',
    styleUrl: './wish-form.scss',
})
export class WishForm {
    readonly copy = input.required<Messages>();
    readonly draft = model<WishInput>(emptyWish());
    readonly pending = input(false);
    readonly result = input('');
    readonly preview = input<{
        readonly title: string;
        readonly site: string;
    } | null>(null);
    readonly previewUrl = output<string>();
    readonly check = output<WishInput>();
    readonly closePaper = output();
    readonly cancelLabel = input('');
    readonly cancelWriting = output();
    readonly fields = form(this.draft);
    readonly priorities = ['low', 'medium', 'high'] as const;
    readonly attempted = signal(false);
    readonly count = computed(
        () => Array.from(this.draft().description).length
    );
    readonly invalid = computed(
        () => this.count() > 500 || this.draft().description.trim().length === 0
    );

    submit(event: SubmitEvent) {
        event.preventDefault();
        this.attempted.set(true);
        if (!this.invalid() && !this.pending()) this.check.emit(this.draft());
    }
}
