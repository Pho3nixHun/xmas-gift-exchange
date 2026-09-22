type Visitor = 'santa' | 'snowman';

// Scene time drives footsteps; no independent timer can outlive a paused scene.
export const createVisitorSounds = (
    play: (kind: Visitor, level?: number) => void,
    stop: (kind: Visitor) => void
) => {
    const state = { santa: -1, step: -1 };
    const audible = new Set<Visitor>();
    const end = (kind: Visitor) => {
        if (!audible.delete(kind)) return;
        stop(kind);
    };
    const silence = () => {
        audible.forEach(end);
    };
    return {
        silence,
        tick: (
            time: number,
            santaX: number | null,
            snowmanX: number | null
        ) => {
            if (santaX === null && snowmanX === null) {
                silence();
                return;
            }
            const pass = Math.floor((time + 46) / 52);
            if (
                santaX !== null &&
                Math.abs(santaX) < 0.75 &&
                state.santa !== pass
            ) {
                state.santa = pass;
                audible.add('santa');
                play('santa');
            }
            if (santaX === null) end('santa');
            const step = Math.floor((time * 4) / Math.PI);
            if (snowmanX !== null && state.step !== step) {
                state.step = step;
                audible.add('snowman');
                play('snowman', Math.max(0.08, 1 - Math.abs(snowmanX) * 0.9));
            }
            if (snowmanX === null) end('snowman');
        },
    };
};
