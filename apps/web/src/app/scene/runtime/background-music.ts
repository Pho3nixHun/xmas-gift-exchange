// Stream long tracks through a media element rather than decoding the whole
// song into memory. A gain node also controls volume on mobile Safari.
export const createBackgroundMusic = (createAudio = () => new Audio()) => {
    const state: {
        path: string | null;
        volume: number;
        audio: HTMLAudioElement | null;
        gain: GainNode | null;
        source: MediaElementAudioSourceNode | null;
    } = { path: null, volume: 0.2, audio: null, gain: null, source: null };
    const pause = () => state.audio?.pause();
    const dispose = () => {
        pause();
        if (state.audio) {
            state.audio.removeAttribute('src');
            state.audio.load();
        }
        state.source?.disconnect();
        state.gain?.disconnect();
        state.audio = null;
        state.source = null;
        state.gain = null;
    };
    return {
        configure: (path: string | null, volume: number) => {
            if (path !== state.path) dispose();
            state.path = path;
            state.volume = volume;
            if (state.gain) state.gain.gain.value = volume;
        },
        resume: (context: AudioContext) => {
            if (!state.path) return;
            if (!state.audio) {
                const audio = createAudio();
                audio.preload = 'none';
                audio.loop = true;
                audio.src = state.path;
                const source = context.createMediaElementSource(audio);
                const gain = context.createGain();
                gain.gain.value = state.volume;
                source.connect(gain);
                gain.connect(context.destination);
                state.audio = audio;
                state.source = source;
                state.gain = gain;
            }
            // A policy rejection leaves the track ready for the next gesture.
            if (state.audio.paused)
                void state.audio.play().catch(() => undefined);
        },
        pause,
        dispose,
    };
};
