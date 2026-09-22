import {
    ChangeDetectionStrategy,
    Component,
    CUSTOM_ELEMENTS_SCHEMA,
    DestroyRef,
    inject,
    input,
    output,
    afterRenderEffect,
} from '@angular/core';
import { beforeRender, NgtArgs, NgtObjectEvents } from 'angular-three';
import type { NgtThreeEvent } from 'angular-three';
import {
    PerspectiveCamera,
    Vector3,
    MeshStandardMaterial,
    Mesh,
    Matrix4,
} from 'three';
import type { Object3D, Scene, WebGLRenderer } from 'three';

import type {
    HouseAction,
    HouseStage,
    SceneCommand,
    OrnamentView,
} from '../../core/house-scene';
import { createHouseModel } from '../render/house-model';
import { toggleLight } from '../render/lights';
import { createPost } from '../render/post';
import { animateAtmosphere, animateVisitors } from '../runtime/atmosphere';
import { createCompanions } from '../runtime/companions';
import { createDirector } from '../runtime/director';
import {
    createQualityBudget,
    createShadowSchedule,
} from '../runtime/frame-budget';
import { createLookAround } from '../runtime/look-around';
import { scenePaperSize } from '../runtime/poses';
import { projectPaper } from '../runtime/projection';
import { HouseSound } from '../runtime/sound';
import { createVisitorSounds } from '../runtime/visitor-sounds';

