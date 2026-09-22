import { describe, expect, it, vi } from 'vitest';

import { createBackgroundMusic } from './background-music';

const fixture = () => {
    const media = {
        paused: true,
        src: '',
        loop: false,
        preload: '',
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        removeAttribute: vi.fn(),
        load: vi.fn(),
    };
    const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const fakeContext = {
        createMediaElementSource: vi.fn(() => source),
        createGain: () => gain,
        destination: {},
    };
    const context = fakeContext as unknown as AudioContext;
    const create = vi.fn(() => media as unknown as HTMLAudioElement);
    return {
        music: createBackgroundMusic(create),
        media,
        create,
        gain,
        source,
        context,
    };
};
describe('streamed background music', () => {
    it('does not create or load a track until configured and unlocked', () => {
        const { music, create, context, media, gain } = fixture();
        music.resume(context);
        expect(create).not.toHaveBeenCalled();
        music.configure('/media/winter.mp3', 0.2);
        expect(create).not.toHaveBeenCalled();
        music.resume(context);
        expect(media.src).toBe('/media/winter.mp3');
        expect(media.loop).toBe(true);
        expect(media.preload).toBe('none');
        expect(gain.gain.value).toBe(0.2);
        expect(media.play).toHaveBeenCalledOnce();
    });
    it('reuses the same stream on resume and adjusts gain without reloading', () => {
        const { music, context, create, media, gain } = fixture();
        music.configure('/media/winter.mp3', 0.2);
        music.resume(context);
        music.pause();
        music.configure('/media/winter.mp3', 0.4);
        music.resume(context);
        expect(create).toHaveBeenCalledOnce();
        expect(media.pause).toHaveBeenCalledOnce();
        expect(gain.gain.value).toBe(0.4);
        expect(media.load).not.toHaveBeenCalled();
    });
    it('releases the stream and nodes when music is removed from configuration', () => {
        const { music, context, media, source, gain } = fixture();
        music.configure('/media/winter.mp3', 0.2);
        music.resume(context);
        music.configure(null, 0.2);
        expect(media.pause).toHaveBeenCalledOnce();
        expect(media.removeAttribute).toHaveBeenCalledWith('src');
        expect(media.load).toHaveBeenCalledOnce();
        expect(source.disconnect).toHaveBeenCalledOnce();
        expect(gain.disconnect).toHaveBeenCalledOnce();
    });
});
