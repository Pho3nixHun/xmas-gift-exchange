import * as T from 'three';

import { createCat } from './cat';
import { createHouse, createLandscape, createOutside } from './exterior';
import { batchStatic, createGeometry, isGeometry, V } from './geometry';
import { createInterior } from './interior';
import { createStarBurst } from './star-burst';
import { createSnow, createVisitors } from './visitors';

export const createHouseModel = (mobile: boolean) => {
    const geometry = createGeometry(),
        world = new T.Group();
    const landscape = createLandscape(geometry),
        outside = createOutside(geometry),
        exterior = createHouse(geometry, world),
        interior = createInterior(geometry),
        cat = createCat(geometry, world),
        particles = createSnow(geometry, mobile),
        visitors = createVisitors(geometry, world);
    const burst = createStarBurst(geometry, world);
    const hemi = new T.HemisphereLight(0xbedce6, 0x304448, 2.4);
    const moon = new T.DirectionalLight(0xcde6f2, 3);
    moon.position.set(-9, 17, 9);
    moon.castShadow = true;
    moon.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    moon.shadow.camera.left = -14;
    moon.shadow.camera.right = 14;
    moon.shadow.camera.top = 14;
    moon.shadow.camera.bottom = -14;
    moon.shadow.normalBias = 0.075;
    moon.shadow.bias = -0.0003;
    const warm = new T.PointLight(0xffa84f, 22, 15, 2);
    warm.position.set(-2, 2.2, -2);
    const fill = new T.PointLight(0xffe0a0, 18, 17, 2);
    fill.position.set(3.3, 3, 2.7);
    world.add(
        landscape,
        outside,
        exterior.house,
        interior.room,
        particles.snow,
        hemi,
        moon,
        warm,
        fill
    );
    [
        landscape,
        outside,
        exterior.roof,
        exterior.front,
        exterior.house,
        interior.room,
    ].forEach(batchStatic);
    interior.room.visible = false;
    cat.cat.visible = false;
    const anchors = {
        door: V(0, 1.5, 4.1),
        tree: V(2.5, 2, -1.05),
        desk: V(2, 1.12, 3.4),
        letters: V(-3.65, 3.55, 1.7),
        recipient: V(-2.55, 3.35, -2.5),
        sofa: interior.sofa.localToWorld(V(0, 0.4, 0.75)),
        cookie: interior.cookieRoot.localToWorld(V(0, 0.56, 0)),
    };
    const dispose = () => {
        const geometries = new Set<T.BufferGeometry>(),
            materials = new Set<T.Material>();
        world.traverse(object => {
            if (object instanceof T.Mesh || object instanceof T.Points) {
                const owned: unknown = object.geometry;
                if (isGeometry(owned)) geometries.add(owned);
                const material: unknown = object.material;
                if (material instanceof T.Material) materials.add(material);
            }
            if (object instanceof T.Sprite) materials.add(object.material);
        });
        geometries.forEach(item => item.dispose());
        materials.forEach(item => item.dispose());
        geometry.dispose();
        moon.shadow.dispose();
    };
    return {
        world,
        visitorSeed: Math.random() * 10000,
        landscape,
        outside,
        ...exterior,
        ...interior,
        ...cat,
        ...particles,
        ...visitors,
        ...burst,
        hemi,
        moon,
        warm,
        fill,
        anchors,
        dispose,
        twinkles: [...exterior.twinkles, ...interior.twinkles],
    };
};
export type HouseModel = ReturnType<typeof createHouseModel>;
