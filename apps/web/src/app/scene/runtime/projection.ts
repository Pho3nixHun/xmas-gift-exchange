import { Matrix4 } from 'three';
import type { Camera, Object3D } from 'three';

export interface SurfaceSize {
    readonly width: number;
    readonly height: number;
}

export const projectPaper = (
    camera: Camera,
    paper: Object3D,
    viewport: SurfaceSize,
    pixels: SurfaceSize,
    world: SurfaceSize = { width: 2, height: 2.8 }
) => {
    paper.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    const surface = new Matrix4().set(
        world.width / pixels.width,
        0,
        0,
        -world.width / 2,
        0,
        -world.height / pixels.height,
        0,
        world.height / 2,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
    );
    const screen = new Matrix4().set(
        viewport.width / 2,
        0,
        0,
        viewport.width / 2,
        0,
        -viewport.height / 2,
        0,
        viewport.height / 2,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
    );
    const matrix = screen
        .multiply(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse)
        .multiply(paper.matrixWorld)
        .multiply(surface);
    return `matrix3d(${matrix.elements.join(',')})`;
};

export const paperSize = (viewport: SurfaceSize): SurfaceSize => ({
    width: Math.max(220, Math.min(400, viewport.width - 32)),
    height: Math.max(220, Math.min(620, viewport.height - 38)),
});
