// Geometry shadows need fewer updates than the visible scene. Lighting and
// camera movement still render every frame; explicit scene changes invalidate it.
export const createShadowSchedule = () => {
    const state = { elapsed: Infinity };
    return (
        delta: number,
        dirty: boolean,
        animated: boolean,
        mobile: boolean
    ) => {
        state.elapsed += delta;
        if (dirty || (animated && state.elapsed >= 1 / (mobile ? 20 : 30))) {
            state.elapsed = 0;
            return true;
        }
        return false;
    };
};

// Ignore shader compilation at startup, but include slow steady-state frames.
// Downshift before the experience reaches 30 fps, without oscillating resolution.
export const createQualityBudget = () => {
    const state = { warmup: 3, seconds: 0, frames: 0 };
    return (delta: number, ratio: number) => {
        if (delta <= 0) return null;
        if (state.warmup > 0) {
            state.warmup -= delta;
            return null;
        }
        state.seconds += Math.min(delta, 1);
        state.frames++;
        if (state.seconds < 3) return null;
        const fps = state.frames / state.seconds;
        state.seconds = state.frames = 0;
        if (fps >= 50 || ratio <= 0.75) return null;
        state.warmup = 1;
        return Math.max(0.75, ratio * 0.85);
    };
};
