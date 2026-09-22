import { MathUtils, Mesh, MeshStandardMaterial } from 'three';
import type { Object3D } from 'three';

// Wall materials are private so a fade cannot affect the permanent room.
export const createWallFade = (wall: Object3D) => {
    const materials: MeshStandardMaterial[] = [];
    wall.traverse(object => {
        if (
            !(object instanceof Mesh) ||
            !(object.material instanceof MeshStandardMaterial)
        )
            return;
        const material = object.material.clone();
        material.transparent = true;
        material.opacity = 0;
        material.depthWrite = false;
        object.material = material;
        object.castShadow = false;
        materials.push(material);
    });
    const state = { opacity: 0 };
    const apply = (opacity: number) => {
        state.opacity = opacity;
        wall.visible = opacity > 0;
        materials.forEach(material => {
            material.opacity = opacity;
            material.depthWrite = opacity === 1;
        });
    };
    apply(0);
    return {
        reset: (shown: boolean) => apply(shown ? 1 : 0),
        tick: (delta: number, shown: boolean, reduced: boolean) => {
            const destination = shown ? 1 : 0;
            apply(
                reduced
                    ? destination
                    : MathUtils.clamp(
                          state.opacity +
                              ((shown ? 1 : -1) * Math.max(0, delta)) / 0.7,
                          0,
                          1
                      )
            );
        },
    };
};
