import { describe, expect, it } from 'vitest';

import {
    analyticsConfigSchema,
    audioConfigSchema,
    publicConfigSchema,
    wishDraftSchema,
} from './index.js';

describe('wish input at the trust boundary', () => {
    it('counts Unicode code points and trims descriptions', () => {
        const wish = {
            description: `  ${'🎄'.repeat(500)}  `,
            url: '',
            priority: 'high',
        };
        expect(wishDraftSchema.parse(wish).description).toHaveLength(1000);
        expect(
            wishDraftSchema.safeParse({
                ...wish,
                description: '🎄'.repeat(501),
            }).success
        ).toBe(false);
    });
    it.each([
        'javascript:alert(1)',
        'data:text/html,test',
        'https://user:secret@example.com',
    ])('rejects unsafe URLs: %s', url => {
        expect(
            wishDraftSchema.safeParse({
                description: 'A book',
                url,
                priority: 'medium',
            }).success
        ).toBe(false);
    });
    it('rejects ownership and claim properties supplied by a caller', () => {
        expect(
            wishDraftSchema.safeParse({
                description: 'A book',
                url: '',
                priority: 'low',
                ownerId: 'someone-else',
            }).success
        ).toBe(false);
    });
    it('does not allow a secret to enter public configuration', () => {
        expect(
            publicConfigSchema.safeParse({ databaseUrl: 'postgres://private' })
                .success
        ).toBe(false);
    });
});

describe('deployment audio settings', () => {
    it('leaves music optional and applies a quiet default volume', () => {
        expect(audioConfigSchema.parse({})).toEqual({
            backgroundMusic: null,
            musicVolume: 0.2,
        });
        expect(
            audioConfigSchema.parse({
                backgroundMusic: '/media/Christmas%20music.mp3',
            }).backgroundMusic
        ).toBe('/media/Christmas%20music.mp3');
    });
    it.each([
        '//other.example/music.mp3',
        'https://other.example/music.mp3',
        'file:///music.mp3',
        'music.mp3',
    ])('requires a public same-origin file path: %s', backgroundMusic => {
        expect(audioConfigSchema.safeParse({ backgroundMusic }).success).toBe(
            false
        );
    });
    it('rejects out-of-range volume', () => {
        expect(audioConfigSchema.safeParse({ musicVolume: 2 }).success).toBe(
            false
        );
    });
});

describe('deployment analytics settings', () => {
    it('stays off unless the deployment names a tracker', () => {
        expect(analyticsConfigSchema.parse(undefined)).toBeNull();
        expect(
            analyticsConfigSchema.parse({ trackerPath: '/stats/', siteId: '3' })
        ).toEqual({ trackerPath: '/stats/', siteId: '3' });
    });
    it.each([
        { trackerPath: 'https://other.example/', siteId: '3' },
        { trackerPath: '//other.example/', siteId: '3' },
        { trackerPath: '/stats', siteId: '3' },
        { trackerPath: '/stats/', siteId: '0' },
        { trackerPath: '/stats/', siteId: '3', cookies: true },
    ])('requires a same-origin path and a site number: %o', analytics => {
        expect(analyticsConfigSchema.safeParse(analytics).success).toBe(false);
    });
});
