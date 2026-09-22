import {
    BufferGeometry,
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { batchStatic, isGeometry } from './geometry';

describe('static geometry batching', () => {
    it('keeps shadow policies separate even when objects share a material', () => {
        const root = new Group(),
            material = new MeshBasicMaterial(),
            geometry = new BoxGeometry();
        [false, false, true, true].forEach(castShadow => {
            const mesh = new Mesh(geometry, material);
            mesh.castShadow = castShadow;
            root.add(mesh);
        });
        batchStatic(root);
        expect(root.children).toHaveLength(2);
        expect(root.children.map(child => child.castShadow).sort()).toEqual([
            false,
            true,
        ]);
        root.children.forEach(child => {
            expect(child.receiveShadow).toBe(false);
            expect(child.matrixAutoUpdate).toBe(false);
            if (
                child instanceof Mesh &&
                child.geometry instanceof BufferGeometry
            )
                child.geometry.dispose();
        });
        geometry.dispose();
        material.dispose();
    });
    it('merges indexed primitives without expanding their shared vertices', () => {
        const root = new Group(),
            material = new MeshBasicMaterial(),
            geometry = new BoxGeometry();
        const vertices = (item: BufferGeometry) =>
            item.getAttribute('position').count;
        const single = vertices(geometry);
        [0, 1].forEach(x => {
            const mesh = new Mesh(geometry, material);
            mesh.position.x = x;
            root.add(mesh);
        });
        batchStatic(root);
        const merged = root.children.flatMap(child =>
            child instanceof Mesh && isGeometry(child.geometry)
                ? [child.geometry]
                : []
        );
        // Expanding both boxes to non-indexed geometry would report 72 here.
        expect(
            merged.map(item => [vertices(item), item.index !== null])
        ).toEqual([[single * 2, true]]);
        merged.forEach(item => item.dispose());
        geometry.dispose();
        material.dispose();
    });
    it('retains independently moving meshes and nested interaction targets', () => {
        const root = new Group(),
            geometry = new BoxGeometry(),
            material = new MeshBasicMaterial();
        const body = new Mesh(geometry, material),
            target = new Group();
        body.userData['dynamic'] = true;
        target.userData['action'] = 'lights';
        const bulb = new Mesh(geometry, material);
        target.add(bulb);
        root.add(
            body,
            target,
            new Mesh(geometry, material),
            new Mesh(geometry, material)
        );
        batchStatic(root);
        expect(body.parent).toBe(root);
        expect(bulb.parent).toBe(target);
        expect(root.children).toHaveLength(3);
        root.children.forEach(child => {
            if (
                child instanceof Mesh &&
                child !== body &&
                child.geometry instanceof BufferGeometry
            )
                child.geometry.dispose();
        });
        geometry.dispose();
        material.dispose();
    });
});
