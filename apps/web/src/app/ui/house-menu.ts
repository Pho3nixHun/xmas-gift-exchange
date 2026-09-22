import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';

import type { HouseAction } from '../core/house-scene';
import type { Messages } from '../core/messages';

@Component({
    selector: 'wh-house-menu',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<details #menu>
        <summary [attr.aria-label]="label()">
            <span>{{ label() }}</span>
        </summary>
        <div>
            @if (!hasPick()) {
                <button
                    type="button"
                    (click)="action.emit('tree'); menu.open = false"
                >
                    {{ copy().treePin }}
                </button>
            }
            <button
                type="button"
                (click)="action.emit('desk'); menu.open = false"
            >
                {{ copy().sit }}
            </button>
            <button
                type="button"
                (click)="action.emit('letters'); menu.open = false"
            >
                {{ copy().lettersPin }}
            </button>
            <button
                type="button"
                (click)="action.emit('recipient'); menu.open = false"
            >
                {{ copy().recipientPin }}
            </button>
        </div>
    </details>`,
    styles: `
        :host {
            display: block;
            position: relative;
            font-size: 11px;
            color: var(--cream);
        }
        summary {
            cursor: pointer;
            min-height: 44px;
            padding: 14px;
            background: #102e36bb;
            border-radius: 24px;
        }
        details > div {
            position: absolute;
            right: 0;
            top: 100%;
            width: 210px;
            display: grid;
            padding: 8px;
            background: #16383bf5;
            border-radius: 15px;
            box-shadow: 0 8px 30px #0005;
        }
        button {
            min-height: 44px;
            padding: 12px;
            color: inherit;
            background: none;
            border: 0;
            border-radius: 8px;
            text-align: left;
        }
        button:hover {
            background: #fff1;
        }
        @media (max-width: 650px) {
            summary {
                list-style: none;
                min-width: 44px;
                padding: 12px;
                text-align: center;
            }
            summary::-webkit-details-marker,
            summary span {
                display: none;
            }
            summary::after {
                content: '☰';
                font-size: 16px;
            }
        }
    `,
})
export class HouseMenu {
    readonly hasPick = input(false);
    readonly copy = input.required<Messages>();
    readonly label = input.required<string>();
    readonly action = output<HouseAction>();
}
