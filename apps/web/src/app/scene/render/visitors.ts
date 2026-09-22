import * as T from 'three';

import { batchStatic, shader } from './geometry';
import type { Geometry } from './geometry';
export const createSnow = (h: Geometry, mobile: boolean) => {
    const { rand } = h;
    const count = mobile ? 420 : 850,
        positions = new Float32Array(count * 3),
        sizes = new Float32Array(count),
        phases = new Float32Array(count);
    Array.from({ length: count }, (_, index) => index).forEach(i => {
        positions[i * 3] = (rand() - 0.5) * 35;
        positions[i * 3 + 1] = rand() * 19;
        positions[i * 3 + 2] = (rand() - 0.5) * 32;
        sizes[i] = 0.5 + rand();
        phases[i] = rand() * 6.28;
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(positions, 3));
    g.setAttribute('aSize', new T.BufferAttribute(sizes, 1));
    g.setAttribute('aPhase', new T.BufferAttribute(phases, 1));
    const snowMaterial = shader({
        uniforms: {
            time: { value: 0 },
            ratio: { value: Math.min(devicePixelRatio, 1.5) },
            inside: { value: 0 },
        },
        vertexShader: `attribute float aSize;attribute float aPhase;uniform float time;uniform float ratio;uniform float inside;varying float vAlpha;void main(){vec3 p=position;p.y=mod(position.y-time*(.35+aSize*.25),19.);p.x+=sin(time*.28+aPhase+p.y*.2)*.5;p.z+=cos(time*.2+aPhase)*.25;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*60.*ratio/max(1.,-mv.z),1.,7.);vAlpha=(.35+aSize*.25)*(1.-inside*step(abs(p.x),4.5)*step(abs(p.z),4.5));}`,
        fragmentShader: `varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.12,.5,d))*vAlpha;gl_FragColor=vec4(.86,.94,.92,a);}`,
        transparent: true,
        depthWrite: false,
    });
    const snow = new T.Points(g, snowMaterial);
    return { snow, snowMaterial };
};
export const createVisitors = (h: Geometry, scene: T.Object3D) => {
    const { mat, geo, group, mesh, box, ball, cylinder, tube, rounded, glow } =
        h;
    // These visitors are scenery only: no hit targets, new textures, or timers.
    const snowman = group(scene, 0, 0, 7, true);
    ball(snowman, 0, 0.57, 0, 0.5, 0.56, 0.46, 0xe1efeb);
    ball(snowman, 0, 1.2, 0, 0.36, 0.38, 0.34, 0xe1efeb);
    ball(snowman, 0, 1.72, 0, 0.27, 0.28, 0.26, 0xe1efeb);
    ([-0.09, 0.09] as const).forEach(x => {
        ball(snowman, x, 1.79, 0.23, 0.028, 0.032, 0.025, 0x293b3a, 8);
    });
    const nose = mesh(
        snowman,
        geo('Cone', 0.055, 0.27, 8),
        mat(0xcf7a39),
        0,
        1.71,
        0.32
    );
    nose.rotation.x = Math.PI / 2;
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        ball(
            snowman,
            0,
            0.96 + i * 0.18,
            0.335,
            0.03,
            0.03,
            0.022,
            0x35423a,
            8
        );
    });
    cylinder(snowman, 0, 1.96, 0, 0.36, 0.36, 0.06, 0x293e3c);
    cylinder(snowman, 0, 2.12, 0, 0.22, 0.24, 0.29, 0x293e3c);
    cylinder(snowman, 0, 2.02, 0, 0.245, 0.245, 0.06, 0xa4493a);
    cylinder(snowman, 0, 1.47, 0, 0.29, 0.3, 0.12, 0xa4493a);
    box(snowman, 0.14, 1.22, 0.34, 0.14, 0.5, 0.055, 0xa4493a).rotation.z =
        0.12;
    const snowArms: T.Group[] = [];
    const snowFeet: T.Mesh<T.BufferGeometry, T.Material>[] = [];
    ([-1, 1] as const).forEach(sign => {
        const arm = group(snowman, sign * 0.32, 1.25, 0, true);
        tube(
            arm,
            [
                [0, 0, 0],
                [sign * 0.34, 0.12, 0],
                [sign * 0.5, 0.32, 0.04],
            ],
            0.026,
            0x725138
        );
        tube(
            arm,
            [
                [sign * 0.35, 0.13, 0],
                [sign * 0.55, 0.13, 0],
            ],
            0.018,
            0x725138
        );
        snowArms.push(arm);
        snowFeet.push(
            ball(snowman, sign * 0.24, 0.12, 0.12, 0.2, 0.13, 0.29, 0x52676a)
        );
    });
    batchStatic(snowman);
    const flyingSnow = group(scene, 0, 0, 0, true);
    Array.from({ length: 2 }, (_, index) => index).forEach(() => {
        ball(flyingSnow, 0, 0, 0, 0.18, 0.18, 0.18, 0xdceeed);
    });
    const sleigh = group(scene, 0, 12, -20, true);
    rounded(sleigh, 0, 0, 0, 1.6, 0.35, 0.7, 0x973c31, 0.08);
    box(sleigh, 0.65, 0.4, 0, 0.15, 0.8, 0.72, 0x973c31);
    ([-0.34, 0.34] as const).forEach(z => {
        tube(
            sleigh,
            [
                [-1, -0.4, z],
                [0.7, -0.4, z],
                [1, -0.1, z],
            ],
            0.045,
            0xccab68
        );
    });
    ball(sleigh, 0.1, 0.55, 0, 0.32, 0.45, 0.3, 0xb34c39);
    ball(sleigh, 0.08, 1.03, 0.06, 0.2, 0.21, 0.2, 0xe6cda5);
    ball(sleigh, -0.06, 0.96, 0.12, 0.18, 0.18, 0.18, 0xede0c4);
    mesh(
        sleigh,
        geo('Cone', 0.22, 0.45, 10),
        mat(0xb34c39),
        0.13,
        1.34,
        0
    ).rotation.z = -0.3;
    ball(sleigh, 0.21, 1.56, 0, 0.07, 0.07, 0.07, 0xf1e5cc);
    ([-2, -3.5] as const).forEach(x => {
        ball(sleigh, x, 0.35, 0, 0.45, 0.23, 0.2, 0x79583e);
        ball(sleigh, x - 0.36, 0.64, 0, 0.16, 0.26, 0.15, 0x79583e);
        ([-1, 1] as const).forEach(sign => {
            tube(
                sleigh,
                [
                    [x - 0.36, 0.8, sign * 0.09],
                    [x - 0.4, 1.2, sign * 0.16],
                    [x - 0.65, 1.35, sign * 0.18],
                ],
                0.024,
                0xb7986b
            );
            ([-0.23, 0.23] as const).forEach(dx => {
                box(
                    sleigh,
                    x + dx,
                    0.03,
                    sign * 0.14,
                    0.045,
                    0.6,
                    0.045,
                    0x79583e
                );
            });
        });
        tube(
            sleigh,
            [
                [x + 0.4, 0.3, 0],
                [x + 1.5, 0.12, 0],
            ],
            0.012,
            0xd2b57a
        );
    });
    glow(sleigh, -4.04, 0.66, 0.04, 0.35, 0xff6747, 0.9);
    batchStatic(sleigh);
    // Keep the distant silhouette legible in the night sky, without shadows on the room.
    sleigh.children.forEach(child => {
        child.position.x += 1.5;
        // Batched meshes freeze their local matrices; move them with the face
        // and beard so every part of Santa shares the same flight origin.
        child.updateMatrix();
    });
    sleigh.traverse(object => {
        if (
            !(object instanceof T.Mesh) ||
            !(object.material instanceof T.MeshStandardMaterial)
        )
            return;
        object.castShadow = false;
        object.receiveShadow = false;
        const material = object.material.clone();
        material.fog = false;
        material.emissive.copy(material.color);
        material.emissiveIntensity = 0.35;
        object.material = material;
    });
    const shootingStar = group(scene, 0, 0, 0, true);
    const starTrailMaterial = shader({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { opacity: { value: 0 } },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform float opacity;void main(){float edge=exp(-pow((vUv.y-.5)*7.,2.));float tail=pow(vUv.x,1.7);gl_FragColor=vec4(1.,.83,.48,edge*tail*opacity);}`,
    });
    const trail = mesh(
        shootingStar,
        new T.PlaneGeometry(150, 13),
        starTrailMaterial,
        -75,
        0,
        0
    );
    trail.castShadow = false;
    trail.receiveShadow = false;
    const starHalo = glow(shootingStar, 0, 0, 0.02, 30, 0xffe8aa, 1);
    starHalo.material.fog = false;
    const starCore = glow(shootingStar, 0, 0, 0.03, 14, 0xffffff, 1);
    starCore.material.fog = false;
    const starPoint = ball(
        shootingStar,
        0,
        0,
        0.05,
        2.2,
        2.2,
        0.3,
        new T.MeshBasicMaterial({
            color: 0xfff9de,
            transparent: true,
            depthWrite: false,
            fog: false,
        }),
        8
    );
    starPoint.castShadow = false;
    starPoint.receiveShadow = false;
    const starSparkles: T.Sprite[] = [];
    Array.from({ length: 7 }, (_, index) => index).forEach(i => {
        const spark = glow(
            shootingStar,
            -12 - i * 17,
            Math.sin(i * 2.4) * 5,
            0.01,
            5,
            0xffdf91,
            0.7
        );
        spark.material.fog = false;
        starSparkles.push(spark);
    });
    return {
        snowman,
        snowArms,
        snowFeet,
        flyingSnow,
        sleigh,
        shootingStar,
        starTrailMaterial,
        starHalo,
        starCore,
        starPoint,
        starSparkles,
    };
};
