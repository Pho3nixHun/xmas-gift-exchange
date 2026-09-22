import type * as T from 'three';

import { batchStatic } from './geometry';
import type { Geometry } from './geometry';

export const createOrnaments = (h: Geometry, parent: T.Group) => {
    const finishes = [0xb52e46, 0x8650be, 0x2884c5, 0xe0b86c] as const;
    const positions = [
        [-0.27, 3, 0.48],
        [0.28, 2.72, 0.59],
        [-0.57, 2.18, 0.72],
        [0.16, 2.12, 0.86],
        [0.66, 1.65, 0.84],
        [-0.6, 1.23, 0.95],
        [0.08, 0.92, 1.13],
    ] as const;
    return positions.map(([x, y, z], index) => {
        const color = finishes[index % finishes.length] ?? finishes[0];
        const group = h.group(parent, x, y, z, true);
        group.userData['action'] = 'ornament';
        group.userData['index'] = index;
        const body = h.ball(
            group,
            0,
            0,
            0,
            0.135,
            0.15,
            0.135,
            h.mat(color, 0.22 + index * 0.0001, 0.45, color, 0.24),
            16
        );
        h.cylinder(group, 0, 0.164, 0, 0.035, 0.039, 0.042, 0xc7a56a, 8);
        h.mesh(
            group,
            h.geo('Torus', 0.025, 0.007, 4, 9),
            h.mat(0xc7a56a),
            0,
            0.203,
            0
        );
        Array.from({ length: 6 }, (_, i) => {
            const spoke = h.box(
                group,
                0,
                0,
                0.133,
                0.011,
                0.105,
                0.008,
                0xf7e6bc
            );
            spoke.rotation.z = (i / 6) * Math.PI;
        });
        const aura = h.glow(group, 0, 0, 0.015, 0.85, color, 0.38);
        batchStatic(group);
        return { group, body, aura, index, homeY: y };
    });
};
