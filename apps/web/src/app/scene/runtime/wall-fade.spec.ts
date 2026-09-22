import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { createWallFade } from './wall-fade';

const fixture = () => {
    const wall = new Group();
    const shared = new MeshStandardMaterial();
    const surface = new Mesh(new PlaneGeometry(), shared);
    wall.add(surface);
    return { wall, shared, surface, fade: createWallFade(wall) };
};

describe('temporary room walls', () => {
    it('fades in and reverses from its current opacity when leaving', () => {
        const { fade, wall, surface } = fixture();
        expect(wall.visible).toBe(false);
        fade.tick(0.35, true, false);
        expect(wall.visible).toBe(true);
        expect(surface.material.opacity).toBeCloseTo(0.5);
        expect(surface.material.depthWrite).toBe(false);
        fade.tick(0.175, false, false);
        expect(surface.material.opacity).toBeCloseTo(0.25);
        fade.tick(1, false, false);
        expect(wall.visible).toBe(false);
    });
    it('leaves shared permanent-wall materials alone', () => {
        const { fade, surface, shared } = fixture();
        fade.tick(0.35, true, false);
        expect(surface.material).not.toBe(shared);
        expect(shared.opacity).toBe(1);
        expect(shared.transparent).toBe(false);
        fade.tick(0.35, true, false);
        expect(surface.material.depthWrite).toBe(true);
    });
    it('settles immediately for reduced motion and session restoration', () => {
        const { fade, wall, surface } = fixture();
        fade.tick(0, true, true);
        expect(surface.material.opacity).toBe(1);
        fade.tick(0, false, true);
        expect(wall.visible).toBe(false);
        fade.reset(true);
        expect(wall.visible).toBe(true);
        expect(surface.material.opacity).toBe(1);
    });
});
