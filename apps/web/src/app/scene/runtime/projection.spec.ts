import { Matrix4, Object3D, PerspectiveCamera, Vector4 } from 'three';
import { describe, expect, it } from 'vitest';

import { cameraPose, paperWidth, scenePaperSize } from './poses';
import { projectPaper } from './projection';

describe('paper projection at readable scale', () => {
    it.each([
        { width: 320, height: 600 },
        { width: 1440, height: 800 },
        { width: 390, height: 270 },
    ])(
        'keeps the paper inside $width × $height with the keyboard',
        viewport => {
            const pixels = scenePaperSize(viewport);
            const pose = cameraPose('desk', viewport);
            const camera = new PerspectiveCamera(
                42,
                viewport.width / viewport.height,
                0.1,
                80
            );
            camera.position.copy(pose.position);
            camera.lookAt(pose.target);
            const paper = new Object3D();
            paper.position.copy(pose.target);
            paper.lookAt(camera.position);
            const width = paperWidth('desk'),
                height = (width * pixels.height) / pixels.width;
            const css = projectPaper(camera, paper, viewport, pixels, {
                width,
                height,
            });
            const elements = css.slice(9, -1).split(',').map(Number);
            const matrix = new Matrix4().fromArray(elements);
            const corner = new Vector4(0, 0, 0, 1).applyMatrix4(matrix);
            const opposite = new Vector4(
                pixels.width,
                pixels.height,
                0,
                1
            ).applyMatrix4(matrix);
            expect(corner.x / corner.w).toBeGreaterThan(10);
            expect(corner.y / corner.w).toBeGreaterThan(10);
            expect(opposite.x / opposite.w).toBeLessThan(viewport.width - 10);
            expect(opposite.y / opposite.w).toBeLessThan(viewport.height - 10);
            expect(opposite.x / opposite.w - corner.x / corner.w).toBeCloseTo(
                pixels.width,
                0
            );
        }
    );
});
