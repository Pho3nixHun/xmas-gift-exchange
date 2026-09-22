import { MeshBasicMaterial } from 'three';
import type { Object3D } from 'three';

import type { Geometry } from './geometry';

export const createStarBurst = (h: Geometry, parent: Object3D) => {
    const starBurst = h.group(parent, 0, 0, 0, true);
    starBurst.visible = false;
    const starBurstMaterial = new MeshBasicMaterial({
        color: 0xffde83,
        transparent: true,
        depthWrite: false,
    });
    Array.from({ length: 24 }, () => {
        const spike = h.mesh(
            starBurst,
            h.geo('Cone', 0.035, 0.24, 5),
            starBurstMaterial
        );
        spike.castShadow = false;
    });
    return { starBurst, starBurstMaterial };
};
