import { Vector3 } from 'three';

import type { HouseStage } from '../../core/house-scene';

import type { SurfaceSize } from './projection';

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const scenePaperSize = (viewport: SurfaceSize): SurfaceSize => ({
    width: Math.min(400, Math.max(220, viewport.width - 32)),
    height: Math.max(120, Math.min(620, viewport.height - 170)),
});
export const paperWidth = (stage: HouseStage) =>
    stage === 'desk' ? 0.37 : stage === 'notes' ? 2.15 : 0.9;
export const cameraPose = (stage: HouseStage, viewport: SurfaceSize) => {
    const mobile = viewport.width < 650,
        aspect = viewport.width / viewport.height;
    const roomTarget = v(0, 1.45, 0.15),
        roomDirection = mobile
            ? v(0.38, 0.6, 1).normalize()
            : v(0.43, 0.48, 1).normalize();
    const pixels = scenePaperSize(viewport),
        paperTarget = getPaperTarget(stage);
    const distance =
        (paperWidth(stage) * viewport.height) /
        (2 * Math.tan((42 * Math.PI) / 360) * pixels.width);
    const paperDirection =
        stage === 'desk'
            ? v(0, 0.16, 1).normalize()
            : stage === 'notes'
              ? v(1, 0.04, 0.16).normalize()
              : v(0.16, 0.04, 1).normalize();
    const poses = {
        outside: {
            position: mobile ? v(18, 16, 28) : v(17, 11, 22),
            target: mobile ? v(0, 1.3, 0) : v(-3, 1.1, 1.2),
            fov: mobile ? 44 : 40,
        },
        door: {
            position: mobile ? v(0.8, 3.3, 13) : v(1.2, 2.55, 9.8),
            target: mobile ? v(0, 0.5, 3.7) : v(-1.35, 1.7, 3.7),
            fov: 43,
        },
        room: {
            position: roomTarget
                .clone()
                .addScaledVector(roomDirection, Math.max(11.7, 13.6 / aspect)),
            target: roomTarget,
            fov: 43,
        },
        tree: {
            position: mobile ? v(5.2, 4.8, 8.3) : v(6.7, 4.1, 6.7),
            target: v(2.5, 2, -1.15),
            fov: mobile ? 41 : 42,
        },
        letters: {
            position: v(-3.6 + Math.max(4.7, 2.9 / aspect), 2.2, 2.1),
            target: v(-3.65, 2.05, 1.7),
            fov: 44,
        },
        desk: {
            position: paperTarget
                .clone()
                .addScaledVector(paperDirection, distance),
            target: paperTarget,
            fov: 42,
        },
        recipient: {
            position: paperTarget
                .clone()
                .addScaledVector(paperDirection, distance),
            target: paperTarget,
            fov: 42,
        },
        notes: {
            position: paperTarget
                .clone()
                .addScaledVector(paperDirection, distance),
            target: paperTarget,
            fov: 42,
        },
    };
    return poses[stage];
};
export const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const getPaperTarget = (stage: HouseStage) =>
    stage === 'desk'
        ? v(2, 1.74, 2.22)
        : stage === 'notes'
          ? v(-2.55, 2.08, 1.7)
          : v(-2.55, 2.72, -2.23);
