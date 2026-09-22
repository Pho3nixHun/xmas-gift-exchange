import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { SoundAssets } from '../../data-access/sound-assets';

import { createBackgroundMusic } from './background-music';
import { createSoundClips } from './sound-clips';
import type { SoundEffect } from './sound-clips';

@Injectable({ providedIn: 'root' })
export class HouseSound {
    readonly enabled = signal(true);
    private readonly contexts = new Set<AudioContext>();
    private readonly assets = inject(SoundAssets);
    private readonly clips = createSoundClips(path => this.assets.load(path));
    private readonly music = createBackgroundMusic();
    private readonly tones = new Set<OscillatorNode>();
    constructor() {
        const unlock = (event: Event) => {
            if (
                event.target instanceof Element &&
                event.target.closest('[data-sound-toggle]')
            )
                return;
            void this.resume();
        };
        const visibility = () => {
            if (document.hidden) {
                this.silence();
                this.contexts.forEach(context => {
                    void context.suspend();
                });
            } else void this.resume(false);
        };
        document.addEventListener('pointerdown', unlock, true);
        document.addEventListener('keydown', unlock, true);
        document.addEventListener('visibilitychange', visibility);
        inject(DestroyRef).onDestroy(() => {
            document.removeEventListener('pointerdown', unlock, true);
            document.removeEventListener('keydown', unlock, true);
            document.removeEventListener('visibilitychange', visibility);
            this.silence();
            this.music.dispose();
            this.contexts.forEach(context => {
                void context.close();
            });
        });
    }
    configureMusic(settings?: {
        readonly backgroundMusic: string | null;
        readonly musicVolume: number;
    }) {
        this.music.configure(
            settings?.backgroundMusic ?? null,
            settings?.musicVolume ?? 0.2
        );
        const context = [...this.contexts][0];
        if (context && this.enabled() && !document.hidden)
            this.music.resume(context);
    }
    private async resume(allowCreate = true) {
        if (!this.enabled() || document.hidden) return false;
        const existing = [...this.contexts][0];
        if (!existing && !allowCreate) return false;
        try {
            const context = existing ?? new AudioContext();
            this.contexts.add(context);
            // Both playback APIs are called synchronously inside the gesture.
            this.clips.enable(context);
            this.music.resume(context);
            if (context.state !== 'running') await context.resume();
            return this.enabled() && !document.hidden;
        } catch {
            // Autoplay restrictions or unavailable audio must not block the app.
            return false;
        }
    }
    async toggle() {
        const on = !this.enabled();
        this.enabled.set(on);
        if (on) {
            if (await this.resume()) this.chime();
        } else {
            this.silence();
            await Promise.all(
                [...this.contexts].map(context => context.suspend())
            );
        }
    }
    private note(
        frequency: number,
        time: number,
        length: number,
        gain: number
    ) {
        const context = [...this.contexts][0];
        if (!context || !this.enabled() || document.hidden) return;
        const oscillator = context.createOscillator(),
            volume = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        volume.gain.setValueAtTime(0, context.currentTime + time);
        volume.gain.linearRampToValueAtTime(
            gain,
            context.currentTime + time + 0.012
        );
        volume.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + time + length
        );
        oscillator.connect(volume);
        volume.connect(context.destination);
        this.tones.add(oscillator);
        oscillator.start(context.currentTime + time);
        oscillator.stop(context.currentTime + time + length + 0.02);
        oscillator.onended = () => {
            this.tones.delete(oscillator);
            oscillator.disconnect();
            volume.disconnect();
        };
    }
    chime() {
        [659.25, 783.99, 987.77].forEach((frequency, i) =>
            this.note(frequency, i * 0.1, 0.9, 0.045)
        );
    }
    effect(kind: SoundEffect, level = 1) {
        this.clips.play(kind, level);
    }
    stop(kind: SoundEffect) {
        this.clips.stop(kind);
    }
    private silence() {
        this.clips.disable();
        this.music.pause();
        this.tones.forEach(tone => tone.stop());
        this.tones.clear();
    }
}
