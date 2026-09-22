import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';

import type { HouseModel } from '../render/house-model';

import { createCompanions } from './companions';

const fixture = () => {
    const model = {
        cat: new Group(),
        catHead: new Group(),
        catBody: new Group(),
        catTail: new Group(),
        catLegs: [],
        catEyes: [],
        tree: new Group(),
        baubles: [{ group: new Group() }],
    };
    const sound = vi.fn();
    return {
        sound,
        model,
        companions: createCompanions(model as unknown as HouseModel, sound),
    };
};
describe('ornament impact sound', () => {
    it('plays exactly at impact, not on selection or during the jump', () => {
        const { companions, model, sound } = fixture();
        companions.run({ action: 'ornament', index: 0, revision: 1 });
        companions.tick(0.45, false, 0, 'tree');
        companions.tick(1.05, false, 0, 'tree');
        expect(sound).not.toHaveBeenCalled();
        expect(model.baubles[0]?.group.visible).toBe(true);
        companions.tick(0.01, false, 0, 'tree');
        expect(sound).toHaveBeenCalledExactlyOnceWith('glass');
        expect(model.baubles[0]?.group.visible).toBe(false);
        companions.tick(0.2, false, 0, 'tree');
        companions.tick(1, false, 0, 'tree');
        expect(sound).toHaveBeenCalledOnce();
    });
    it('plays once when reduced motion skips straight to the result', () => {
        const { companions, sound } = fixture();
        companions.run({ action: 'ornament', index: 0, revision: 1 });
        companions.tick(0, true, 0, 'tree');
        companions.tick(1, true, 0, 'tree');
        expect(sound).toHaveBeenCalledExactlyOnceWith('glass');
    });
});
