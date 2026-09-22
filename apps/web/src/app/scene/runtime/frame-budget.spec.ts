import { describe, expect, it } from 'vitest';

import { createQualityBudget, createShadowSchedule } from './frame-budget';

describe('render budgets', () => {
    it('refreshes shadows on scene changes and caps mobile animation updates', () => {
        const due = createShadowSchedule();
        expect(due(0, true, false, true)).toBe(true);
        expect(due(1, false, false, true)).toBe(false);
        expect(due(0, true, false, true)).toBe(true);
        const frames = Array.from({ length: 60 }, () =>
            due(1 / 60, false, true, true)
        );
        expect(frames.filter(Boolean)).toHaveLength(20);
    });
    it('keeps resolution stable at 60fps after startup warmup', () => {
        const budget = createQualityBudget();
        expect(
            Array.from({ length: 600 }, () => budget(1 / 60, 1.5)).every(
                value => value === null
            )
        ).toBe(true);
    });
    it('downshifts sustained slow frames before 30fps and respects the minimum', () => {
        const budget = createQualityBudget();
        budget(3, 1);
        const slow = Array.from({ length: 130 }, () => budget(1 / 40, 1));
        expect(slow).toContain(0.85);
        expect(
            Array.from({ length: 40 }, () => budget(0.3, 0.75)).every(
                value => value === null
            )
        ).toBe(true);
    });
    it('does not discard very slow frames from its samples', () => {
        const budget = createQualityBudget();
        budget(3, 1);
        expect(Array.from({ length: 12 }, () => budget(0.3, 1))).toContain(
            0.85
        );
    });
});
