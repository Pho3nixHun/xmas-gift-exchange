import { MathUtils, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';

import type { HouseStage } from '../../core/house-scene';

import { cameraPose } from './poses';
import type { SurfaceSize } from './projection';

interface LookFrame {
    readonly stage: HouseStage;
    readonly transitioning: boolean;
    readonly paused: boolean;
    readonly reduced: boolean;
    readonly delta: number;
}

// A bounded look around, rather than an orbit that can leave the dollhouse.
export const createLookAround = () => {
    const state = {
        stage: 'outside' as HouseStage,
        enabled: false,
        yaw: 0,
        pitch: 0,
        down: null as {
            x: number;
            y: number;
            lastX: number;
            lastY: number;
        } | null,
        moved: false,
        canvas: null as HTMLCanvasElement | null,
        controller: null as AbortController | null,
    };
    const move = (event: PointerEvent) => {
        if (!state.enabled || !state.canvas) return;
        const down = state.down;
        if (down) {
            state.moved ||=
                Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7;
            if (state.moved) {
                state.yaw = MathUtils.clamp(
                    state.yaw + (event.clientX - down.lastX) * 0.002,
                    -0.4,
                    0.4
                );
                state.pitch = MathUtils.clamp(
                    state.pitch + (event.clientY - down.lastY) * 0.001,
                    -0.12,
                    0.16
                );
            }
            down.lastX = event.clientX;
            down.lastY = event.clientY;
        }
    };
    const bind = (canvas: HTMLCanvasElement) => {
        if (state.canvas === canvas) return;
        state.controller?.abort();
        state.canvas = canvas;
        state.controller = new AbortController();
        const options = { signal: state.controller.signal };
        canvas.style.touchAction = 'none';
        canvas.addEventListener(
            'pointerdown',
            event => {
                state.moved = false;
                if (!state.enabled || !event.isPrimary || event.button !== 0)
                    return;
                state.down = {
                    x: event.clientX,
                    y: event.clientY,
                    lastX: event.clientX,
                    lastY: event.clientY,
                };
                canvas.setPointerCapture(event.pointerId);
            },
            options
        );
        canvas.addEventListener('pointermove', move, options);
        canvas.addEventListener(
            'pointerup',
            () => {
                state.down = null;
            },
            options
        );
        canvas.addEventListener(
            'pointercancel',
            () => {
                state.down = null;
                state.moved = false;
            },
            options
        );
        // A drag ending on furniture must not activate it or leave a zoom.
        canvas.addEventListener(
            'click',
            event => {
                if (!state.moved) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                state.moved = false;
            },
            { ...options, capture: true }
        );
    };
    const tick = (
        camera: PerspectiveCamera,
        viewport: SurfaceSize,
        frame: LookFrame
    ) => {
        if (state.stage !== frame.stage) {
            state.stage = frame.stage;
            state.yaw = state.pitch = 0;
            state.down = null;
        }
        state.enabled =
            !frame.transitioning && ['outside', 'room'].includes(frame.stage);
        if (state.canvas)
            state.canvas.style.cursor = state.enabled
                ? state.down
                    ? 'grabbing'
                    : 'grab'
                : '';
        if (!state.enabled) return;
        const pose = cameraPose(frame.stage, viewport);
        const offset = pose.position
            .clone()
            .sub(pose.target)
            .applyAxisAngle(new Vector3(0, 1, 0), state.yaw);
        offset.y += state.pitch * 5;
        const position = pose.target.clone().add(offset);
        camera.position.lerp(
            position,
            frame.reduced || frame.paused ? 1 : 1 - Math.exp(-frame.delta * 8)
        );
        if (camera.position.distanceToSquared(position) < 0.00000001)
            camera.position.copy(position);
        camera.lookAt(pose.target);
    };
    return { bind, tick, dispose: () => state.controller?.abort() };
};
