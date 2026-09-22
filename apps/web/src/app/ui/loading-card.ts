import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
} from '@angular/core';

import { loadingFacts } from '../core/loading-facts';

@Component({
    selector: 'wh-loading-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<section role="status">
        <div class="star" aria-hidden="true">✳</div>
        <p>
            {{
                locale() === 'hu'
                    ? 'Fényt gyújtunk a házikóban…'
                    : 'Lighting up the little house…'
            }}
        </p>
        @if (fact(); as item) {
            <article>
                <p>{{ item[locale()] }}</p>
                <a [href]="item.url" target="_blank" rel="noopener noreferrer"
                    >{{ item.source }} ↗</a
                ><button
                    type="button"
                    (click)="next()"
                    [attr.aria-label]="
                        locale() === 'hu'
                            ? 'Még egy érdekesség'
                            : 'Another little fact'
                    "
                >
                    {{ index() + 1 }} / 3 →
                </button>
            </article>
        }
    </section>`,
    styles: `
        :host {
            display: grid;
            position: fixed;
            inset: 0;
            background: #16343b;
            place-content: center;
            padding: 30px;
            text-align: center;
            color: #f7e9cf;
            z-index: 6;
        }
        .star {
            font-size: 65px;
            color: #dfb879;
        }
        article {
            max-width: 380px;
            margin-top: 40px;
            font:
                19px/1.7 Georgia,
                serif;
        }
        a,
        button {
            font: 11px sans-serif;
            color: inherit;
        }
        button {
            margin-left: 30px;
            min-height: 44px;
            border: 1px solid #dfc9a055;
            background: transparent;
            border-radius: 30px;
            padding: 10px 18px;
        }
    `,
})
export class LoadingCard {
    readonly locale = input<'hu' | 'en'>('hu');
    readonly index = signal(Math.floor(Math.random() * loadingFacts.length));
    readonly fact = computed(() => loadingFacts[this.index()]);
    next() {
        this.index.update(value => (value + 1) % loadingFacts.length);
    }
}
