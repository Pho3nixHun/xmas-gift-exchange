export type MotionStep = { readonly duration: number } & {
    readonly update: (progress: number) => void;
};
export const createMotion = () => {
    const state: { steps: readonly MotionStep[]; elapsed: number } = {
        steps: [],
        elapsed: 0,
    };
    const tick = (delta: number, immediate: boolean): void => {
        const step = state.steps[0];
        if (!step) return;
        state.elapsed += delta;
        const progress = immediate
            ? 1
            : Math.min(state.elapsed / step.duration, 1);
        step.update(progress);
        if (progress === 1) {
            state.steps = state.steps.slice(1);
            state.elapsed = 0;
            if (immediate) tick(0, true);
        }
    };
    return {
        run: (steps: readonly MotionStep[]) => {
            state.steps = steps;
            state.elapsed = 0;
        },
        tick,
        active: () => state.steps.length > 0,
    };
};
