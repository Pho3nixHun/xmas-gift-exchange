import { describe, expect, it, vi } from 'vitest';

import { createVisitorSounds } from './visitor-sounds';

describe('outdoor visitor audio', () => {
    it('plays Santa once per visible pass, including when the direction changes', () => {
        const play = vi.fn(),
            stop = vi.fn();
        const visitors = createVisitorSounds(play, stop);
        visitors.tick(6, -1, null);
        expect(play).not.toHaveBeenCalled();
        visitors.tick(9, -0.7, null);
        visitors.tick(10, -0.5, null);
        expect(play).toHaveBeenCalledExactlyOnceWith('santa');
        visitors.tick(22, null, null);
        expect(stop).toHaveBeenCalledExactlyOnceWith('santa');
        visitors.tick(61, 0.7, null);
        expect(play).toHaveBeenCalledTimes(2);
    });
    it('ties quieter edge-of-screen footsteps to gait instead of frame rate', () => {
        const play = vi.fn();
        const visitors = createVisitorSounds(play, vi.fn());
        visitors.tick(7, null, 0.9);
        visitors.tick(7.01, null, 0.9);
        visitors.tick(8, null, 0);
        expect(play).toHaveBeenCalledTimes(2);
        expect(play.mock.calls[0]?.[1]).toBeCloseTo(0.19);
        expect(play).toHaveBeenLastCalledWith('snowman', 1);
    });
    it('stops both visitors on pause or entry and does not restart Santa mid-pass', () => {
        const play = vi.fn(),
            stop = vi.fn();
        const visitors = createVisitorSounds(play, stop);
        visitors.tick(9, 0, 0);
        visitors.silence();
        visitors.silence();
        expect(stop.mock.calls).toEqual([['santa'], ['snowman']]);
        visitors.tick(9, 0, 0);
        expect(play).toHaveBeenCalledTimes(2);
    });
});
