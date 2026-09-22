import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
export const palette = {
    snow: 0xc6dddc,
    wood: 0x684c37,
    darkWood: 0x3b3028,
    plaster: 0xd3ad79,
    roof: 0x9c4939,
    pine: 0x214d3d,
    gold: 0xdba955,
    red: 0xa63e31,
    cream: 0xf5e4ba,
};
export const shader = <U extends Record<string, T.IUniform>>(
    parameters: T.ShaderMaterialParameters & { readonly uniforms: U }
) =>
    Object.assign(new T.ShaderMaterial(parameters), {
        uniforms: parameters.uniforms,
    });
export const createGeometry = () => {
    const state = { seed: 83 };
    const rand = () => {
        state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
        return state.seed / 4294967296;
    };
    const geometries = new Map<string, T.BufferGeometry>();
    const materials = new Map<string, T.MeshStandardMaterial>();
    const mat = (
        color: number,
        roughness = 0.85,
        metalness = 0,
        emissive = 0,
        intensity = 0
    ) => {
        const key = [color, roughness, metalness, emissive, intensity].join(
            '/'
        );
        const existing = materials.get(key);
        if (existing) return existing;
        const material = new T.MeshStandardMaterial({
            color,
            roughness,
            metalness,
            emissive,
            emissiveIntensity: intensity,
        });
        materials.set(key, material);
        return material;
    };
    const geo = (
        kind: 'Box' | 'Sphere' | 'Cylinder' | 'Cone' | 'Torus' | 'Plane',
        ...values: readonly (number | boolean)[]
    ) => {
        const key = kind + values.join(',');
        const existing = geometries.get(key);
        if (existing) return existing;
        const n = (index: number, fallback: number) => {
            const value = values[index];
            return typeof value === 'number' ? value : fallback;
        };
        const create = {
            Box: () => new T.BoxGeometry(n(0, 1), n(1, 1), n(2, 1)),
            Sphere: () => new T.SphereGeometry(n(0, 1), n(1, 12), n(2, 8)),
            Cylinder: () =>
                new T.CylinderGeometry(n(0, 1), n(1, 1), n(2, 1), n(3, 12)),
            Cone: () =>
                new T.ConeGeometry(
                    n(0, 1),
                    n(1, 1),
                    n(2, 12),
                    n(3, 1),
                    values[4] === true
                ),
            Torus: () =>
                new T.TorusGeometry(n(0, 1), n(1, 0.1), n(2, 5), n(3, 12)),
            Plane: () => new T.PlaneGeometry(n(0, 1), n(1, 1)),
        };
        const geometry = create[kind]();
        geometries.set(key, geometry);
        return geometry;
    };
    // These positional helpers retain the approved model's original measurements.
    const group = (
        parent: T.Object3D,
        x = 0,
        y = 0,
        z = 0,
        dynamic = false
    ) => {
        const object = new T.Group();
        object.position.set(x, y, z);
        object.userData['dynamic'] = dynamic;
        parent.add(object);
        return object;
    };
    const mesh = <M extends T.Material>(
        parent: T.Object3D,
        geometry: T.BufferGeometry,
        material: M,
        x = 0,
        y = 0,
        z = 0,
        sx = 1,
        sy = 1,
        sz = 1
        // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
    ) => {
        const object = new T.Mesh(geometry, material);
        object.position.set(x, y, z);
        object.scale.set(sx, sy, sz);
        object.castShadow = true;
        object.receiveShadow = true;
        parent.add(object);
        return object;
    };
    const box = (
        p: T.Object3D,
        x: number,
        y: number,
        z: number,
        w: number,
        h: number,
        d: number,
        color: number | T.Material
        // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
    ) =>
        mesh(
            p,
            geo('Box', 1, 1, 1),
            typeof color === 'number' ? mat(color) : color,
            x,
            y,
            z,
            w,
            h,
            d
        );
    const ball = (
        p: T.Object3D,
        x: number,
        y: number,
        z: number,
        sx: number,
        sy: number,
        sz: number,
        color: number | T.Material,
        segments = 12
        // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
    ) =>
        mesh(
            p,
            geo('Sphere', 1, segments, 8),
            typeof color === 'number' ? mat(color) : color,
            x,
            y,
            z,
            sx,
            sy,
            sz
        );
    const cylinder = (
        p: T.Object3D,
        x: number,
        y: number,
        z: number,
        rt: number,
        rb: number,
        h: number,
        color: number | T.Material,
        segments = 12
        // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
    ) =>
        mesh(
            p,
            geo('Cylinder', rt, rb, h, segments),
            typeof color === 'number' ? mat(color) : color,
            x,
            y,
            z
        );
    const tube = (
        p: T.Object3D,
        points: readonly (T.Vector3 | readonly number[])[],
        radius: number,
        color: number | T.Material
    ) =>
        mesh(
            p,
            new T.TubeGeometry(
                new T.CatmullRomCurve3(
                    points.map(v =>
                        v instanceof T.Vector3 ? v : V(v[0], v[1], v[2])
                    )
                ),
                Math.max(8, points.length * 3),
                radius,
                5,
                false
            ),
            typeof color === 'number' ? mat(color) : color
        );
    const rounded = (
        p: T.Object3D,
        x: number,
        y: number,
        z: number,
        w: number,
        h: number,
        d: number,
        color: number | T.Material,
        r = 0.1
        // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
    ) => {
        const key = `round/${w}/${h}/${d}/${r}`;
        const existing = geometries.get(key);
        if (existing)
            return mesh(
                p,
                existing,
                typeof color === 'number' ? mat(color) : color,
                x,
                y,
                z
            );
        const s = new T.Shape(),
            a = -w / 2,
            b = -h / 2;
        s.moveTo(a + r, b);
        s.lineTo(a + w - r, b);
        s.quadraticCurveTo(a + w, b, a + w, b + r);
        s.lineTo(a + w, b + h - r);
        s.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
        s.lineTo(a + r, b + h);
        s.quadraticCurveTo(a, b + h, a, b + h - r);
        s.lineTo(a, b + r);
        s.quadraticCurveTo(a, b, a + r, b);
        const geometry = new T.ExtrudeGeometry(s, {
            depth: d,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: r * 0.2,
            bevelThickness: r * 0.2,
            curveSegments: 3,
        });
        geometry.translate(0, 0, -d / 2);
        geometries.set(key, geometry);
        return mesh(
            p,
            geometry,
            typeof color === 'number' ? mat(color) : color,
            x,
            y,
            z
        );
    };
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 64;
    const glowContext = glowCanvas.getContext('2d');
    if (glowContext) {
        const gradient = glowContext.createRadialGradient(
            32,
            32,
            0,
            32,
            32,
            32
        );
        gradient.addColorStop(0, 'rgba(255,239,183,1)');
        gradient.addColorStop(0.12, 'rgba(255,209,120,.7)');
        gradient.addColorStop(0.4, 'rgba(255,172,69,.16)');
        gradient.addColorStop(1, 'rgba(255,157,69,0)');
        glowContext.fillStyle = gradient;
        glowContext.fillRect(0, 0, 64, 64);
    }
    const glowMap = new T.CanvasTexture(glowCanvas);
    const glow = (
        p: T.Object3D,
        x: number,
        y: number,
        z: number,
        size: number,
        color = 0xffb950,
        opacity = 0.55
        // eslint-disable-next-line max-params -- positional primitives preserve the approved model measurements
    ) => {
        const sprite = new T.Sprite(
            new T.SpriteMaterial({
                map: glowMap,
                color,
                transparent: true,
                opacity,
                depthWrite: false,
                blending: T.AdditiveBlending,
            })
        );
        sprite.position.set(x, y, z);
        sprite.scale.setScalar(size);
        p.add(sprite);
        return sprite;
    };
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = woodCanvas.height = 256;
    const ctx = woodCanvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#907052';
        ctx.fillRect(0, 0, 256, 256);
        Array.from({ length: 140 }, () => {
            ctx.strokeStyle = `rgba(40,20,7,${rand() * 0.09})`;
            ctx.lineWidth = 1 + rand() * 2;
            ctx.beginPath();
            const x = rand() * 256;
            ctx.moveTo(x, 0);
            ctx.bezierCurveTo(
                x + rand() * 12,
                80,
                x - 8,
                180,
                x + rand() * 15,
                256
            );
            ctx.stroke();
        });
    }
    const woodMap = new T.CanvasTexture(woodCanvas);
    woodMap.colorSpace = T.SRGBColorSpace;
    woodMap.wrapS = woodMap.wrapT = T.RepeatWrapping;
    const timber = new T.MeshStandardMaterial({
        map: woodMap,
        color: 0xcab895,
        roughness: 0.87,
    });
    return {
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
        timber,
        dispose: () => {
            geometries.forEach(g => g.dispose());
            materials.forEach(m => m.dispose());
            glowMap.dispose();
            woodMap.dispose();
            timber.dispose();
        },
    };
};
export type Geometry = ReturnType<typeof createGeometry>;

