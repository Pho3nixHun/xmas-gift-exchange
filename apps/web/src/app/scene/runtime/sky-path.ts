const random = (value: number) => {
    const wave = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
    return wave - Math.floor(wave);
};
// Sample once per pass, not per frame: trajectories stay smooth and reproducible.
export const skyPath = (cycle: number, seed: number) => ({
    direction: random(cycle + seed) > 0.5 ? 1 : -1,
    height: (random(cycle * 3.7 + seed) - 0.5) * 42,
    slope: (random(cycle * 5.3 + seed) - 0.5) * 90,
});
