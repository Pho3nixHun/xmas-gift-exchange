// Scene construction ported from the approved Winter House model.
import type * as T from 'three';

import { batchStatic } from './geometry';
import type { Geometry } from './geometry';
export const createCat = (h: Geometry, scene: T.Object3D) => {
    const { mat, geo, group, mesh, ball, tube } = h;
    const g = group(scene, -1.25, 0.18, 1.7, true);
    const orange = mat(0xce8b4d),
        dark = mat(0x96532e),
        cream = mat(0xefd5a3);
    const catBody = ball(g, 0, 0.27, 0, 0.32, 0.28, 0.48, orange, 24);
    ball(g, 0, 0.32, 0.27, 0.23, 0.24, 0.23, orange, 20);
    const catHead = group(g, 0, 0.46, 0.38, true);
    const head = catHead;
    const catEyes: T.Group[] = [];
    ball(head, 0, 0, 0, 0.26, 0.24, 0.23, orange, 24);
    ([-1, 1] as const).forEach(s => {
        const ear = mesh(
            head,
            geo('Cone', 0.105, 0.25, 4),
            orange,
            s * 0.16,
            0.2,
            0
        );
        ear.rotation.z = -s * 0.2;
        mesh(
            head,
            geo('Cone', 0.06, 0.15, 4),
            mat(0xd3a382),
            s * 0.16,
            0.2,
            0.04
        ).rotation.z = -s * 0.2;
        ball(head, s * 0.083, -0.057, 0.185, 0.093, 0.072, 0.056, cream);
        const eye = group(head, s * 0.102, 0.04, 0.182, true);
        ball(eye, 0, 0, 0, 0.045, 0.062, 0.027, mat(0x3a4b37), 12);
        ball(eye, s * 0.001, 0, 0.023, 0.014, 0.045, 0.01, 0x1b2722);
        ball(
            eye,
            s * -0.002 + 0.008,
            0.02,
            0.033,
            0.009,
            0.013,
            0.007,
            0xf8e9c7,
            8
        );
        catEyes.push(eye);
        Array.from({ length: 3 }, (_, index) => index).forEach(j => {
            tube(
                head,
                [
                    [s * 0.12, -0.047 - j * 0.02, 0.21],
                    [s * 0.29, -0.045 + (j - 1) * 0.043, 0.23],
                ],
                0.004,
                0x594434
            );
        });
    });
    ball(head, 0, -0.028, 0.235, 0.032, 0.025, 0.019, 0xa57560, 8);
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        const stripe = ball(
            head,
            (i - 1) * 0.075,
            0.156,
            0.14,
            0.024,
            0.067,
            0.012,
            dark
        );
        stripe.rotation.z = (i - 1) * -0.15;
    });
    const catLegs: T.Group[] = [];
    ([0.3, -0.3] as const).forEach(z => {
        ([-0.2, 0.2] as const).forEach(x => {
            const leg = group(g, x, 0.18, z, true);
            ball(leg, 0, -0.07, 0, 0.085, 0.17, 0.095, orange);
            ball(leg, 0, -0.16, 0.04, 0.094, 0.06, 0.13, cream);
            catLegs.push(leg);
        });
    });
    const catTail = group(g, 0, 0.22, -0.45, true);
    tube(
        catTail,
        [
            [0, 0, 0],
            [0.18, 0.1, -0.15],
            [0.38, 0.21, -0.17],
            [0.48, 0.35, -0.05],
            [0.42, 0.45, 0.04],
        ],
        0.064,
        orange
    );
    // Follow the ellipsoid's surface and inherit its breathing/deformation.
    [-0.55, -0.18, 0.2].forEach(z => {
        const radius = Math.sqrt(1 - z * z) * 1.005;
        tube(
            catBody,
            [-1.05, -0.55, 0, 0.55, 1.05].map(angle => [
                Math.sin(angle) * radius,
                Math.cos(angle) * radius,
                z,
            ]),
            0.038,
            dark
        );
    });
    catBody.userData['dynamic'] = true;
    batchStatic(catHead);
    batchStatic(g);
    g.userData['action'] = 'cat';
    g.rotation.y = -0.45;
    g.scale.setScalar(1.15);
    return { cat: g, catBody, catHead, catTail, catEyes, catLegs };
};