export const isGeometry = (value: unknown): value is T.BufferGeometry =>
    value instanceof T.BufferGeometry;
const isMaterialMesh = (
    value: T.Object3D
): value is T.Mesh<T.BufferGeometry, T.Material> =>
    value instanceof T.Mesh &&
    isGeometry(value.geometry) &&
    value.material instanceof T.Material;
export const batchStatic = (root: T.Object3D) => {
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const buckets = new Map<string, T.Mesh<T.BufferGeometry, T.Material>[]>();
    root.traverse(object => {
        if (!isMaterialMesh(object)) return;
        const dynamic = (node: T.Object3D | null): boolean =>
            node !== null &&
            node !== root &&
            (node.userData['dynamic'] === true ||
                typeof node.userData['action'] === 'string' ||
                dynamic(node.parent));
        if (dynamic(object)) return;
        // A material match alone must not turn distant scenery or glow planes
        // back into shadow casters, or make an invisible hit proxy visible.
        const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}/${object.visible}/${object.renderOrder}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(object);
        buckets.set(key, bucket);
    });
    buckets.forEach(objects => {
        if (objects.length < 2) return;
        const source = objects[0];
        if (!source) return;
        const copies = objects.map(object => {
            const copy = object.geometry
                .clone()
                .applyMatrix4(inverse.clone().multiply(object.matrixWorld));
            // A merge needs every input indexed or every input not. Three's
            // primitives are indexed and extrusions are not, so index the few
            // that are missing one rather than expanding every shared vertex.
            const position: unknown = copy.getAttribute('position');
            if (copy.index || !(position instanceof T.BufferAttribute))
                return copy;
            copy.setIndex(
                Array.from({ length: position.count }, (_, index) => index)
            );
            return copy;
        });
        const merged: unknown = mergeGeometries(copies);
        copies.forEach(copy => copy.dispose());
        if (!isGeometry(merged)) return;
        objects.forEach(object => object.removeFromParent());
        const combined = new T.Mesh(merged, source.material);
        combined.castShadow = source.castShadow;
        combined.receiveShadow = source.receiveShadow;
        combined.visible = source.visible;
        combined.renderOrder = source.renderOrder;
        combined.matrixAutoUpdate = false;
        combined.userData['merged'] = true;
        root.add(combined);
    });
};
