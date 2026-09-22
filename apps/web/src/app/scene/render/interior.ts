// Scene construction ported from the approved Winter House model.
import * as T from 'three';

import { gift, lantern, wreath } from './decoration';
import { palette, batchStatic, shader } from './geometry';
import type { Geometry } from './geometry';
import { createGlowField, emberMotion, steamMotion } from './glow-field';
import { createOrnaments } from './ornaments';
export const createWindow = (h: Geometry, p: T.Object3D) => {
    const { group, mesh } = h;
    // A small, animated view behind the real mullions. Everything stays clipped
    // to the glass, with no extra scene render or detailed city geometry.
    const view = group(p, 0.1, 2.42, -3.465, true);
    const windowMaterial = shader({
        uniforms: {
            time: { value: 0 },
            passing: { value: 0 },
            glow: { value: 0 },
        },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform float time;uniform float passing;uniform float glow;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float snow(vec2 uv,vec2 cells,float speed,float seed){
          vec2 q=uv*cells+vec2(-time*speed*.24,time*speed);
          vec2 cell=floor(q),local=fract(q);
          float h=hash(cell+seed);
          vec2 center=vec2(.2+.6*h,.2+.6*hash(cell+seed+9.));
          center.x+=sin(time*.65+h*6.28)*.09;
          float radius=.045+h*.055;
          return (1.-smoothstep(radius*.25,radius,length(local-center)))*(.4+h*.6);
        }
        void main(){
          vec2 uv=vUv;
          vec3 c=mix(vec3(.085,.16,.2),vec3(.015,.042,.065),smoothstep(0.,1.,uv.y));
          // Hazy roof shapes and just a handful of neighbours' warm windows.
          float column=floor(uv.x*7.);
          float roof=.22+hash(vec2(column,4.))*.2;
          float house=1.-smoothstep(roof-.008,roof+.025,uv.y);
          c=mix(c,vec3(.027,.064,.078),house*.8);
          for(int i=0;i<9;i++){
            float f=float(i),h=hash(vec2(f,8.));
            vec2 center=vec2(.065+f*.11,.13+mod(f,3.)*.055);
            vec2 d=abs(uv-center);
            float pane=(1.-smoothstep(.009,.022,d.x))*(1.-smoothstep(.015,.031,d.y));
            float lit=.18+.68*smoothstep(-.35,.35,sin(time*(.055+h*.025)+f*2.4));
            float halo=exp(-dot((uv-center)*vec2(14.,12.),(uv-center)*vec2(14.,12.)));
            c+=vec3(.85,.43,.14)*lit*(pane*.58+halo*.055);
          }
          // A passing light, softened by falling snow and cold glass.
          vec2 light=vec2(mix(-.2,1.2,passing),.115);
          vec2 d=(uv-light)*vec2(4.,6.);
          c+=vec3(.7,.48,.24)*exp(-dot(d,d))*glow*.45;
          for(int i=0;i<2;i++){
            vec2 head=(uv-light-vec2(float(i)*.06,0.))*vec2(42.,55.);
            c+=vec3(.95,.76,.43)*exp(-dot(head,head))*glow*.7;
          }
          float flakes=snow(uv,vec2(8.,10.),.48,3.)*.37+snow(uv,vec2(4.,5.),.62,19.)*.65;
          c+=vec3(.64,.79,.85)*flakes;
          // Slightly misted edges keep the view soft and tucked into the frame.
          float edge=1.-smoothstep(0.,.09,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
          c=mix(c,vec3(.12,.2,.23),edge*.24);
          gl_FragColor=vec4(c,1.);
        }`,
    });
    const glass = mesh(view, new T.PlaneGeometry(1.22, 1.52), windowMaterial);
    glass.castShadow = false;
    glass.receiveShadow = false;
    const windowLight = new T.PointLight(0xffd5a0, 0, 3.5, 2);
    windowLight.position.set(0.1, 2, -3.1);
    p.add(windowLight);
    return { windowMaterial, windowLight };
};
export const createFireplace = (h: Geometry, p: T.Object3D) => {
    const { rand, mat, group, mesh, box, ball, cylinder, rounded, glow } = h;
    const fireParts: T.Mesh<T.BufferGeometry, T.Material>[] = [];
    const g = group(p, -2.55, 0, -3.18);
    rounded(g, 0, 0.16, 0.2, 2.45, 0.25, 1.25, 0x81664b, 0.07);
    box(g, 0, 1.45, -0.25, 2.05, 2.7, 0.5, 0xb2805b);
    rounded(g, 0, 1.07, 0.045, 1.65, 1.65, 0.08, 0x342b26, 0.13);
    ([-1, 1] as const).forEach(s => {
        Array.from({ length: 6 }, (_, index) => index).forEach(i => {
            rounded(
                g,
                s * 0.88,
                0.35 + i * 0.3,
                0.15,
                0.38,
                0.27,
                0.44,
                (i + (s > 0 ? 1 : 0)) % 2 ? 0xa16d4b : 0xb58359,
                0.025
            );
        });
    });
    Array.from({ length: 7 }, (_, index) => index).forEach(i => {
        const a = (i / 6) * Math.PI,
            m = rounded(
                g,
                Math.cos(a) * 0.78,
                1.52 + Math.sin(a) * 0.46,
                0.15,
                0.35,
                0.3,
                0.47,
                i % 2 ? 0xa77350 : 0xc49669,
                0.025
            );
        m.rotation.z = a - Math.PI / 2;
    });
    rounded(g, 0, 2.23, 0.13, 2.5, 0.2, 0.95, 0x60422b, 0.065);
    Array.from({ length: 4 }, (_, index) => index).forEach(row => {
        Array.from({ length: 5 }, (_, index) => index).forEach(col => {
            box(
                g,
                -0.86 + col * 0.42 + (row % 2) * 0.07,
                2.5 + row * 0.3,
                -0.16,
                0.39,
                0.27,
                0.18,
                (row + col) % 2 ? 0xbb936a : 0xc8a176
            );
        });
    });
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        const log = cylinder(
            g,
            -0.3 + i * 0.3,
            0.37,
            0.38,
            0.14,
            0.14,
            0.92,
            0x60422b,
            9
        );
        log.rotation.z = Math.PI / 2;
        log.rotation.y = (i - 1) * 0.35;
    });
    const flameMat = mat(0xffa747, 0.55, 0, 0xffa142, 1.8);
    // Keep the live fire out of static batching: rising tongues change silhouette,
    // while the small ember cloud stays within the chimney opening.
    const flameMaterial = shader({
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform float time;
        void main(){
          float x=(vUv.x-.5)*2., y=vUv.y;
          float sway=sin(y*8.-time*4.1)*.07*y+sin(y*17.-time*6.3)*.035*y;
          float tongues=0.;
          for(int i=0;i<5;i++){
            float f=float(i),center=(f-2.)*.29+sway;
            float height=.52+.22*sin(f*2.7+time*2.9)+.12*sin(time*5.3+f);
            float width=.19*(1.-y*.85);
            float tongue=(1.-smoothstep(width*.35,width,abs(x-center)))*(1.-smoothstep(height-.2,height,y));
            tongues=max(tongues,tongue);
          }
          float base=(1.-smoothstep(.48,.84,abs(x)))*(1.-smoothstep(.05,.35,y));
          float fire=max(tongues,base)*smoothstep(0.,.07,y);
          float core=(1.-smoothstep(.12,.5,y))*(1.-smoothstep(.2,.7,abs(x)));
          vec3 color=mix(vec3(1.,.12,.008),vec3(1.,.56,.055),fire);
          color=mix(color,vec3(1.,.83,.3),core*.85);
          gl_FragColor=vec4(color*1.5,fire*.96);
        }`,
    });
    const liveFire = group(g, 0, 0.99, 0.43, true);
    const flame = mesh(liveFire, new T.PlaneGeometry(1.5, 1.38), flameMaterial);
    flame.castShadow = false;
    flame.receiveShadow = false;
    const embers = group(g, 0, 0.4, 0.47, true);
    const emberClock = createGlowField(embers, {
        map: h.glowMap,
        color: 0xff8b36,
        count: 12,
        speed: 0.33,
        motion: emberMotion,
    });
    // The per-ember drift values left with the individual sprites, but this
    // generator still seeds the snow and visitors built afterwards, so its
    // sequence has to stay where it was.
    Array.from({ length: 12 }, () => rand());
    const fireGlow = glow(g, 0, 0.7, 0.5, 2.5, 0xff923d, 0.32);
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        const stocking = group(g, -0.75 + i * 0.7, 1.98, 0.64);
        stocking.rotation.z = (i - 1) * 0.1;
        rounded(
            stocking,
            0,
            -0.2,
            0,
            0.21,
            0.48,
            0.09,
            i === 1 ? 0x426448 : 0x9e4431,
            0.07
        );
        rounded(
            stocking,
            0.09,
            -0.43,
            0.015,
            0.34,
            0.18,
            0.12,
            i === 1 ? 0x426448 : 0x9e4431,
            0.07
        );
        box(stocking, 0, 0.03, 0.01, 0.24, 0.12, 0.14, 0xe2d2ac);
        ball(stocking, 0, -0.19, 0.065, 0.05, 0.05, 0.012, 0xe1bc7d);
    });
    wreath(h, g, 0, 3.06, 0.17, 0.36);
    Array.from({ length: 17 }, (_, index) => index).forEach(i => {
        const x = -1.13 + i * 0.14;
        ball(g, x, 2.41, 0.37, 0.16, 0.09, 0.14, i % 2 ? 0x355e3e : 0x486342);
        if (i % 3 === 0) ball(g, x, 2.43, 0.46, 0.035, 0.035, 0.035, 0xc27640);
    });
    ([-0.9, 0.87] as const).forEach(x => {
        cylinder(g, x, 2.62, 0.03, 0.075, 0.075, 0.4, 0xebd7a7);
        const flame = ball(g, x, 2.88, 0.03, 0.045, 0.09, 0.045, flameMat);
        flame.userData['dynamic'] = true;
        flame.userData['height'] = 0.09;
        flame.userData['phase'] = x;
        fireParts.push(flame);
        glow(g, x, 2.85, 0.03, 0.55, 0xffce83, 0.4);
    });
    return { flameMaterial, embers, emberClock, fireGlow, fireParts };
};
export const createTree = (
    h: Geometry,
    p: T.Object3D,
    twinkles: T.Sprite[]
) => {
    const { mat, geo, group, mesh, ball, cylinder, tube, glow } = h;
    const tree = group(p, 2.5, 0.13, -1.7, true);
    const g = tree;
    cylinder(g, 0, 0.23, 0, 0.19, 0.25, 0.45, palette.wood);
    cylinder(g, 0, 0.15, 0, 0.58, 0.48, 0.23, 0x786a49, 16);
    Array.from({ length: 7 }, (_, index) => index).forEach(layer => {
        const y = 0.75 + layer * 0.43,
            r = 1.23 - layer * 0.15;
        const core = mesh(
            g,
            geo('Cone', r, 0.99, 11),
            mat(layer % 2 ? 0x2f5841 : 0x254b35),
            0,
            y,
            0
        );
        core.rotation.y = layer * 0.7;
        Array.from({ length: 9 }, (_, index) => index).forEach(j => {
            const a = (j / 9) * Math.PI * 2 + layer * 0.5;
            const branch = ball(
                g,
                Math.cos(a) * r * 0.67,
                y - 0.25,
                Math.sin(a) * r * 0.67,
                r * 0.48,
                0.17,
                r * 0.27,
                layer % 2 ? 0x355b42 : 0x31573c
            );
            branch.rotation.y = -a;
            branch.rotation.z = 0.1;
        });
    });
    const wire: number[][] = [];
    Array.from({ length: 150 }, (_, index) => index).forEach(i => {
        const f = i / 149,
            y = 0.7 + f * 2.98,
            r = 1.14 - f * 0.96,
            a = f * Math.PI * 2 * 4.4;
        const x = Math.sin(a) * r,
            z = Math.cos(a) * r;
        wire.push([x, y, z]);
        if (i % 3 === 0) {
            ball(
                g,
                x,
                y,
                z,
                0.035,
                0.038,
                0.035,
                mat(0xffd895, 0.35, 0, 0xffbd69, 1.8),
                7
            );
            if (i % 12 === 0)
                twinkles.push(glow(g, x, y, z, 0.44, 0xffca77, 0.5));
        }
        if (i % 11 === 0 && i > 5) {
            ball(
                g,
                x,
                y - 0.06,
                z,
                0.075,
                0.09,
                0.075,
                mat(i % 2 ? 0xb6523a : 0xc29b55, 0.35, 0.5)
            );
        }
    });
    tube(g, wire, 0.012, 0x9a8552);
    const starShape = new T.Shape();
    Array.from({ length: 10 }, (_, index) => index).forEach(i => {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2,
            r = i % 2 ? 0.12 : 0.28;
        const x = Math.cos(a) * r,
            y = Math.sin(a) * r;
        if (i) starShape.lineTo(x, y);
        else starShape.moveTo(x, y);
    });
    starShape.closePath();
    const treeStar = mesh(
        g,
        new T.ExtrudeGeometry(starShape, {
            depth: 0.07,
            bevelEnabled: true,
            bevelSize: 0.025,
            bevelThickness: 0.025,
            bevelSegments: 1,
            steps: 1,
        }),
        mat(0xedbe66, 0.35, 0.5, 0xffc96c, 0.8),
        0,
        3.9,
        0
    );
    treeStar.userData['action'] = 'star';
    treeStar.userData['dynamic'] = true;
    glow(g, 0, 3.9, 0.1, 1.5, 0xffd890, 0.35);
    batchStatic(g);
    (
        [
            [-0.8, 0.7, 0.57, 0xa74735],
            [0.5, 0.75, 0.48, 0xd3ba83],
            [-0.2, 1.1, 0.4, 0x49694b],
            [0.8, 0.5, 0.38, 0xaf6946],
        ] as const
    ).forEach(([x, z, w, c]) => {
        gift(h, p, 2.5 + x, 0.15, -1.7 + z, w, c);
    });
    const proxy = mesh(
        g,
        geo('Cone', 1.35, 3.8, 8),
        new T.MeshBasicMaterial({ visible: false }),
        0,
        1.9,
        0
    );
    proxy.userData['action'] = 'tree';
    proxy.userData['dynamic'] = true;
    const baubleRoot = group(g, 0, 0, 0, true);
    const baubles = createOrnaments(h, baubleRoot);
    return { treeStar, tree, baubleRoot, baubles };
};
export const createFurniture = (h: Geometry, p: T.Object3D) => {
    const {
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
        timber,
    } = h;
    // Woven rug, turned slightly off-square; a lived-in room rather than a showroom.
    const rug = group(p, -0.25, 0.13, 0.8);
    rug.rotation.y = 0.09;
    Array.from({ length: 5 }, (_, index) => index).forEach(i => {
        const colors = [0x9e4d3b, 0xc8a16e, 0x4b6350, 0xb56b47, 0xc9af7e];
        const m = cylinder(
            rug,
            0,
            0.005 * i,
            0,
            1.8 - i * 0.16,
            1.8 - i * 0.16,
            0.012,
            colors[i] ?? 0xc9af7e,
            48
        );
        m.scale.set(1.35, 1, 0.88);
    });
    // Upholstered wingback chair, thick seat cushions and little wooden feet.
    const chair = group(p, -2.35, 0.13, 0.4);
    chair.rotation.y = 0.35;
    ([-0.49, 0.49] as const).forEach(x => {
        ([-0.42, 0.42] as const).forEach(z => {
            cylinder(chair, x, 0.2, z, 0.06, 0.045, 0.4, 0x68513a, 8);
        });
    });
    rounded(chair, 0, 0.64, 0, 1.33, 0.45, 1.15, 0x5b7453, 0.2);
    rounded(
        chair,
        0,
        1.31,
        -0.48,
        1.25,
        1.45,
        0.35,
        0x496444,
        0.22
    ).rotation.x = -0.09;
    ([-0.65, 0.65] as const).forEach(x => {
        rounded(chair, x, 0.95, 0.04, 0.25, 0.48, 1.3, 0x66815a, 0.12);
        ball(chair, x, 1.36, -0.42, 0.14, 0.36, 0.22, 0x57754d);
    });
    rounded(chair, 0, 0.89, 0.09, 1.05, 0.18, 0.87, 0x7a8c62, 0.12);
    const cushion = rounded(
        chair,
        0.24,
        1.37,
        -0.24,
        0.51,
        0.51,
        0.2,
        0xc39860,
        0.12
    );
    cushion.rotation.z = 0.18;
    cushion.rotation.x = 0.15;
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        box(chair, 0.24, 1.2 + i * 0.14, -0.125, 0.37, 0.018, 0.015, 0x8a4b35);
    });
    batchStatic(chair);
    chair.userData['action'] = 'sofa';
    chair.updateWorldMatrix(true, false);
    // A coffee table, steaming tea, scattered biscuits and a book.
    const table = group(p, -1.75, 0.13, 2.05);
    cylinder(table, 0, 0.77, 0, 1.03, 1.03, 0.13, timber, 32).scale.z = 0.73;
    ([-0.62, 0.62] as const).forEach(x => {
        ([-0.4, 0.4] as const).forEach(z => {
            box(table, x, 0.37, z, 0.085, 0.74, 0.085, 0x6c4c30);
        });
    });
    const mug = group(table, 0.4, 0.85, 0.07);
    cylinder(mug, 0, 0.14, 0, 0.12, 0.1, 0.27, 0xe1cea5, 16);
    cylinder(mug, 0, 0.285, 0, 0.095, 0.095, 0.005, 0x66452e, 16);
    const handle = mesh(
        mug,
        geo('Torus', 0.08, 0.022, 6, 14),
        mat(0xdfc89a),
        0.13,
        0.15,
        0
    );
    handle.rotation.y = Math.PI / 2;
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        ball(mug, 0, 0.12 + i * 0.06, 0.103, 0.025, 0.013, 0.005, 0x8e4630, 6);
    });
    const teaSteam = group(table, 0.4, 1.12, 0.07, true);
    const steamClock = createGlowField(teaSteam, {
        map: h.glowMap,
        color: 0xd7dbca,
        count: 4,
        speed: 0.25,
        motion: steamMotion,
    });
    cylinder(table, -0.44, 0.86, 0.09, 0.28, 0.3, 0.035, 0xb89a64, 20);
    const cookieRoot = group(table, -0.44, 0.885, 0.09, true);
    const cookies: T.Group[] = [];
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        const a = i * 2.1,
            cookie = group(
                cookieRoot,
                Math.cos(a) * 0.12,
                0.02,
                Math.sin(a) * 0.12,
                true
            );
        cookie.userData['action'] = 'cookie';
        cookie.userData['index'] = i;
        cookie.userData['eaten'] = false;
        ball(cookie, 0, 0, 0, 0.085, 0.026, 0.085, 0xbd8a51);
        Array.from({ length: 5 }, (_, index) => index).forEach(j => {
            const angle = j * 2.4;
            ball(
                cookie,
                Math.cos(angle) * 0.047,
                0.023,
                Math.sin(angle) * 0.047,
                0.009,
                0.006,
                0.009,
                0x65432d,
                6
            );
        });
        batchStatic(cookie);
        cookies.push(cookie);
    });
    const plateHit = cylinder(
        cookieRoot,
        0,
        0,
        0,
        0.3,
        0.3,
        0.02,
        new T.MeshBasicMaterial({ visible: false }),
        16
    );
    plateHit.userData['action'] = 'cookie';
    const cookieCrumbs = group(cookieRoot, 0, 0, 0, true);
    cookieCrumbs.visible = false;
    Array.from({ length: 7 }, (_, index) => index).forEach(() => {
        ball(cookieCrumbs, 0, 0, 0, 0.008, 0.006, 0.008, 0xb78043, 6);
    });
    table.updateWorldMatrix(true, false);
    const book = rounded(
        table,
        -0.12,
        0.91,
        -0.3,
        0.38,
        0.075,
        0.48,
        0x954a3a,
        0.02
    );
    book.rotation.y = -0.3;
    box(table, -0.12, 0.957, -0.3, 0.26, 0.005, 0.36, 0xd9c49a).rotation.y =
        -0.3;
    // A writing desk is a real destination, with a drawer, lamp, paper and pencil.
    const desk = group(p, 2, 0.13, 2.1, true);
    const d = desk;
    rounded(d, 0, 1.14, 0, 2.15, 0.15, 0.95, timber, 0.06);
    ([-0.88, 0.88] as const).forEach(x => {
        ([-0.34, 0.34] as const).forEach(z => {
            box(d, x, 0.55, z, 0.1, 1.1, 0.1, 0x6b4c31);
        });
    });
    rounded(d, 0, 0.91, 0.04, 1.82, 0.32, 0.71, 0x8f6b45, 0.035);
    ball(d, 0, 0.94, 0.42, 0.055, 0.035, 0.04, mat(0xc3a360, 0.3, 0.7));
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        const page = box(
            d,
            0.06,
            1.24 + i * 0.008,
            0.02,
            0.7,
            0.008,
            0.57,
            0xf0dfb5
        );
        page.rotation.y = -0.08 + i * 0.08;
    });
    const pencil = box(d, 0.57, 1.25, 0.06, 0.025, 0.025, 0.5, 0xa54d37);
    pencil.rotation.y = 0.28;
    cylinder(d, -0.49, 1.23, 0, 0.17, 0.17, 0.08, 0xa88347, 20);
    cylinder(
        d,
        -0.49,
        1.52,
        0,
        0.025,
        0.025,
        0.55,
        mat(0xbb9657, 0.4, 0.65),
        8
    );
    const deskLampShade = mat(0xbfa178, 0.85, 0, 0xddac64, 0).clone();
    const lamp = group(d, -0.49, 0, 0, true);
    mesh(lamp, geo('Cone', 0.23, 0.34, 16, 1, true), deskLampShade, 0, 1.91, 0);
    const deskLampBulb = mat(0xf1d8a3, 0.5, 0, 0xffcf83, 0).clone();
    ball(lamp, 0, 1.79, 0, 0.06, 0.085, 0.06, deskLampBulb);
    const deskLampGlow = glow(lamp, 0, 1.76, 0, 0.95, 0xffd29a, 0);
    const deskLampLight = new T.PointLight(0xffc77d, 0, 2.8, 2);
    deskLampLight.position.set(0, 1.7, 0.025);
    lamp.add(deskLampLight);
    const deskLampPoolMaterial = new T.MeshBasicMaterial({
        map: glowMap,
        color: 0xffc77d,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
    });
    const pool = mesh(
        lamp,
        new T.PlaneGeometry(1.05, 0.78),
        deskLampPoolMaterial,
        0.12,
        1.224,
        0.1
    );
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    pool.receiveShadow = false;
    const deskProxy = box(
        d,
        0,
        1.1,
        0,
        2.2,
        0.5,
        1,
        new T.MeshBasicMaterial({ visible: false })
    );
    deskProxy.userData['action'] = 'desk';
    batchStatic(d);
    const writingChair = group(p, 2, 0.13, 3.2);
    writingChair.userData['action'] = 'desk';
    ([-0.32, 0.32] as const).forEach(x => {
        ([-0.3, 0.3] as const).forEach(z => {
            box(writingChair, x, 0.34, z, 0.065, 0.68, 0.065, 0x654b34);
        });
    });
    rounded(writingChair, 0, 0.72, 0, 0.79, 0.12, 0.76, 0x826342, 0.055);
    rounded(writingChair, 0, 0.81, -0.025, 0.69, 0.12, 0.63, 0x9e4d3b, 0.055);
    ([-0.32, 0.32] as const).forEach(x => {
        box(writingChair, x, 1.04, 0.31, 0.065, 0.77, 0.065, 0x654b34);
    });
    rounded(writingChair, 0, 1.35, 0.31, 0.83, 0.3, 0.085, 0x826342, 0.04);
    ([-0.16, 0, 0.16] as const).forEach(x => {
        box(writingChair, x, 1.1, 0.31, 0.045, 0.38, 0.045, 0x826342);
    });
    // Family letters pinned to a notice board: the browse destination.
    const letters = group(p, -3.82, 2.02, 1.7, true);
    letters.rotation.y = Math.PI / 2;
    rounded(letters, 0, 0, 0, 2.15, 2.65, 0.12, 0x745435, 0.06);
    box(letters, 0, 0, 0.075, 1.96, 2.45, 0.035, 0xae8b58);
    const lettersProxy = box(
        letters,
        0,
        0,
        0.1,
        2.15,
        2.65,
        0.1,
        new T.MeshBasicMaterial({ visible: false })
    );
    lettersProxy.userData['action'] = 'letters';
    batchStatic(letters);
    const stack = group(p, -2.5, 1.42, 2.8, true);
    stack.visible = false;
    Array.from({ length: 5 }, (_, index) => index).forEach(i => {
        const sheet = box(
            stack,
            (i % 2 ? 1 : -1) * i * 0.016,
            -i * 0.012,
            -i * 0.018,
            2.15,
            2.95,
            0.012,
            i === 0 ? 0xf7e9cb : 0xdccaa5
        );
        sheet.rotation.z = (i - 2) * 0.009;
    });
    const letter = group(p, -2.55, 2.72, -2.62, true);
    letter.userData['action'] = 'recipient';
    rounded(letter, 0, 0, 0, 0.66, 0.41, 0.035, 0xf4ddb2, 0.02);
    tube(
        letter,
        [
            [-0.3, 0.17, 0.025],
            [0, -0.04, 0.035],
            [0.3, 0.17, 0.025],
        ],
        0.009,
        0xb39161
    );
    ball(letter, 0, -0.035, 0.058, 0.055, 0.055, 0.018, 0xa54231);
    lantern(h, p, 3.4, 0.12, 2.8, 0.55);
    return {
        sofa: chair,
        teaSteam,
        steamClock,
        cookies,
        cookieRoot,
        cookieCrumbs,
        desk,
        deskLampShade,
        deskLampBulb,
        deskLampGlow,
        deskLampLight,
        deskLampPoolMaterial,
        letters,
        stack,
        letter,
    };
};
export const createInterior = (h: Geometry) => {
    const { mat, geo, group, mesh, box, ball, rounded, timber } = h;
    const p = new T.Group();
    const twinkles: T.Sprite[] = [];
    rounded(p, 0, -0.05, -0.1, 8.3, 0.24, 7.8, 0x71553b, 0.06);
    Array.from({ length: 20 }, (_, index) => index).forEach(i => {
        const x = -3.85 + i * 0.405;
        const plank = box(p, x, 0.08, 0, 0.39, 0.06, 7.4, timber);
        plank.material = timber;
        Array.from({ length: 3 }, (_, index) => index).forEach(j => {
            box(
                p,
                x,
                0.115,
                -2.8 + j * 2.8 + (i % 2) * 0.5,
                0.38,
                0.005,
                0.015,
                0x655039
            );
        });
    });
    const leftWall = mesh(p, geo('Plane', 7.6, 4), mat(0xa98158), -4, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    const rightWall = group(p, 4, 0, 0, true);
    mesh(rightWall, geo('Plane', 7.6, 4), mat(0xd2b487), 0, 2, 0).rotation.y =
        -Math.PI / 2;
    [0.32, 3.85].forEach(y =>
        box(rightWall, -0.08, y, 0, 0.15, 0.16, 7.4, 0x78583b)
    );
    rightWall.visible = false;
    // Close the cutaway behind the board-reading view after the camera enters.
    const notesWall = group(p, 0, 0, 3.8, true);
    mesh(notesWall, geo('Plane', 8.1, 4), mat(0xa98158), 0, 2, 0).rotation.y =
        Math.PI;
    [0.32, 3.85].forEach(y =>
        box(notesWall, 0, y, -0.08, 8, 0.16, 0.15, 0x78583b)
    );
    notesWall.visible = false;
    box(p, 0, 2, -3.8, 8.1, 4, 0.18, 0xd2b487);
    ([-3.9, 3.9] as const).forEach(x => {
        box(p, x, 2, -3.68, 0.18, 4, 0.18, 0x765239);
    });
    ([0.32, 3.85] as const).forEach(y => {
        box(p, 0, y, -3.66, 8, 0.16, 0.12, 0x78583b);
        box(p, -3.84, y, 0, 0.15, 0.16, 7.4, 0x78583b);
    });
    Array.from({ length: 8 }, (_, index) => index).forEach(row => {
        Array.from({ length: 17 }, (_, index) => index).forEach(col => {
            const x = -3.65 + col * 0.46,
                y = 0.6 + row * 0.4;
            if (x < -1.1 && y < 3) return;
            const flower = ball(
                p,
                x,
                y,
                -3.686,
                0.018,
                0.045,
                0.009,
                0xa2845f,
                6
            );
            flower.rotation.z = 0.4;
        });
    });
    const fireplace = createFireplace(h, p),
        tree = createTree(h, p, twinkles),
        furniture = createFurniture(h, p);
    // Back window: a view through to the snowy sky, with softly draped curtains.
    rounded(p, 0.1, 2.42, -3.6, 1.48, 1.8, 0.12, 0x60472f, 0.07);
    const window = createWindow(h, p);
    box(p, 0.1, 2.42, -3.43, 0.065, 1.6, 0.07, 0x906f48);
    box(p, 0.1, 2.42, -3.43, 1.3, 0.065, 0.07, 0x906f48);
    box(p, 0.1, 1.56, -3.32, 1.8, 0.14, 0.5, 0x8a6943);
    ([-1, 1] as const).forEach(s => {
        Array.from({ length: 5 }, (_, index) => index).forEach(i => {
            const m = ball(
                p,
                0.1 + s * (0.78 + i * 0.052),
                2.4,
                -3.28,
                0.07,
                0.92,
                0.09,
                i % 2 ? 0x8f4031 : 0xa9583d
            );
            m.rotation.z = -s * 0.04;
        });
    });
    const frame = group(p, 1.3, 2.65, -3.55);
    rounded(frame, 0, 0, 0, 1, 0.85, 0.08, 0xa78751, 0.06);
    box(frame, 0, 0, 0.05, 0.83, 0.68, 0.02, 0xc4b28b);
    Array.from({ length: 3 }, (_, index) => index).forEach(i => {
        mesh(
            frame,
            geo('Cone', 0.17, 0.4, 5),
            mat(i % 2 ? 0x345948 : 0x55765a),
            -0.25 + i * 0.25,
            -0.05,
            0.08
        ).rotation.x = Math.PI / 2;
    });
    const roomLight = new T.PointLight(0xffca7c, 18, 12, 2);
    roomLight.position.set(0, 3.5, 0.5);
    p.add(roomLight);
    return {
        room: p,
        leftWall,
        rightWall,
        notesWall,
        roomLight,
        twinkles,
        ...fireplace,
        ...tree,
        ...furniture,
        ...window,
    };
};
