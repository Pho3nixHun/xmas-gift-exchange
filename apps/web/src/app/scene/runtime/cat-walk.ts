import { CatmullRomCurve3 } from 'three';

import { V } from '../render/geometry';
import type { HouseModel } from '../render/house-model';

import { ease } from './poses';

export const catWalk = (
    model: HouseModel,
    destination: ReturnType<typeof V>
) => {
    const start = model.cat.position.clone();
    // Walk behind the coffee table; do not cut through it or the armchair.
    const route = new CatmullRomCurve3([
        start,
        V(start.x < -1.5 ? -1.25 : 1.2, 0.18, start.z > 1 ? 2.4 : -0.65),
        V(1.1, 0.18, -0.7),
        destination,
    ]);
    return {
        duration: 5.5,
        update: (t: number) => {
            const progress = ease(t),
                direction = route.getTangent(progress);
            model.cat.position.copy(route.getPoint(progress));
            model.cat.position.y =
                Math.max(0.18, model.cat.position.y) +
                Math.sin(t * Math.PI * 28) * 0.016;
            model.cat.rotation.set(
                0,
                Math.atan2(direction.x, direction.z),
                Math.sin(t * Math.PI * 14) * 0.025
            );
            model.catLegs.forEach((leg, i) => {
                leg.rotation.x =
                    Math.sin(
                        t * Math.PI * 28 + (i === 0 || i === 3 ? 0 : Math.PI)
                    ) * 0.32;
            });
        },
    };
};
