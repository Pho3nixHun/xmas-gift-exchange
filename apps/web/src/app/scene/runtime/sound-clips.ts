export type SoundEffect =
    | 'cookie'
    | 'cat'
    | 'star'
    | 'lights'
    | 'santa'
    | 'snowman'
    | 'glass'
    | 'knock';
const bites = Array.from(
    { length: 11 },
    (_, i) => `/audio/crunch-${String(i + 1).padStart(2, '0')}.mp3`
);
const paths = {
    cat: '/audio/cat-purr.mp3',
    star: '/audio/magic-twinkle.mp3',
    lights: '/audio/light-switch.mp3',
    santa: '/audio/santa.mp3',
    snowman: '/audio/snowman-step.mp3',
    glass: '/audio/glass-breaking.mp3',
    knock: '/audio/wood-door-knock.mp3',
};
const levels = {
    cookie: 0.65,
    cat: 0.85,
    star: 0.4,
    lights: 0.5,
    santa: 0.35,
    snowman: 0.5,
    glass: 0.5,
    knock: 0.6,
};

// One unlocked context, cached decoded clips, and a bounded voice per effect.
export const createSoundClips = (
    load: (path: string) => Promise<ArrayBuffer>
) => {
    const state = {
        context: null as AudioContext | null,
        enabled: false,
        epoch: 0,
        bite: -1,
    };
    const buffers = new Map<string, Promise<AudioBuffer | undefined>>();
    const voices = new Map<SoundEffect, Set<AudioBufferSourceNode>>();
    const revisions = new Map<SoundEffect, number>();
    const decode = (context: AudioContext, path: string) => {
        const cached = buffers.get(path);
        if (cached) return cached;
        const pending = load(path)
            .then(bytes => context.decodeAudioData(bytes))
            .catch(() => {
                buffers.delete(path);
                return undefined;
            });
        buffers.set(path, pending);
        return pending;
    };
    const stop = (kind: SoundEffect) => {
        voices.get(kind)?.forEach(source => source.stop());
        voices.delete(kind);
    };
    const nextBite = () => {
        // Always choose a different crunch from the previous bite.
        const next =
            (state.bite + 1 + Math.floor(Math.random() * (bites.length - 1))) %
            bites.length;
        state.bite = next;
        return bites[next] ?? '/audio/crunch-01.mp3';
    };
    const start = (
        context: AudioContext,
        buffer: AudioBuffer,
        kind: SoundEffect,
        delay: number,
        level: number
    ) => {
        const source = context.createBufferSource(),
            gain = context.createGain();
        source.buffer = buffer;
        gain.gain.value = levels[kind] * level;
        source.connect(gain);
        gain.connect(context.destination);
        const active = voices.get(kind) ?? new Set<AudioBufferSourceNode>();
        voices.set(kind, active);
        active.add(source);
        source.onended = () => {
            active.delete(source);
            source.disconnect();
            gain.disconnect();
        };
        source.start(context.currentTime + delay);
    };
    const play = async (kind: SoundEffect, level: number) => {
        const context = state.context;
        if (!context || !state.enabled) return;
        const epoch = state.epoch,
            requested = performance.now();
        const revision = (revisions.get(kind) ?? 0) + 1;
        revisions.set(kind, revision);
        stop(kind);
        const selected =
            kind === 'cookie' ? [nextBite(), nextBite()] : [paths[kind]];
        const clips = await Promise.all(
            selected.map(path => decode(context, path))
        );
        // A slow download or a muted/hidden tab must never replay a stale action.
        if (
            state.epoch !== epoch ||
            revisions.get(kind) !== revision ||
            performance.now() - requested > 350
        )
            return;
        clips.forEach((buffer, i) => {
            if (buffer) start(context, buffer, kind, i * 0.4, level);
        });
    };
    return {
        enable: (context: AudioContext) => {
            state.context = context;
            state.enabled = true;
            [...bites, ...Object.values(paths)].forEach(path => {
                void decode(context, path);
            });
        },
        disable: () => {
            state.enabled = false;
            state.epoch++;
            voices.forEach((_, kind) => stop(kind));
        },
        stop: (kind: SoundEffect) => {
            revisions.set(kind, (revisions.get(kind) ?? 0) + 1);
            stop(kind);
        },
        play: (kind: SoundEffect, level = 1) => {
            void play(kind, level);
        },
    };
};
