import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
    computed,
} from '@angular/core';
import type { NgtState } from 'angular-three';
import { NgtCanvas } from 'angular-three/dom';
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three';
import type { WebGLRendererParameters } from 'three';

import type {
    HouseAction,
    HouseStage,
    SceneCommand,
    OrnamentView,
} from '../../core/house-scene';
import { DeskScene } from '../world/desk-scene';

@Component({
    selector: 'wh-desk-viewport',
    imports: [NgtCanvas, DeskScene],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (supported()) {
            <ngt-canvas
                [camera]="camera"
                [gl]="glOptions"
                [dpr]="[0.75, effectiveDpr()]"
                [shadows]="true"
                [frameloop]="hidden() ? 'never' : 'always'"
                (created)="created($event)"
                (pointerMissed)="outside.emit()"
            >
                <ng-template canvasContent
                    ><wh-desk-scene
                        [stage]="stage()"
                        [command]="command()"
                        [ornaments]="ornaments()"
                        [pinsElement]="pinsElement()"
                        [boardElement]="boardElement()"
                        (action)="action.emit($event)"
                        (settled)="settled.emit()"
                        (quality)="quality.set($event)"
                        [paused]="paused()"
                        [reduced]="reduced()"
                        [paperElement]="paperElement()"
                /></ng-template>
            </ngt-canvas>
        }
    `,
    styles: `
        :host {
            display: block;
            position: fixed;
            inset: 0;
            height: 100dvh;
            min-height: 250px;
        }
        ngt-canvas {
            display: block;
            height: 100%;
        }
    `,
})
export class DeskViewport {
    readonly stage = input<HouseStage>('outside');
    readonly ornaments = input<readonly OrnamentView[]>([]);
    readonly command = input<SceneCommand>({ action: 'room', revision: 0 });
    readonly pinsElement = input.required<HTMLElement>();
    readonly boardElement = input.required<HTMLElement>();
    readonly action = output<HouseAction>();
    readonly settled = output();
    readonly paused = input(false);
    readonly dpr = input(1.5);
    readonly quality = signal(innerWidth < 650 ? 1 : 2);
    readonly effectiveDpr = computed(() =>
        Math.min(this.dpr(), this.quality())
    );
    readonly paperElement = input.required<HTMLElement>();
    readonly failed = output();
    readonly outside = output();
    readonly supported = signal(true);
    readonly reduced = signal(false);
    readonly hidden = signal(false);
    readonly camera = {
        position: [4.7, 3.8, 6.8] as [number, number, number],
        fov: 42,
        near: 0.1,
        far: 150,
    };
    // The house is composited through its own render target, so the default
    // framebuffer only ever receives one fullscreen quad. Its multisample
    // buffer would be allocated and resolved every frame for nothing.
    readonly glOptions: WebGLRendererParameters = { antialias: false };
    private readonly destroy = inject(DestroyRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    constructor() {
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const motion = () => this.reduced.set(media.matches);
        const visibility = () => this.hidden.set(document.hidden);
        const resize = () => {
            const top = this.host.nativeElement.getBoundingClientRect().top;
            this.host.nativeElement.style.height = `${Math.max(240, (window.visualViewport?.height ?? window.innerHeight) - top)}px`;
        };
        motion();
        visibility();
        media.addEventListener('change', motion);
        document.addEventListener('visibilitychange', visibility);
        window.visualViewport?.addEventListener('resize', resize);
        window.addEventListener('resize', resize);
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            this.supported.set(false);
            queueMicrotask(() => this.failed.emit());
        }
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        const frame = requestAnimationFrame(resize);
        this.destroy.onDestroy(() => {
            cancelAnimationFrame(frame);
            media.removeEventListener('change', motion);
            document.removeEventListener('visibilitychange', visibility);
            window.visualViewport?.removeEventListener('resize', resize);
            window.removeEventListener('resize', resize);
        });
    }

    created(state: NgtState) {
        state.gl.toneMapping = ACESFilmicToneMapping;
        state.gl.toneMappingExposure = 1.2;
        state.gl.outputColorSpace = SRGBColorSpace;
        state.gl.shadowMap.type = PCFSoftShadowMap;
        state.gl.shadowMap.autoUpdate = false;
        const canvas = state.gl.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        const lost = (event: Event) => {
            event.preventDefault();
            this.failed.emit();
        };
        canvas.addEventListener('webglcontextlost', lost);
        this.destroy.onDestroy(() =>
            canvas.removeEventListener('webglcontextlost', lost)
        );
    }
}
