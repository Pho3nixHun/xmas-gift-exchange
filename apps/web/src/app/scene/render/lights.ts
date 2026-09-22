import { Mesh, MeshStandardMaterial, Sprite } from 'three';
import type { Object3D } from 'three';

// Each switch owns its emissive materials; other lamps keep their own state.
export const switchable = (root: Object3D) => {
    root.userData['action'] = 'lights';
    root.userData['dynamic'] = true;
    root.traverse(object => {
        if (
            object instanceof Mesh &&
            object.material instanceof MeshStandardMaterial &&
            object.material.emissiveIntensity > 0
        ) {
            const material = object.material.clone();
            object.material = material;
            object.userData['lightLevel'] = material.emissiveIntensity;
        }
        if (object instanceof Sprite) {
            object.material = object.material.clone();
            object.userData['lightLevel'] = object.material.opacity;
        }
    });
    return root;
};
export const toggleLight = (root: Object3D) => {
    const off = root.userData['switchedOff'] !== true;
    root.userData['switchedOff'] = off;
    root.traverse(object => {
        if (object.userData['lightPool'] === true) object.visible = !off;
        const level: unknown = object.userData['lightLevel'];
        if (typeof level !== 'number') return;
        object.userData['switchedOff'] = off;
        if (
            object instanceof Mesh &&
            object.material instanceof MeshStandardMaterial
        )
            object.material.emissiveIntensity = off ? 0 : level;
        if (object instanceof Sprite) object.material.opacity = off ? 0 : level;
    });
};
