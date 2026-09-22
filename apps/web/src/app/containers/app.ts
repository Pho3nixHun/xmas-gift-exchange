import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'wh-root',
    imports: [RouterOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<router-outlet />',
})
export class App {}
