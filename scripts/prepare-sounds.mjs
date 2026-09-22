import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sources = `${root}/audio-sources`;
const directory = `${root}/apps/web/public/audio`;
mkdirSync(directory, { recursive: true });
const run = args => {
    const result = spawnSync('ffmpeg', args, { cwd: root, encoding: 'utf8' });
    if (result.error || result.status !== 0)
        throw result.error ?? new Error(result.stderr);
    return result.stderr;
};
const peak = args => {
    const output = run(['-hide_banner', ...args, '-f', 'null', '-']);
    const match = /max_volume: ([-.\d]+) dB/.exec(output);
    if (!match) throw new Error('Could not measure audio level');
    return Number(match[1]);
};
const exportClip = ({
    source,
    name,
    start,
    duration,
    attack,
    release,
    target = -6,
}) => {
    // Reset timestamps BEFORE applying fades; output-side -ss would fade the
    // original timeline and can silently produce an empty trimmed clip.
    const filter = `atrim=start=${start}:duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:d=${attack},afade=t=out:st=${duration - release}:d=${release}`;
    const input = `${sources}/${source}.mp3`;
    const level = peak(['-i', input, '-af', `${filter},volumedetect`]);
    if (level < -60) throw new Error(`${input}: selected interval is silent`);
    const output = `${directory}/${name}.mp3`;
    run([
        '-v',
        'error',
        '-y',
        '-i',
        input,
        '-af',
        `${filter},volume=${target - level}dB`,
        '-ac',
        '1',
        '-ar',
        '44100',
        '-codec:a',
        'libmp3lame',
        '-b:a',
        '96k',
        '-map_metadata',
        '-1',
        output,
    ]);
    const exported = peak(['-i', output, '-af', 'volumedetect']);
    if (exported < -40 || exported > -1)
        throw new Error(`${output}: unexpected exported peak ${exported} dB`);
    process.stdout.write(
        `${name}: ${duration.toFixed(3)}s, peak ${exported} dB\n`
    );
};
[
    [1.10646, 1.36142],
    [2.32394, 2.49696],
    [3.638, 3.80285],
    [4.92544, 5.17694],
    [6.27983, 6.52477],
    [7.54773, 7.77133],
    [8.89769, 9.18529],
    [10.3751, 10.579],
    [11.6822, 11.8495],
    [13.0733, 13.2631],
    [14.4779, 14.6785],
].forEach(([start, end], index) =>
    exportClip({
        source: 'crunchy-bites',
        name: `crunch-${String(index + 1).padStart(2, '0')}`,
        start: start - 0.025,
        duration: end - start + 0.11,
        attack: 0.006,
        release: 0.04,
    })
);
[
    {
        source: 'cat-purr',
        name: 'cat-purr',
        start: 2.32,
        duration: 2.4,
        attack: 0.08,
        release: 0.3,
        target: -12,
    },
    {
        source: 'light-switch',
        name: 'light-switch',
        start: 0,
        duration: 0.574688,
        attack: 0.004,
        release: 0.025,
    },
    {
        source: 'magic-twinkle',
        name: 'magic-twinkle',
        start: 0,
        duration: 2.832,
        attack: 0.008,
        release: 0.12,
    },
    {
        source: 'santa',
        name: 'santa',
        start: 0,
        duration: 6.2,
        attack: 0.12,
        release: 0.4,
        target: -10,
    },
    {
        source: 'wood-door-knock',
        name: 'wood-door-knock',
        start: 0.23,
        duration: 1.1,
        attack: 0.004,
        release: 0.08,
        target: -8,
    },
    {
        source: 'glass-breaking',
        name: 'glass-breaking',
        start: 0.25,
        duration: 0.85,
        attack: 0.004,
        release: 0.12,
    },
    {
        source: 'snowman-steps',
        name: 'snowman-step',
        start: 0.78,
        duration: 0.5,
        attack: 0.025,
        release: 0.08,
        target: -12,
    },
].forEach(exportClip);
