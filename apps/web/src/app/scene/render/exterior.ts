// Scene construction ported from the approved Winter House model.
import * as T from 'three';

import { fir, lantern, wreath } from './decoration';
import { palette } from './geometry';
import type { Geometry } from './geometry';
import { createGlowField, smokeMotion } from './glow-field';
import { switchable } from './lights';
export const createLandscape = (h: Geometry) => {
    const { rand, mat, geo, group, mesh, box, ball, cylinder, glow } = h;
    // A continuous, quiet landscape beyond the cutaway. Nothing sits between camera and room.
    const p = new T.Group();
    cylinder(p, 0, -0.62, 0, 65, 65, 0.45, 0x759997, 64);
    Array.from({ length: 18 }, (_, index) => index).forEach(i => {
        const a = Math.PI * 0.1 + (i / 17) * Math.PI * 0.85,
            x = Math.cos(a) * 35,
            z = -39 - Math.sin(a) * 14;
        ball(p, x, -1.8, z, 9 + rand() * 7, 3 + rand() * 3, 7, 0x739797, 16);
    });
    Array.from({ length: 34 }, (_, index) => index).forEach(() => {
        const x = (rand() - 0.5) * 65,
            z = -24 - rand() * 24;
        fir(h, p, x, z, 2 + rand() * 4, true);
    });
    // Three staggered streets surround the cottage, with taller roofs at the back.
    Array.from({ length: 27 }, (_, i) => {
        const row = Math.floor(i / 9),
            column = i % 9;
        const x = -29 + column * 7.1 + (row % 2) * 2.8;
        const z = -8 - row * 10 - rand() * 2;
        const home = group(p, x, -0.35, z);
        home.rotation.y = (rand() - 0.5) * 0.45;
        const height = 2.4 + rand() * 1.5,
            width = 2.8 + rand();
        box(
            home,
            0,
            height / 2,
            0,
            width,
            height,
            2.6,
            [0x687f79, 0x8e8277, 0x6c828a][i % 3] ?? 0x687f79
        );
        const roof = mesh(
            home,
            geo('Cone', width * 0.83, 1.8, 4),
            mat(0xc0d0c4),
            0,
            height + 0.85,
            0
        );
        roof.rotation.y = Math.PI / 4;
        box(home, width * 0.27, height + 1.2, -0.4, 0.3, 1.8, 0.35, 0x7e6c60);
        [-0.75, 0.75].forEach(dx => {
            [0.85, height - 0.65].forEach(y => {
                box(
                    home,
                    dx,
                    y,
                    1.32,
                    0.45,
                    0.62,
                    0.045,
                    mat(0xffd394, 0.7, 0, 0xffba64, 1)
                );
                box(
                    home,
                    width / 2 + 0.025,
                    y,
                    dx * 0.8,
                    0.045,
                    0.62,
                    0.45,
                    mat(0xffd394, 0.7, 0, 0xffba64, 1)
                );
            });
        });
        glow(home, 0, 1.3, 1.4, 3.7, 0xffbd72, 0.14);
    });
    const materials = new Map<T.Material, T.MeshBasicMaterial>();
    p.traverse(object => {
        if (
            !(object instanceof T.Mesh) ||
            !(object.material instanceof T.MeshStandardMaterial)
        )
            return;
        const old = object.material;
        const color = old.color.clone();
        if (old.emissiveIntensity > 0) color.lerp(new T.Color(0xffc675), 0.4);
        else color.lerp(new T.Color(0x345b6a), 0.62);
        const material =
            materials.get(old) ?? new T.MeshBasicMaterial({ color });
        materials.set(old, material);
        object.material = material;
        object.castShadow = false;
    });
    return p;
};
export const createOutside = (h: Geometry) => {
    const { rand, mat, group, box, ball, cylinder, tube, glow } = h;
    const p = new T.Group();
    cylinder(p, 0, -0.56, 0, 10.6, 10, 0.7, 0x526b68, 64);
    cylinder(p, 0, -0.18, 0, 10.8, 10.6, 0.24, palette.snow, 64);
    Array.from({ length: 48 }, (_, index) => index).forEach(i => {
        const a = (i / 48) * Math.PI * 2;
        ball(
            p,
            Math.cos(a) * 10.25,
            -0.17,
            Math.sin(a) * 10.25,
            0.8,
            0.19,
            0.65,
            palette.snow
        );
    });
    Array.from({ length: 22 }, (_, index) => index).forEach(i => {
        const z = 3.9 + i * 0.28,
            x = Math.sin(i * 0.13) * 0.9;
        const stone = cylinder(
            p,
            x,
            -0.01,
            z,
            0.45,
            0.44,
            0.06,
            i % 3 === 0 ? 0xb2c6c0 : 0x9cb7b5,
            7
        );
        stone.scale.z = 0.65;
        stone.rotation.y = i * 0.4;
        const print = ball(
            p,
            x + (i % 2 ? 0.16 : -0.16),
            0.035,
            z,
            0.08,
            0.008,
            0.18,
            0x819e9c
        );
        print.rotation.y = -0.08 + i * 0.01;
    });
    (
        [
            [-7, -3, 6],
            [-7.8, 1, 4.5],
            [-6, 5, 4],
            [-4.8, -6, 5.5],
            [5, -6, 6.5],
            [7, -3, 5],
            [8, 2, 4.1],
            [6.5, 6, 3.2],
            [-8.7, -6, 3.6],
            [8, -6, 3.5],
            [-6, 7.2, 2.4],
        ] as const
    ).forEach(([x, z, height]) => {
        fir(h, p, x, z, height, true);
    });
    Array.from({ length: 40 }, (_, index) => index).forEach(() => {
        const a = rand() * Math.PI * 2,
            r = 5 + rand() * 5;
        ball(
            p,
            Math.cos(a) * r,
            -0.03,
            Math.sin(a) * r,
            0.2 + rand() * 0.7,
            0.09 + rand() * 0.16,
            0.2 + rand() * 0.6,
            palette.snow
        );
    });
    ([-1, 1] as const).forEach(sign => {
        Array.from({ length: 6 }, (_, index) => index).forEach(i => {
            const x = sign * (2.5 + i * 0.95),
                z = 6.5;
            box(p, x, 0.55, z, 0.12, 1.25, 0.14, 0x746856);
            ball(p, x, 1.2, z, 0.13, 0.09, 0.13, palette.snow);
            if (i < 5) {
                box(p, x + sign * 0.45, 0.4, z, 0.9, 0.09, 0.08, 0x80725e);
                box(p, x + sign * 0.45, 0.88, z, 0.9, 0.09, 0.08, 0x80725e);
            }
        });
    });
    (
        [
            [-1.65, 5.2],
            [1.5, 7.9],
            [-1.2, 9.3],
        ] as const
    ).forEach(([x, z]) => {
        const lamp = lantern(h, p, x, 0.06, z, 0.62);
        const pool = ball(
            p,
            x,
            0.05,
            z,
            0.8,
            0.035,
            0.65,
            mat(0xf2d8a0, 0.9, 0, 0xe8af60, 0.24)
        );
        lamp.attach(pool);
        pool.userData['lightPool'] = true;
    });
    // Miniature sled beside the entrance.
    const sled = group(p, -3.6, 0.15, 5.25);
    sled.rotation.y = 0.4;
    ([-0.35, 0.35] as const).forEach(x => {
        tube(
            sled,
            [
                [x, 0, 0.8],
                [x, 0, -0.7],
                [x, 0.2, -0.9],
                [x, 0.35, -0.65],
            ],
            0.045,
            0x574b3c
        );
    });
    Array.from({ length: 5 }, (_, index) => index).forEach(i => {
        box(sled, 0, 0.28, -0.5 + i * 0.23, 0.85, 0.08, 0.16, 0x9c5940);
    });
    ball(
        p,
        -15,
        18,
        -20,
        1.25,
        1.25,
        0.5,
        mat(0xffeac5, 0.8, 0, 0xffe3ad, 1.4),
        24
    );
    glow(p, -15, 18, -20, 9, 0xb5d8d8, 0.15);
    const stars = new Float32Array(160 * 3);
    Array.from({ length: 160 }, (_, index) => index).forEach(i => {
        stars[i * 3] = (rand() - 0.5) * 90;
        stars[i * 3 + 1] = 10 + rand() * 25;
        stars[i * 3 + 2] = -25 - rand() * 35;
    });
    const sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.BufferAttribute(stars, 3));
    p.add(
        new T.Points(
            sg,
            new T.PointsMaterial({
                color: 0xffe2b0,
                size: 0.055,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.75,
                depthWrite: false,
            })
        )
    );
    return p;
};
export const createWindowFrame = (
    h: Geometry,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    height: number
    // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
) => {
    const { mat, box, ball, rounded, glow } = h;
    rounded(p, x, y, z, w + 0.18, height + 0.2, 0.13, 0x715839, 0.06);
    box(
        p,
        x,
        y,
        z + 0.08,
        w,
        height,
        0.05,
        mat(0xffd18c, 0.7, 0, 0xffb859, 1.3)
    );
    ([-1, 1] as const).forEach(s => {
        box(p, x + s * w * 0.25, y, z + 0.13, 0.045, height, 0.065, 0x735130);
        box(p, x, y + s * height * 0.17, z + 0.13, w, 0.045, 0.065, 0x735130);
        const shutter = rounded(
            p,
            x + s * (w * 0.7),
            y,
            z - 0.02,
            w * 0.34,
            height + 0.13,
            0.1,
            0x395344,
            0.04
        );
        shutter.rotation.y = -s * 0.2;
        Array.from({ length: 6 }, (_, index) => index).forEach(j => {
            box(
                p,
                x + s * (w * 0.7),
                y - height * 0.41 + j * height * 0.16,
                z + 0.05,
                w * 0.28,
                0.023,
                0.015,
                0x647456
            );
        });
    });
    box(p, x, y - height / 2 - 0.13, z + 0.12, w + 1, 0.14, 0.3, 0x917452);
    ball(
        p,
        x,
        y - height / 2 - 0.04,
        z + 0.2,
        (w + 1) * 0.54,
        0.085,
        0.19,
        palette.snow
    );
    glow(p, x, y, z + 0.2, w * 3, 0xffbc6a, 0.26);
};
export const createHouse = (h: Geometry, scene: T.Object3D) => {
    const {
        rand,
        mat,
        geo,
        group,
        mesh,
        box,
        ball,
        cylinder,
        tube,
        rounded,
        glow,
        glowMap,
    } = h;
    const p = new T.Group(),
        f = group(p),
        r = group(p),
        twinkles: T.Sprite[] = [];
    rounded(p, 0, 0.08, 0, 8.4, 0.3, 7.8, 0x655944, 0.1);
    // Side and back walls; the front is divided around a genuinely open doorway.
    box(p, -4, 1.8, 0, 0.22, 3.6, 7.4, palette.plaster);
    box(p, 4, 1.8, 0, 0.22, 3.6, 7.4, palette.plaster);
    box(p, 0, 1.8, -3.7, 8, 3.6, 0.2, palette.plaster);
    box(f, -2.43, 1.8, 3.7, 3.14, 3.6, 0.22, palette.plaster);
    box(f, 2.43, 1.8, 3.7, 3.14, 3.6, 0.22, palette.plaster);
    box(f, 0, 3.27, 3.7, 1.72, 0.65, 0.22, palette.plaster);
    ([-4, -0.85, 0.85, 4] as const).forEach(x => {
        box(f, x, 1.8, 3.84, 0.15, 3.6, 0.16, palette.wood);
    });
    ([0.23, 3.5] as const).forEach(y => {
        box(f, 0, y, 3.83, 8.1, 0.14, 0.14, palette.wood);
    });
    // Gable and two sloping roof planes, with individually irregular snow pillows.
    const shape = new T.Shape();
    shape.moveTo(-4.2, 0);
    shape.lineTo(4.2, 0);
    shape.lineTo(0, 2.5);
    shape.closePath();
    const gable = new T.ExtrudeGeometry(shape, {
        depth: 7.6,
        bevelEnabled: false,
    });
    mesh(r, gable, mat(palette.plaster), 0, 3.55, -3.8);
    const angle = Math.atan2(2.65, 4.6),
        length = Math.hypot(4.6, 2.65);
    ([-1, 1] as const).forEach(sign => {
        const roof = box(r, sign * 2.3, 4.86, 0, length, 0.2, 8.35, 0x934936);
        roof.rotation.z = -sign * angle;
        const snow = box(
            r,
            sign * 2.3,
            5.02,
            0,
            length,
            0.21,
            8.45,
            palette.snow
        );
        snow.rotation.z = -sign * angle;
        const roofBeam = box(
            r,
            sign * 2.3,
            4.79,
            4.19,
            length,
            0.19,
            0.2,
            palette.darkWood
        );
        roofBeam.rotation.z = -sign * angle;
        Array.from({ length: 22 }, (_, index) => index).forEach(i => {
            const t = i / 21,
                x = sign * t * 4.62,
                y = 6.39 - t * 2.7;
            ball(r, x, y, 4.13, 0.28, 0.14, 0.32, palette.snow);
        });
        Array.from({ length: 22 }, (_, index) => index).forEach(i => {
            ball(
                r,
                sign * 4.6,
                3.7,
                -4.1 + i * 0.39,
                0.26,
                0.14,
                0.35,
                palette.snow
            );
        });
        Array.from({ length: 10 }, (_, index) => index).forEach(i => {
            const z = -3.5 + i * 0.72;
            mesh(
                r,
                geo('Cone', 0.04, 0.18 + rand() * 0.2, 5),
                mat(0xb6d3d4, 0.2),
                sign * 4.65,
                3.54,
                z
            ).rotation.z = Math.PI;
        });
    });
    box(r, 2.6, 5.9, -1.3, 0.74, 2, 0.78, 0x9c6e51);
    box(r, 2.6, 6.94, -1.3, 0.97, 0.2, 1.01, 0xbcbcaf);
    box(r, 2.6, 7.07, -1.3, 1.03, 0.14, 1.07, palette.snow);
    box(r, 2.6, 7.15, -1.3, 0.5, 0.02, 0.54, 0x354344);
    ([-2.5, 2.5] as const).forEach(x => {
        createWindowFrame(h, f, x, 1.85, 3.87, 1.15, 1.5);
    });
    createWindowFrame(h, r, 0, 4.55, 3.86, 0.8, 0.95);
    ([-1, 1] as const).forEach(side => {
        const win = group(p, side * 4.13, 1.9, -0.2);
        win.rotation.y = (side * Math.PI) / 2;
        createWindowFrame(h, win, 0, 0, 0, 1.4, 1.5);
    });
    const doorFrame = rounded(
        f,
        0,
        1.42,
        3.9,
        1.94,
        2.95,
        0.22,
        palette.darkWood,
        0.15
    ); // frame ring is made from rails; clear the opening below.
    doorFrame.visible = false;
    doorFrame.userData['dynamic'] = true;
    ([-0.91, 0.91] as const).forEach(x => {
        box(f, x, 1.45, 3.85, 0.13, 2.9, 0.26, 0x78563b);
    });
    box(f, 0, 2.89, 3.85, 1.95, 0.15, 0.27, 0x78563b);
    const door = group(p, -0.83, 0.12, 3.83, true);
    door.userData['action'] = 'door';
    rounded(door, 0.83, 1.3, 0, 1.65, 2.64, 0.14, 0x924532, 0.1);
    Array.from({ length: 5 }, (_, index) => index).forEach(i => {
        box(door, 0.17 + i * 0.32, 1.3, 0.082, 0.018, 2.45, 0.018, 0x74382c);
    });
    ([0.48, 1.2, 2.14] as const).forEach(y => {
        rounded(door, 0.83, y, 0.09, 1.28, 0.45, 0.035, 0xa15139, 0.04);
    });
    ball(door, 1.47, 1.1, 0.17, 0.075, 0.075, 0.075, mat(0xdcb65d, 0.28, 0.7));
    wreath(h, door, 0.84, 1.91, 0.22, 0.35);
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        rounded(
            p,
            0,
            0.06 - i * 0.04,
            4.1 + i * 0.27,
            2.4 + i * 0.28,
            0.12,
            0.7,
            0x9cac9e,
            0.08
        );
    });
    ([-1.15, 1.15] as const).forEach(x => {
        const g = group(f, x, 2.7, 4.0);
        cylinder(g, 0, -0.15, 0, 0.08, 0.16, 0.2, mat(0xc9a75d, 0.3, 0.6));
        ball(g, 0, -0.28, 0, 0.045, 0.045, 0.045, 0x786441);
        glow(g, 0, -0.12, 0.1, 0.6, 0xffd794, 0.2);
    });
    lantern(h, f, 1.32, 1.88, 4.06, 0.55);
    const bell = group(f, -1.34, 2, 4.0, true);
    bell.userData['action'] = 'bell';
    cylinder(bell, 0, 0, 0, 0.07, 0.16, 0.21, mat(0xdcb26a, 0.3, 0.65));
    ball(bell, 0, -0.13, 0, 0.05, 0.05, 0.05, 0x7a502d);
    // A sagging strand of lights follows the eaves.
    const eaves = group(f, 0, 0, 0, true);
    const wire: number[][] = [];
    Array.from({ length: 48 + 1 }, (_, index) => index).forEach(i => {
        const x = -4.5 + (i / 48) * 9,
            y =
                6.19 -
                Math.abs(x) * 0.57 -
                0.12 -
                Math.sin((i / 48) * Math.PI * 4) * 0.09;
        wire.push([x, y, 4.32]);
        if (i % 2 === 0) {
            ball(
                eaves,
                x,
                y - 0.08,
                4.33,
                0.045,
                0.065,
                0.045,
                mat(0xffd797, 0.3, 0, 0xffb35f, 3)
            );
            if (i % 6 === 0)
                twinkles.push(
                    glow(eaves, x, y - 0.08, 4.38, 0.55, 0xffba67, 0.45)
                );
        }
    });
    tube(eaves, wire, 0.016, 0x7b6746);
    switchable(eaves);
    const smoke = group(scene, 2.6, 7.2, -1.3, true);
    const smokeClock = createGlowField(smoke, {
        map: glowMap,
        color: 0xb1cbd0,
        count: 9,
        speed: 0.11,
        additive: false,
        motion: smokeMotion,
    });
    return {
        house: p,
        front: f,
        roof: r,
        door,
        bell,
        smoke,
        smokeClock,
        twinkles,
    };
};
