// Scene construction ported from the approved Winter House model.
import type * as T from 'three';

import { palette } from './geometry';
import type { Geometry } from './geometry';
import { switchable } from './lights';
export const fir = (
    h: Geometry,
    parent: T.Object3D,
    x: number,
    z: number,
    height: number,
    snow = true
    // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
) => {
    const { mat, geo, group, mesh, cylinder } = h;
    const g = group(parent, x, 0, z);
    cylinder(g, 0, height * 0.15, 0, 0.09, 0.15, height * 0.3, palette.wood);
    Array.from({ length: 5 }, (_, index) => index).forEach(i => {
        const r = height * (0.25 - i * 0.041),
            h = height * 0.34,
            y = height * (0.24 + i * 0.145);
        const m = mesh(
            g,
            geo('Cone', r, h, 9),
            mat(i % 2 ? 0x2e5748 : 0x234b3f),
            0,
            y,
            0
        );
        m.rotation.y = i * 0.8;
        if (snow) {
            const cap = mesh(
                g,
                geo('Cone', r * 0.85, h * 0.76, 9),
                mat(palette.snow),
                0,
                y + h * 0.18,
                0
            );
            cap.rotation.y = i * 0.8;
        }
    });
    return g;
};
export const gift = (
    h: Geometry,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    color: number,
    ribbon = 0xdcb980
    // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
) => {
    const { mat, geo, group, mesh, box, rounded } = h;
    const g = group(p, x, y, z);
    rounded(g, 0, w * 0.43, 0, w, w * 0.83, w * 0.82, color, 0.06);
    box(g, 0, w * 0.44, 0, w * 0.13, w * 0.85, w * 0.84, ribbon);
    box(g, 0, w * 0.44, 0, w * 1.01, w * 0.12, w * 0.84, ribbon);
    rounded(g, 0, w * 0.88, 0, w * 1.06, w * 0.12, w * 0.9, color, 0.035);
    ([-1, 1] as const).forEach(sign => {
        const bow = mesh(
            g,
            geo('Torus', w * 0.15, w * 0.028, 5, 12),
            mat(ribbon),
            sign * w * 0.12,
            w * 1.02,
            0
        );
        bow.rotation.x = Math.PI / 2;
        bow.rotation.y = sign * 0.4;
        bow.scale.set(1, 0.55, 1);
    });
    return g;
};
export const lantern = (
    h: Geometry,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    size = 0.5
    // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
) => {
    const { mat, geo, group, mesh, box, cylinder, glow } = h;
    const g = group(p, x, y, z);
    box(
        g,
        0,
        size * 0.45,
        0,
        size * 0.47,
        size * 0.8,
        size * 0.47,
        mat(0xffce7b, 0.6, 0, 0xffae4b, 2.7)
    );
    ([-1, 1] as const).forEach(a => {
        ([-1, 1] as const).forEach(b => {
            box(
                g,
                a * size * 0.26,
                size * 0.45,
                b * size * 0.26,
                size * 0.06,
                size * 0.9,
                size * 0.06,
                0x4d4231
            );
        });
    });
    cylinder(
        g,
        0,
        size * 0.94,
        0,
        size * 0.12,
        size * 0.4,
        size * 0.3,
        0x4d4231,
        4
    ).rotation.y = Math.PI / 4;
    cylinder(
        g,
        0,
        0,
        0,
        size * 0.4,
        size * 0.4,
        size * 0.07,
        0x4d4231,
        4
    ).rotation.y = Math.PI / 4;
    mesh(
        g,
        geo('Torus', size * 0.14, size * 0.025, 5, 12),
        mat(0x463c2d),
        0,
        size * 1.2,
        0
    );
    glow(g, 0, size * 0.48, 0, size * 3, 0xffb961, 0.4);
    switchable(g);
    return g;
};
export const wreath = (
    h: Geometry,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    size = 0.5
    // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
) => {
    const { group, box, ball } = h;
    const g = group(p, x, y, z);
    Array.from({ length: 20 }, (_, index) => index).forEach(i => {
        const a = (i / 20) * Math.PI * 2;
        ball(
            g,
            Math.cos(a) * size,
            Math.sin(a) * size,
            0,
            size * 0.25,
            size * 0.24,
            size * 0.2,
            i % 2 ? 0x355b3e : 0x264b33
        );
        if (i % 4 === 0)
            ball(
                g,
                Math.cos(a) * size,
                Math.sin(a) * size,
                0.1,
                size * 0.075,
                size * 0.075,
                size * 0.075,
                0xad4531
            );
    });
    const bow1 = ball(
        g,
        -size * 0.18,
        -size * 0.9,
        0.15,
        size * 0.3,
        size * 0.15,
        size * 0.09,
        0xa94432
    );
    bow1.rotation.z = -0.3;
    const bow2 = ball(
        g,
        size * 0.18,
        -size * 0.9,
        0.15,
        size * 0.3,
        size * 0.15,
        size * 0.09,
        0xa94432
    );
    bow2.rotation.z = 0.3;
    box(
        g,
        -size * 0.12,
        -size * 1.13,
        0.12,
        size * 0.12,
        size * 0.5,
        0.03,
        0xa94432
    ).rotation.z = -0.2;
    box(
        g,
        size * 0.12,
        -size * 1.13,
        0.12,
        size * 0.12,
        size * 0.5,
        0.03,
        0xa94432
    ).rotation.z = 0.2;
    return g;
};
