import { describe, expect, it, vi } from 'vitest';

import { createSoundClips } from './sound-clips';

const fixture = () => {
    const sources: {
        buffer: AudioBuffer | null;
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
    }[] = [];
    const decode = vi.fn(() => {
        const buffer = { duration: 0.3 };
        return Promise.resolve(buffer as AudioBuffer);
    });
    const fakeContext = {
        currentTime: 12,
        destination: {},
        decodeAudioData: decode,
        createBufferSource: () => {
            const source = {
                buffer: null,
                connect: vi.fn(),
                disconnect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
                onended: null,
            };
            sources.push(source);
            return source;
        },
        createGain: () => ({
            gain: { value: 0 },
            connect: vi.fn(),
            disconnect: vi.fn(),
        }),
    };
    const context = fakeContext as unknown as AudioContext;
    return { sources, context, decode };
};
const settle = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('recorded sound effects', () => {
    it('does not load or play audio until explicitly enabled', async () => {
        const load = vi.fn(() => Promise.resolve(new ArrayBuffer(1)));
        const clips = createSoundClips(load);
        clips.play('cat');
        await settle();
        expect(load).not.toHaveBeenCalled();
    });
    it('decodes each clip once and replaces repeated effects instead of piling up voices', async () => {
        const { context, sources, decode } = fixture();
        const load = vi.fn(() => Promise.resolve(new ArrayBuffer(1)));
        const clips = createSoundClips(load);
        clips.enable(context);
        await settle();
        clips.play('star');
        await settle();
        clips.play('star');
        await settle();
        expect(sources).toHaveLength(2);
        expect(sources[0]?.stop).toHaveBeenCalledOnce();
        expect(load).toHaveBeenCalledTimes(18);
        expect(decode).toHaveBeenCalledTimes(18);
    });
    it('stops current and scheduled bites when muted and does not resume them', async () => {
        const { context, sources } = fixture();
        const clips = createSoundClips(() =>
            Promise.resolve(new ArrayBuffer(1))
        );
        clips.enable(context);
        await settle();
        clips.play('cookie');
        await settle();
        expect(sources).toHaveLength(2);
        expect(sources[0]?.buffer).not.toBe(sources[1]?.buffer);
        expect(sources[1]?.start).toHaveBeenCalledWith(12.4);
        clips.disable();
        sources.forEach(source => expect(source.stop).toHaveBeenCalledOnce());
        clips.enable(context);
        await settle();
        expect(sources).toHaveLength(2);
    });
    it('discards an interaction when muted during its download', async () => {
        const { context, sources } = fixture();
        let resolve: (value: ArrayBuffer) => void = () => undefined;
        const bytes = new Promise<ArrayBuffer>(done => {
            resolve = done;
        });
        const clips = createSoundClips(() => bytes);
        clips.enable(context);
        clips.play('cat');
        clips.disable();
        clips.enable(context);
        resolve(new ArrayBuffer(1));
        await settle();
        expect(sources).toHaveLength(0);
    });
    it('tolerates unavailable assets and retries on the next interaction', async () => {
        const { context, sources } = fixture();
        const load = vi.fn(() => Promise.reject(new Error('offline')));
        const clips = createSoundClips(load);
        clips.enable(context);
        await settle();
        clips.play('lights');
        await settle();
        expect(load).toHaveBeenCalledTimes(19);
        expect(sources).toHaveLength(0);
    });
});