@Component({
    selector: 'wh-desk-scene',
    imports: [NgtArgs, NgtObjectEvents],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ngt-primitive *args="[model.world]" />
        <ng-container
            [objectEvents]="model.world"
            (click)="activate($event)"
        />`,
})
export class DeskScene {
    readonly stage = input<HouseStage>('outside');
    readonly ornaments = input<readonly OrnamentView[]>([]);
    readonly paused = input(false);
    readonly reduced = input(false);
    readonly command = input<SceneCommand>({ action: 'room', revision: 0 });
    readonly paperElement = input.required<HTMLElement>();
    readonly pinsElement = input.required<HTMLElement>();
    readonly boardElement = input.required<HTMLElement>();
    readonly action = output<HouseAction>();
    readonly settled = output();
    readonly quality = output<number>();
    readonly model = createHouseModel(innerWidth < 650);
    private readonly sound = inject(HouseSound);
    private readonly visitorSounds = createVisitorSounds(
        (kind, level) => this.sound.effect(kind, level),
        kind => this.sound.stop(kind)
    );
    private readonly soundPosition = new Vector3();
    // Anchors are looked up per pin on every projected frame; a map and one
    // scratch vector keep that path free of allocation.
    private readonly anchorPoints = new Map<string, Vector3>(
        Object.entries(this.model.anchors)
    );
    private readonly anchorPoint = new Vector3();
    private readonly post = createPost();
    private readonly director = createDirector(
        this.model,
        () => this.settled.emit(),
        () => this.command().index ?? 0,
        () => this.sound.effect('lights'),
        () => this.sound.effect('knock')
    );
    private readonly companions = createCompanions(this.model, action => {
        if (action === 'bell') this.sound.chime();
        else this.sound.effect(action);
    });
    private readonly look = createLookAround();
    private readonly shadowDue = createShadowSchedule();
    private readonly qualityBudget = createQualityBudget();
    private readonly projection = {
        camera: new Matrix4(),
        lens: new Matrix4(),
        stage: '',
        dirty: true,
        moving: false,
    };
    private readonly shadows = { stage: '', revision: -1 };
    // What the ambient props were last posed for. Every value they receive is a
    // pure function of these, so an unchanged triple means an unchanged pose.
    private readonly posed = { elapsed: -1, room: false, smoke: false };
    private readonly clock = {
        elapsed: 0,
        revision: 0,
        width: 0,
        height: 0,
        focused: false,
        ratio: 0,
        renderDirty: true,
        animating: false,
    };

    constructor() {
        const pinsChanged = new MutationObserver(() => {
            this.projection.dirty = true;
        });
        afterRenderEffect(() => {
            pinsChanged.disconnect();
            pinsChanged.observe(this.pinsElement(), {
                childList: true,
                subtree: true,
                characterData: true,
            });
            this.projection.dirty = true;
        });
        afterRenderEffect(() => {
            const colors = {
                red: 0xb52e46,
                purple: 0x8650be,
                blue: 0x2884c5,
                gold: 0xe0b86c,
            };
            this.model.baubles.forEach((bauble, index) => {
                const slot = this.ornaments()[index];
                bauble.group.visible = !!slot;
                const material = bauble.body.material;
                if (!slot || !(material instanceof MeshStandardMaterial))
                    return;
                material.color.setHex(colors[slot.color]);
                material.emissive.setHex(
                    slot.available ? colors[slot.color] : 0
                );
                bauble.aura.material.color.setHex(colors[slot.color]);
            });
            this.clock.renderDirty = true;
        });
        const stop = beforeRender(
            ({ camera, scene, gl, size, delta }) => {
                if (!(camera instanceof PerspectiveCamera)) return;
                this.director.sync(this.stage(), camera, scene, size);
                this.director.tick(delta, this.reduced(), camera);
                if (
                    size.width !== this.clock.width ||
                    size.height !== this.clock.height ||
                    gl.getPixelRatio() !== this.clock.ratio
                ) {
                    this.director.resize(camera, size);
                    this.clock.width = size.width;
                    this.clock.height = size.height;
                    const ratio = gl.getPixelRatio();
                    this.clock.ratio = ratio;
                    this.projection.dirty = true;
                    this.post.resize(
                        Math.round(size.width * ratio),
                        Math.round(size.height * ratio)
                    );
                    this.model.snowMaterial.uniforms.ratio.value = ratio;
                }
                this.look.bind(gl.domElement);
                this.look.tick(camera, size, {
                    stage: this.stage(),
                    transitioning: this.director.active(),
                    paused: this.paused(),
                    reduced: this.reduced(),
                    delta,
                });
                this.animate(delta, camera, size);
                const projected = this.projectIfChanged(camera, size);
                this.updateShadows(gl, delta, size.width < 650);
                this.renderFrame(gl, scene, camera, delta, projected);
            },
            { priority: 1 }
        );
        inject(DestroyRef).onDestroy(() => {
            stop();
            pinsChanged.disconnect();
            this.look.dispose();
            this.visitorSounds.silence();
            this.model.dispose();
            this.post.dispose();
        });
    }
    private renderFrame(
        gl: WebGLRenderer,
        scene: Scene,
        camera: PerspectiveCamera,
        delta: number,
        projected: boolean
    ) {
        const animating =
            this.director.active() ||
            this.companions.active() ||
            (!this.paused() && !this.reduced());
        const changed =
            projected ||
            this.clock.renderDirty ||
            gl.shadowMap.needsUpdate ||
            animating ||
            this.clock.animating;
        this.clock.animating = animating;
        if (!changed) return;
        const quality = this.qualityBudget(delta, gl.getPixelRatio());
        if (quality !== null) this.quality.emit(quality);
        this.post.render(gl, scene, camera);
        this.clock.renderDirty = false;
    }
    private projectIfChanged(
        camera: PerspectiveCamera,
        size: { readonly width: number; readonly height: number }
    ) {
        camera.updateMatrixWorld();
        const moving = this.director.active();
        if (
            this.projection.dirty ||
            moving ||
            this.projection.moving ||
            this.projection.stage !== this.stage() ||
            !this.projection.camera.equals(camera.matrixWorld) ||
            !this.projection.lens.equals(camera.projectionMatrix) ||
            (this.stage() === 'tree' && !this.paused() && !this.reduced())
        ) {
            this.project(camera, size);
            this.projection.camera.copy(camera.matrixWorld);
            this.projection.lens.copy(camera.projectionMatrix);
            this.projection.stage = this.stage();
            this.projection.moving = moving;
            this.projection.dirty = false;
            return true;
        }
        return false;
    }
    private updateShadows(gl: WebGLRenderer, delta: number, mobile: boolean) {
        const shadowDirty =
            this.shadows.stage !== this.stage() ||
            this.shadows.revision !== this.command().revision;
        if (
            this.shadowDue(
                delta,
                shadowDirty,
                this.director.active() ||
                    this.companions.active() ||
                    (!this.paused() && !this.reduced()),
                mobile
            )
        )
            gl.shadowMap.needsUpdate = true;
        this.shadows.stage = this.stage();
        this.shadows.revision = this.command().revision;
    }
    private animate(
        delta: number,
        camera: PerspectiveCamera,
        size: { readonly width: number; readonly height: number }
    ) {
        if (!this.paused() && !this.reduced())
            this.clock.elapsed += Math.min(delta, 0.05);
        if (this.command().revision !== this.clock.revision) {
            this.clock.revision = this.command().revision;
            this.companions.run(this.command());
        }
        this.companions.tick(
            delta,
            this.reduced(),
            this.clock.elapsed,
            this.stage()
        );
        this.poseAmbient();
        animateVisitors(
            this.model,
            camera,
            size,
            this.clock.elapsed,
            this.stage()
        );
        this.updateVisitorSounds(camera);
        if (this.reduced()) {
            this.model.sleigh.visible = false;
            this.model.shootingStar.visible = false;
            this.model.flyingSnow.visible = false;
            this.model.snowman.visible = true;
            this.model.snowman.position.set(
                -7,
                0,
                this.model.room.visible ? -9 : 8.5
            );
        }
    }
    // A paused or reduced-motion house holds a frozen clock, so the ambient
    // sines below would rewrite the pose the props already hold on every frame.
    private poseAmbient() {
        const elapsed = this.clock.elapsed,
            room = this.model.room.visible,
            smoke = this.model.smoke.visible;
        if (
            !this.clock.renderDirty &&
            this.posed.elapsed === elapsed &&
            this.posed.room === room &&
            this.posed.smoke === smoke
        )
            return;
        this.posed.elapsed = elapsed;
        this.posed.room = room;
        this.posed.smoke = smoke;
        animateAtmosphere(this.model, elapsed);
        if (!room) return;
        this.model.baubles.forEach((bauble, index) => {
            const slot = this.ornaments()[index];
            if (!slot) return;
            bauble.aura.material.opacity = slot.available
                ? 0.34 + Math.sin(elapsed * 2 + index) * 0.12
                : 0;
        });
    }
    private updateVisitorSounds(camera: PerspectiveCamera) {
        if (
            this.stage() !== 'outside' ||
            this.paused() ||
            this.reduced() ||
            !this.sound.enabled() ||
            this.director.active() ||
            document.hidden
        ) {
            this.visitorSounds.silence();
            return;
        }
        const screenX = (visitor: Object3D) => {
            if (!visitor.visible) return null;
            this.soundPosition.copy(visitor.position).project(camera);
            const { x, y, z } = this.soundPosition;
            return Math.abs(x) < 1.1 && Math.abs(y) < 1.1 && Math.abs(z) < 1
                ? x
                : null;
        };
        this.visitorSounds.tick(
            this.clock.elapsed,
            screenX(this.model.sleigh),
            screenX(this.model.snowman)
        );
    }
    private project(
        camera: PerspectiveCamera,
        size: { readonly width: number; readonly height: number }
    ) {
        // Read all layout sizes before writing transforms, to avoid forced
        // layout once per hotspot during camera travel.
        const elements = Array.from(
            this.pinsElement().querySelectorAll<HTMLElement>('[data-anchor]')
        ).map(element => ({
            element,
            width: element.offsetWidth,
            height: element.offsetHeight,
        }));
        const paper = this.paperElement(),
            pixels = scenePaperSize(size),
            world = this.director.configurePaper(this.stage(), size);
        paper.style.width = `${pixels.width}px`;
        paper.style.height = `${pixels.height}px`;
        paper.style.transform = projectPaper(
            camera,
            this.model.stack,
            size,
            pixels,
            world
        );
        const reading =
                this.stage() === 'desk' ||
                this.stage() === 'recipient' ||
                this.stage() === 'notes',
            ready = reading && !this.director.active();
        paper.style.opacity = reading && this.model.stack.visible ? '1' : '0';
        paper.style.pointerEvents = ready ? 'auto' : 'none';
        paper.inert = !ready;
        if (ready && !this.clock.focused) paper.focus({ preventScroll: true });
        this.clock.focused = ready;
        const board = this.boardElement();
        board.style.transform = projectPaper(
            camera,
            this.model.letters,
            size,
            { width: 480, height: 580 },
            { width: 1.91, height: 2.32 }
        );
        board.inert = this.stage() !== 'letters' || this.director.active();
        const pins = elements
            .flatMap(({ element, width, height }) => {
                const point = this.anchor(element.dataset['anchor']);
                if (!point) return [];
                const p = point.project(camera);
                return [
                    {
                        element,
                        width,
                        height,
                        x: Math.max(
                            width / 2 + 12,
                            Math.min(
                                size.width - width / 2 - 12,
                                ((p.x + 1) / 2) * size.width
                            )
                        ),
                        y: ((1 - p.y) / 2) * size.height,
                        visible: p.z < 1 && p.z > -1 && !this.director.active(),
                    },
                ];
            })
            .sort((a, b) => a.y - b.y);
        pins.forEach((pin, index) => {
            if (this.stage() === 'room')
                pins.slice(0, index).forEach(previous => {
                    if (
                        pin.visible &&
                        previous.visible &&
                        Math.abs(pin.x - previous.x) <
                            (pin.width + previous.width) / 2 + 8
                    )
                        pin.y = Math.max(
                            pin.y,
                            previous.y + (pin.height + previous.height) / 2 + 8
                        );
                });
            pin.element.style.transform = `translate(${pin.x}px,${pin.y}px) translate(-50%,-50%)`;
            pin.element.style.visibility = pin.visible ? 'visible' : 'hidden';
        });
    }
    private anchor(key: string | undefined) {
        if (key?.startsWith('ornament-'))
            return this.model.baubles[
                Number(key.slice(9))
            ]?.group.getWorldPosition(this.anchorPoint);
        const point = key ? this.anchorPoints.get(key) : undefined;
        return point ? this.anchorPoint.copy(point) : undefined;
    }
    private hitTarget(event: NgtThreeEvent<MouseEvent>) {
        const visible = (object: Object3D | null): boolean =>
            object === null || (object.visible && visible(object.parent));
        const find = (object: Object3D | null): Object3D | null =>
            typeof object?.userData['action'] === 'string'
                ? object
                : object?.parent
                  ? find(object.parent)
                  : null;
        const hits = event.intersections.filter(
            item => item.object instanceof Mesh && visible(item.object)
        );
        const detail = hits
            .map(hit => find(hit.object))
            .find(target =>
                ['star', 'cat', 'cookie', 'lights'].includes(
                    String(target?.userData['action'])
                )
            );
        return detail ?? find(hits[0]?.object ?? null);
    }
    activate(event: NgtThreeEvent<MouseEvent>) {
        if (this.director.active() || event.delta > 5) return;
        if (['desk', 'recipient', 'notes'].includes(this.stage())) {
            event.stopPropagation();
            this.action.emit('room');
            return;
        }
        const target = this.hitTarget(event);
        const action: unknown = target?.userData['action'];
        event.stopPropagation();
        if (
            this.stage() === 'tree' &&
            !['tree', 'star', 'cat'].includes(String(action))
        ) {
            this.action.emit('room');
            return;
        }
        if (this.stage() === 'letters' && action !== 'letters') {
            this.action.emit('room');
            return;
        }
        if (action === 'lights' && target) {
            toggleLight(target);
            this.sound.effect('lights');
            this.clock.renderDirty = true;
            return;
        }
        const known = [
            'door',
            'tree',
            'desk',
            'letters',
            'recipient',
            'sofa',
            'cat',
            'cookie',
            'bell',
            'star',
        ] as const;
        const allowed = known.find(candidate => candidate === action);
        if (allowed) this.action.emit(allowed);
    }
}
