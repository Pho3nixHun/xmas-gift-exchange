import type { PerspectiveCamera, Scene } from 'three';
import {
    CatmullRomCurve3,
    Color,
    Euler,
    FogExp2,
    MathUtils,
    Quaternion,
} from 'three';

import { readingPaper } from '../../core/house-scene';
import type { HouseStage } from '../../core/house-scene';
import { V } from '../render/geometry';
import type { HouseModel } from '../render/house-model';

import { lightDesk } from './atmosphere';
import { createMotion } from './motion';
import { cameraPose, ease, paperWidth, scenePaperSize } from './poses';
import type { SurfaceSize } from './projection';
import { createWallFade } from './wall-fade';

export const createDirector = (
    model: HouseModel,
    settled: () => void,
    cardIndex: () => number = () => 0,
    switchSound: () => void = () => undefined,
    knockSound: () => void = () => undefined
) => {
    const motion = createMotion();
    const rightWall = createWallFade(model.rightWall);
    const notesWall = createWallFade(model.notesWall);
    const state: {
        stage: HouseStage;
        initialized: boolean;
        target: ReturnType<typeof V>;
        lamp: number;
        seated: boolean;
        lampOn: boolean;
    } = {
        stage: 'outside',
        initialized: false,
        target: V(),
        lamp: 0,
        seated: false,
        lampOn: false,
    };
    const inside = (scene: Scene) => {
        model.outside.visible = false;
        model.house.visible = false;
        model.smoke.visible = false;
        model.room.visible = true;
        model.cat.visible = true;
        scene.background = new Color(0x28494f);
        scene.fog = new FogExp2(0x28494f, 0.014);
        model.hemi.intensity = 1.6;
        model.hemi.color.set(0xe8d6b2);
        model.moon.intensity = 2.2;
        model.moon.color.set(0xffd6a2);
        model.snowMaterial.uniforms.inside.value = 1;
    };
    const configurePaper = (stage: HouseStage, viewport: SurfaceSize) => {
        const pixels = scenePaperSize(viewport),
            width = paperWidth(stage),
            height = (width * pixels.height) / pixels.width,
            scale = width / 2.15;
        model.stack.children.forEach((sheet, i) => {
            sheet.scale.set(width, height, 0.012 * scale);
            sheet.position.set(
                (i % 2 ? 1 : -1) * i * 0.016 * scale,
                -i * 0.012 * scale,
                -i * 0.018 * scale
            );
        });
        return { width, height };
    };
    const placePaper = (camera: PerspectiveCamera, viewport: SurfaceSize) => {
        const pose = cameraPose(state.stage, viewport);
        configurePaper(state.stage, viewport);
        model.stack.position.copy(pose.target);
        model.stack.lookAt(camera.position);
        model.stack.rotateY(-0.025);
        model.stack.rotateZ(-0.018);
    };
    const travel = (
        stage: HouseStage,
        camera: PerspectiveCamera,
        viewport: SurfaceSize
    ) => {
        const knock = { played: false };
        const pose = cameraPose(stage, viewport),
            from = camera.position.clone(),
            look = state.target.clone(),
            fov = camera.fov;
        const route =
            stage === 'desk'
                ? new CatmullRomCurve3([
                      from,
                      V(4.4, 2.9, 5.2),
                      V(2.15, 2.25, 3.95),
                      pose.position,
                  ])
                : null;
        return {
            duration: stage === 'desk' ? 2.6 : stage === 'door' ? 2.4 : 1.55,
            update: (t: number) => {
                const e = ease(t);
                if (route) camera.position.copy(route.getPoint(e));
                else camera.position.lerpVectors(from, pose.position, e);
                state.target.lerpVectors(look, pose.target, e);
                camera.fov = MathUtils.lerp(fov, pose.fov, e);
                camera.updateProjectionMatrix();
                camera.lookAt(state.target);
                // Follow the camera rather than a timer, including reduced
                // motion: knock once when the approach is nearly complete.
                if (stage === 'door' && t >= 0.85 && !knock.played) {
                    knock.played = true;
                    knockSound();
                }
            },
        };
    };
    const enter = (
        scene: Scene,
        camera: PerspectiveCamera,
        viewport: SurfaceSize
    ) => {
        model.room.visible = true;
        model.cat.visible = true;
        const from = camera.position.clone(),
            look = state.target.clone(),
            through = V(0, 1.65, 3.15),
            room = cameraPose('room', viewport);
        return [
            {
                duration: 0.9,
                update: (t: number) => {
                    model.door.rotation.y = -ease(t) * Math.PI * 0.63;
                },
            },
            {
                duration: 1.5,
                update: (t: number) => {
                    camera.position.lerpVectors(from, through, ease(t));
                    state.target.lerpVectors(look, V(0, 1.45, -2), ease(t));
                    camera.lookAt(state.target);
                },
            },
            {
                duration: 1.55,
                update: (t: number) => {
                    inside(scene);
                    camera.position.lerpVectors(
                        through,
                        room.position,
                        ease(t)
                    );
                    state.target.lerpVectors(
                        V(0, 1.45, -2),
                        room.target,
                        ease(t)
                    );
                    camera.fov = room.fov;
                    camera.updateProjectionMatrix();
                    camera.lookAt(state.target);
                },
            },
        ];
    };
    const initialize = (
        stage: HouseStage,
        camera: PerspectiveCamera,
        scene: Scene,
        viewport: SurfaceSize
    ) => {
        motion.run([]);
        state.seated = stage === 'desk';
        rightWall.reset(state.seated);
        notesWall.reset(stage === 'letters' || stage === 'notes');
        state.initialized = true;
        state.stage = stage;
        if (stage !== 'outside' && stage !== 'door') inside(scene);
        else {
            model.outside.visible = true;
            model.house.visible = true;
            model.smoke.visible = true;
            model.room.visible = false;
            model.cat.visible = false;
            model.door.rotation.y = 0;
            model.stack.visible = false;
            model.snowMaterial.uniforms.inside.value = 0;
            scene.background = new Color(0x122e39);
            scene.fog = new FogExp2(0x173943, 0.009);
        }
        const pose = cameraPose(stage, viewport);
        camera.position.copy(pose.position);
        state.target.copy(pose.target);
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
        camera.lookAt(state.target);
        if (readingPaper(stage)) {
            placePaper(camera, viewport);
            model.stack.visible = true;
        }
        settled();
    };
    const journey = (
        stage: HouseStage,
        camera: PerspectiveCamera,
        viewport: SurfaceSize
    ) => {
        const paper = readingPaper(stage);
        // Prepare the paper's final orientation using its destination camera.
        const pose = cameraPose(stage, viewport);
        model.stack.position.copy(pose.target);
        model.stack.lookAt(pose.position);
        model.stack.rotateY(-0.025);
        model.stack.rotateZ(-0.018);
        const steps = [travel(stage, camera, viewport)];
        if (paper) {
            const orientation = model.stack.quaternion.clone(),
                source =
                    stage === 'desk'
                        ? V(2.06, 1.39, 2.12)
                        : stage === 'notes'
                          ? model.letters.localToWorld(
                                V(
                                    ((126 + (cardIndex() % 2) * 228) / 480 -
                                        0.5) *
                                        1.91,
                                    (0.5 -
                                        (74.125 +
                                            Math.floor(cardIndex() / 2) *
                                                122.25) /
                                            580) *
                                        2.32,
                                    0.14
                                )
                            )
                          : V(-2.55, 2.72, -2.57),
                flat = new Quaternion().setFromEuler(
                    new Euler(stage === 'desk' ? -Math.PI / 2 : 0, 0, -0.08)
                );
            const lift = {
                duration: stage === 'recipient' ? 0.95 : 1.1,
                update: (t: number) => {
                    configurePaper(stage, viewport);
                    model.stack.visible = true;
                    model.stack.scale.setScalar(
                        stage === 'desk'
                            ? 1
                            : (stage === 'notes' ? 0.3 : 0.4) +
                                  (stage === 'notes' ? 0.7 : 0.6) * ease(t)
                    );
                    if (stage === 'desk') {
                        state.seated = true;
                    }
                    model.stack.position.lerpVectors(
                        source,
                        pose.target,
                        ease(t)
                    );
                    if (stage === 'desk')
                        model.stack.position.y += Math.sin(t * Math.PI) * 0.035;
                    model.stack.quaternion.slerpQuaternions(
                        flat,
                        orientation,
                        ease(t)
                    );
                },
            };
            if (stage === 'notes') {
                const cameraTravel = steps[0];
                steps.splice(0, 1, {
                    duration: 1.55,
                    update: t => {
                        cameraTravel?.update(t);
                        lift.update(Math.min(1, (t * 1.55) / 1.4));
                    },
                });
            } else steps.push(lift);
        }
        return steps;
    };
    // Renderer-owned camera changes stay independent of ambient pause.
    const sync = (
        stage: HouseStage,
        camera: PerspectiveCamera,
        scene: Scene,
        viewport: SurfaceSize
    ) => {
        if (!state.initialized) {
            initialize(stage, camera, scene, viewport);
            return;
        }
        if (stage === state.stage) return;
        if (stage === 'outside') {
            initialize(stage, camera, scene, viewport);
            return;
        }
        const previous = state.stage;
        if (
            ['outside', 'door'].includes(previous) &&
            !['door', 'room'].includes(stage)
        )
            inside(scene);
        state.stage = stage;
        model.stack.visible = false;
        state.seated = false;
        model.stack.scale.setScalar(1);
        if (previous === 'outside' && stage !== 'door') inside(scene);
        if (stage === 'room' && previous === 'door') {
            motion.run([
                ...enter(scene, camera, viewport),
                { duration: 0.001, update: settled },
            ]);
            return;
        }
        const steps = journey(stage, camera, viewport);
        steps.push({ duration: 0.001, update: settled });
        motion.run(steps);
    };
    const tick = (
        delta: number,
        reduced: boolean,
        camera: PerspectiveCamera
    ) => {
        motion.tick(delta, reduced);
        // Fade while approaching, once the camera is inside each cutaway plane.
        // The desk lamp still waits until the separate sitting sequence finishes.
        rightWall.tick(
            delta,
            state.stage === 'desk' && camera.position.x < 3.9,
            reduced
        );
        notesWall.tick(
            delta,
            (state.stage === 'letters' || state.stage === 'notes') &&
                camera.position.z < 3.7,
            reduced
        );
        if (state.lampOn !== state.seated) {
            state.lampOn = state.seated;
            switchSound();
        }
        state.lamp = reduced
            ? state.seated
                ? 1
                : 0
            : MathUtils.lerp(
                  state.lamp,
                  state.seated ? 1 : 0,
                  1 - Math.exp(-delta * 9)
              );
        lightDesk(model, state.lamp);
    };
    const resize = (camera: PerspectiveCamera, viewport: SurfaceSize) => {
        if (motion.active()) return;
        const pose = cameraPose(state.stage, viewport);
        camera.position.copy(pose.position);
        state.target.copy(pose.target);
        camera.fov = pose.fov;
        camera.updateProjectionMatrix();
        camera.lookAt(state.target);
        if (readingPaper(state.stage)) placePaper(camera, viewport);
    };
    return { sync, tick, resize, active: motion.active, configurePaper };
};
