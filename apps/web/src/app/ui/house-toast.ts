import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
    selector: 'wh-house-toast',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<p class="toast" role="status" [class.visible]="!!message()">
        {{ message() }}
    </p>`,
    styles: `
        .toast {
            position: fixed;
            z-index: 12;
            bottom: 120px;
            left: 50%;
            transform: translate(-50%, 10px);
            max-width: calc(100vw - 40px);
            width: max-content;
            pointer-events: none;
            opacity: 0;
            background: #f6e8c9;
            color: #665135;
            padding: 12px 20px;
            border-radius: 3px;
            font-size: 12px;
            box-shadow: 0 5px 30px #12252244;
            transition:
                opacity 0.25s,
                transform 0.25s;
        }
        .toast.visible {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    `,
})
export class HouseToast {
    readonly message = input('');
}
