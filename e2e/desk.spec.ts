import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { z } from 'zod';

import { publicConfigSchema } from '@winter/contracts';
import { setupSchema } from '@winter/contracts/exchange';

import type { HouseStage } from '../apps/web/src/app/core/house-scene';
import { cameraPose } from '../apps/web/src/app/scene/runtime/poses';

test.describe.configure({ mode: 'serial' });
const password = 'Winter-browser-test-8';
const family = Array.from({ length: 10 }, (_, i) => ({
    id: randomUUID(),
    displayName: `Guest ${i + 1}`,
}));
const headers = (origin: string, csrf: string) => ({
    origin,
    'x-csrf-token': csrf,
    'idempotency-key': randomUUID(),
});

test.beforeAll(async ({ request, baseURL }) => {
    expect(
        process.env['E2E_ALLOW_RESET'] === 'true' || !!process.env['CI'],
        'Browser tests reset only an explicitly authorised disposable season'
    ).toBe(true);
    const origin = baseURL ?? 'http://localhost:3000';
    const login = await request.post('/api/v1/organiser/auth/login', {
        headers: { origin },
        data: { password },
    });
    expect(login.status()).toBe(200);
    const initial = setupSchema.parse(
        await (await request.get('/api/v1/organiser/setup')).json()
    );
    const reset = await request.post('/api/v1/organiser/reset', {
        headers: headers(origin, initial.csrf),
        data: { seasonId: initial.season.id, confirmation: 'RESET' },
    });
    expect(reset.status()).toBe(200);
    const setup = setupSchema.parse(
        await (await request.get('/api/v1/organiser/setup')).json()
    );
    const saved = await request.put('/api/v1/organiser/setup', {
        headers: headers(origin, setup.csrf),
        data: {
            seasonId: setup.season.id,
            expectedVersion: 0,
            people: family,
            exclusions: [],
        },
    });
    expect(saved.status()).toBe(200);
    expect(
        (
            await request.post('/api/v1/organiser/open', {
                headers: headers(origin, setup.csrf),
                data: { seasonId: setup.season.id, expectedVersion: 1 },
            })
        ).status()
    ).toBe(200);
});
const enterHouse = async (page: Page, person: number) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page
        .getByRole('button', { name: 'Knock, knock', exact: true })
        .click();
    await page
        .getByRole('button', { name: `Guest ${person}`, exact: true })
        .click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    const repeat = page.getByLabel('Password, once more', { exact: true });
    if (await repeat.count()) await repeat.fill(password);
    await page.getByRole('button', { name: 'Come on in' }).click();
    await page
        .getByRole('button', { name: 'Sit at the desk', exact: true })
        .waitFor({ state: 'visible' });
};
const compose = async (page: Page) => {
    await page
        .getByRole('button', { name: 'Sit at the desk', exact: true })
        .click();
    await page.getByRole('button', { name: 'Write a wish' }).click();
};
test.setTimeout(90_000);

test('the actual house saves a wish, preserves drafts and serves notes on the named board', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterHouse(page, 1);
    await compose(page);
    await page.locator('#description').fill('A beautiful book');
    await page.locator('#wish-url').fill('https://example.com/book');
    await page.getByLabel('Would really love this', { exact: true }).check();
    const saved = page.waitForResponse(
        response =>
            response.url().endsWith('/me/wishes') &&
            response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Save my wish' }).click();
    expect((await saved).status()).toBe(200);
    await expect(
        page.getByText('A beautiful book', { exact: true })
    ).toBeVisible();
    const agreement = page.locator('wh-note-stack .guidelines');
    await expect(page.locator('.guidelines')).toHaveCount(1);
    await expect(agreement).toBeVisible();
    await expect(agreement).not.toHaveAttribute('open');
    await agreement.locator('summary').click();
    await expect(agreement).toHaveAttribute('open');
    await expect(agreement.locator('strong')).toBeVisible();
    await agreement.locator('summary').press('Enter');
    await expect(agreement).not.toHaveAttribute('open');
    await page.getByRole('button', { name: 'Write a wish' }).click();
    await page.locator('#description').fill('A winter walk');
    await page.getByRole('button', { name: 'Save my wish' }).click();
    const reading = page.locator('.note-content');
    await expect(page.locator('wh-note-stack nav')).toContainText('/ 2');
    await reading.press('ArrowLeft');
    await expect(reading).toContainText('A winter walk');
    await reading.press('ArrowRight');
    await expect(reading).toContainText('A beautiful book');
    const refreshed = page.waitForResponse(
        response =>
            response.url().endsWith('/me/wishes') &&
            response.request().method() === 'GET'
    );
    await page.getByRole('button', { name: 'Refresh notes' }).click();
    await refreshed;
    await expect(reading).toContainText('A beautiful book');
    await reading.dispatchEvent('pointerdown', {
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
    });
    await reading.dispatchEvent('pointerup', {
        pointerType: 'touch',
        clientX: 250,
        clientY: 105,
    });
    await expect(reading).toContainText('A winter walk');
    await page.getByRole('button', { name: 'Remove this wish' }).click();
    await page.getByRole('button', { name: 'Yes, remove it' }).click();
    await expect(reading).toContainText('A beautiful book');
    await page.getByRole('button', { name: 'Write a wish' }).click();
    await page.locator('#description').fill('A day together');
    await page.getByRole('button', { name: 'Simple view' }).click();
    await expect(page.locator('#description')).toHaveValue('A day together');
    await page.getByRole('button', { name: 'Magyar', exact: true }).click();
    await expect(page.locator('#description')).toHaveValue('A day together');
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: 'Piszkozat elvetése' }).click();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'Write a wish' }).click();
    await expect(page.locator('#description')).toHaveValue('');
});

test('phone paper supports all three priorities, focus restoration and context loss', async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 680 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterHouse(page, 2);
    await compose(page);
    await expect(page.getByRole('radio')).toHaveCount(3);
    const submit = await page
        .getByRole('button', { name: 'Save my wish' })
        .boundingBox();
    expect(submit?.height).toBeGreaterThanOrEqual(44);
    await page.locator('#description').fill('Tea and a day together');
    const bounds = await page.locator('.paper').boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
    await page.locator('#description').press('Escape');
    const seat = page.getByRole('button', {
        name: 'Sit at the desk',
        exact: true,
    });
    await expect(seat).toBeFocused();
    await compose(page);
    await expect(page.locator('#description')).toHaveValue(
        'Tea and a day together'
    );
    await page.locator('canvas').evaluate(canvas => {
        if (canvas instanceof HTMLCanvasElement)
            canvas
                .getContext('webgl2')
                ?.getExtension('WEBGL_lose_context')
                ?.loseContext();
    });
    await expect(
        page.getByRole('button', { name: 'Step into the house' })
    ).toBeVisible();
    await expect(page.locator('#description')).toHaveValue(
        'Tea and a day together'
    );
});

test('the room remains animated and ambient pause freezes its animation', async ({
    page,
}) => {
    await page.setViewportSize({ width: 960, height: 720 });
    await enterHouse(page, 3);
    const canvas = page.locator('canvas');
    const moving = await canvas.screenshot();
    await page.waitForTimeout(650);
    expect(moving.equals(await canvas.screenshot())).toBe(false);
    await page.getByRole('button', { name: 'Pause the snow' }).click();
    await page.waitForTimeout(300);
    const paused = await canvas.screenshot();
    await page.waitForTimeout(650);
    expect(paused.equals(await canvas.screenshot())).toBe(true);
});

test('a committed draw survives a lost response and reveals only its saved person', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterHouse(page, 4);
    await page
        .getByRole('button', { name: 'Pick something shiny', exact: true })
        .click();
    await page.route(
        '**/api/v1/me/draw',
        async route => {
            await route.fetch();
            await route.abort('failed');
        },
        { times: 1 }
    );
    await page.locator('.ornament-pin:enabled').first().click();
    const retry = page.getByRole('button', { name: 'Check my choice' });
    const revealed = page.getByRole('heading', {
        name: 'Your person is',
        exact: true,
    });
    await expect(retry.or(revealed)).toBeVisible();
    if (await retry.isVisible()) await retry.click();
    await expect(revealed).toBeVisible();
    const assignment = z
        .object({ recipient: z.object({ displayName: z.string() }) })
        .parse(await (await page.request.get('/api/v1/me/assignment')).json());
    await expect(page.locator('.tree-status h2')).toHaveText(
        assignment.recipient.displayName
    );
    await page.reload();
    await expect(page.locator('wh-note-stack')).toBeVisible();
});

test('the board opens a named paper stack and claims stay private from its owner', async ({
    page,
    browser,
    baseURL,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterHouse(page, 5);
    await page
        .getByRole('button', { name: 'The family’s wishes', exact: true })
        .click();
    await expect(page.locator('.name-cards button')).toHaveCount(8);
    await page.getByRole('button', { name: 'Guest 1', exact: true }).click();
    await expect(
        page.getByText('A beautiful book', { exact: true })
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'I’m getting this', exact: true })
        .click();
    await expect(
        page.getByText('You have this covered', { exact: true })
    ).toBeVisible();
    const ownerContext = await browser.newContext({
        baseURL,
        locale: 'hu-HU',
        reducedMotion: 'reduce',
    });
    try {
        const owner = await ownerContext.newPage();
        await enterHouse(owner, 1);
        await owner
            .getByRole('button', { name: 'Sit at the desk', exact: true })
            .click();
        await expect(
            owner.getByText('This note is tucked away and cannot be changed.', {
                exact: true,
            })
        ).toBeVisible();
        await expect(
            owner.getByRole('button', { name: 'Edit this wish' })
        ).toHaveCount(0);
        await expect(
            owner.locator('wh-note-stack').getByText('Guest 5', { exact: true })
        ).toHaveCount(0);
    } finally {
        await ownerContext.close();
    }
    await page
        .getByRole('button', { name: 'Put it back', exact: true })
        .click();
    await expect(
        page.getByRole('button', { name: 'I’m getting this' })
    ).toBeVisible();
});

test('organiser recovery produces a single-use link and keeps the house available', async ({
    page,
    browser,
    baseURL,
}) => {
    await page.goto('/organiser');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Come on in' }).click();
    await page.getByLabel('Confirm organiser password').fill(password);
    await page
        .locator('li')
        .filter({ hasText: 'Guest 2' })
        .getByRole('button', { name: 'Create private recovery link' })
        .click();
    const link = await page.locator('#recovery-link').inputValue();
    const context = await browser.newContext({ baseURL, locale: 'hu-HU' });
    try {
        const recovery = await context.newPage();
        await recovery.goto(link);
        await expect(recovery).toHaveURL(/\/recover$/);
        await recovery.getByRole('button', { name: 'EN', exact: true }).click();
        await recovery
            .getByLabel('New password', { exact: true })
            .fill('Fresh-browser-8');
        await recovery
            .getByLabel('Password, once more', { exact: true })
            .fill('Fresh-browser-8');
        await recovery
            .getByRole('button', { name: 'Set my new password' })
            .click();
        await expect(recovery.getByRole('status')).toContainText(
            'Your new password is ready'
        );
        await expect(recovery.locator('canvas')).toHaveCount(0);
        await recovery.goto(link);
        await expect(
            recovery.getByRole('button', { name: 'HU', exact: true })
        ).toBeVisible();
        await recovery
            .getByLabel('New password', { exact: true })
            .fill('Another-browser-8');
        await recovery
            .getByLabel('Password, once more', { exact: true })
            .fill('Another-browser-8');
        await recovery
            .getByRole('button', { name: 'Set my new password' })
            .click();
        await expect(recovery.getByRole('alert')).toContainText(
            'expired or was already used'
        );
    } finally {
        await context.close();
    }
});

test('a different identity in another tab clears the previous private room', async ({
    page,
    baseURL,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterHouse(page, 6);
    const bootstrap = z
        .object({ season: z.object({ id: z.string() }) })
        .parse(await (await page.request.get('/api/v1/bootstrap')).json());
    const login = await page.request.post('/api/v1/auth/login', {
        headers: { origin: baseURL ?? 'http://localhost:3000' },
        data: {
            participantId: family[0]?.id,
            seasonId: bootstrap.season.id,
            password,
        },
    });
    expect(login.status()).toBe(200);
    await page
        .getByRole('button', { name: 'Sit at the desk', exact: true })
        .click();
    await expect(
        page.getByRole('button', { name: 'Knock, knock', exact: true })
    ).toBeVisible();
    await expect(page.locator('wh-note-stack')).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Sign out', exact: true })
    ).toHaveCount(0);
});

test('home-screen assets and browser language work without loading the room', async ({
    browser,
    baseURL,
}) => {
    const context = await browser.newContext({ baseURL, locale: 'en-GB' });
    try {
        const page = await context.newPage();
        await page.goto('/recover');
        await expect(
            page.getByRole('button', { name: 'HU', exact: true })
        ).toBeVisible();
        await expect(page.locator('canvas')).toHaveCount(0);
        const manifest = z
            .object({
                display: z.literal('standalone'),
                icons: z.array(z.object({ src: z.string() })),
            })
            .parse(
                await (await page.request.get('/manifest.webmanifest')).json()
            );
        const icons = await Promise.all(
            manifest.icons.map(icon => page.request.get(icon.src))
        );
        expect(
            icons.every(
                icon =>
                    icon.ok() && icon.headers()['content-type'] === 'image/png'
            )
        ).toBe(true);
        await page.getByRole('button', { name: 'HU', exact: true }).click();
        await page.reload();
        await expect(
            page.getByRole('button', { name: 'EN', exact: true })
        ).toBeVisible();
    } finally {
        await context.close();
    }
});

test('a failed startup request leaves an accessible retry and then opens the house', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(
        '**/api/v1/public-config',
        route => route.abort('failed'),
        { times: 1 }
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(
        'The house is taking a moment'
    );
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Knock, knock', exact: true })
    ).toBeVisible();
    expect(errors).toEqual([]);
});

const scenePoint = (
    stage: HouseStage,
    position: readonly [number, number, number]
) => {
    const viewport = { width: 1280, height: 800 };
    const pose = cameraPose(stage, viewport);
    const camera = new PerspectiveCamera(
        pose.fov,
        viewport.width / viewport.height,
        0.1,
        150
    );
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
    const point = new Vector3(...position).project(camera);
    return {
        x: ((point.x + 1) * viewport.width) / 2,
        y: ((1 - point.y) * viewport.height) / 2,
    };
};

test('the house keeps physical cards visible and discovers lights, cat and zoom exits on the scene', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        const probe = window as Window & {
            soundDurations?: number[];
            soundPeaks?: number[];
        };
        probe.soundPeaks = [];
        probe.soundDurations = [];
        // eslint-disable-next-line @typescript-eslint/unbound-method -- applied below with the original audio node as this
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
            if (this.buffer) {
                probe.soundDurations?.push(this.buffer.duration);
                probe.soundPeaks?.push(
                    this.buffer
                        .getChannelData(0)
                        .reduce(
                            (peak, sample) => Math.max(peak, Math.abs(sample)),
                            0
                        )
                );
            }
            start.apply(this, args);
        };
    });
    const sounds = () =>
        page.evaluate(
            () =>
                (window as Window & { soundDurations?: number[] })
                    .soundDurations ?? []
        );
    await page.goto('/');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page
        .getByRole('button', { name: 'Knock, knock', exact: true })
        .waitFor();
    expect(await sounds()).toEqual([]);
    await expect(
        page.getByRole('button', { name: 'Sound on' })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    performance
                        .getEntriesByType('resource')
                        .filter(entry => entry.name.includes('/audio/')).length
            )
        )
        .toBe(18);
    const lantern = scenePoint('outside', [-1.65, 0.34, 5.2]);
    const before = await page.locator('canvas').screenshot();
    await page.mouse.click(lantern.x, lantern.y);
    await expect.poll(async () => (await sounds()).length).toBe(1);
    expect((await sounds())[0]).toBeCloseTo(0.575, 1);
    await expect
        .poll(async () =>
            (await page.locator('canvas').screenshot()).equals(before)
        )
        .toBe(false);
    await page.mouse.click(lantern.x, lantern.y);
    await expect
        .poll(async () =>
            (await page.locator('canvas').screenshot()).equals(before)
        )
        .toBe(true);
    await page
        .getByRole('button', { name: 'Knock, knock', exact: true })
        .click();
    await expect(page.locator('.name-grid button')).toHaveCount(10);
    await expect.poll(async () => (await sounds()).length).toBe(3);
    expect((await sounds())[2]).toBeCloseTo(1.1, 1);
    await page.getByRole('button', { name: 'Guest 7', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page
        .getByLabel('Password, once more', { exact: true })
        .fill(password);
    await page.getByRole('button', { name: 'Come on in' }).click();
    await page
        .getByRole('button', { name: 'Sit at the desk', exact: true })
        .waitFor();
    await expect(page.locator('.board-surface')).toBeVisible();
    await expect(page.locator('.name-cards button').first()).toBeVisible();
    await expect(
        page.locator('[data-anchor=sofa], [data-anchor=cookie]')
    ).toHaveCount(0);
    await expect.poll(async () => (await sounds()).length).toBe(3);
    const cat = scenePoint('room', [-1.44, 0.71, 2.09]);
    await page.mouse.click(cat.x, cat.y);
    await expect(page.getByRole('status')).toContainText(
        'The wrapping paper is mine'
    );
    await expect.poll(async () => (await sounds()).length).toBe(4);
    expect((await sounds())[3]).toBeCloseTo(2.4, 1);
    const star = scenePoint('room', [2.5, 4.03, -1.7]);
    await page.mouse.click(star.x, star.y);
    await expect.poll(async () => (await sounds()).length).toBe(5);
    expect((await sounds())[4]).toBeCloseTo(2.832, 1);
    const cookie = scenePoint('room', [-2.19, 1.03, 2.14]);
    await page.mouse.click(cookie.x, cookie.y);
    await expect.poll(async () => (await sounds()).length).toBe(7);
    expect((await sounds())[5]).toBeLessThan(0.5);
    const chair = page.locator('[data-anchor=desk]');
    const originalAnchor = await chair.getAttribute('style');
    await page.mouse.move(1100, 650);
    await page.mouse.down();
    await page.mouse.move(850, 610, { steps: 12 });
    await page.mouse.up();
    await expect(chair).toBeVisible();
    await expect(chair).not.toHaveAttribute('style', originalAnchor ?? '');
    await page
        .getByRole('button', { name: 'Pick something shiny', exact: true })
        .click();
    await expect(page.locator('.tree-status')).toBeVisible();
    await expect(page.locator('.hotspots')).not.toHaveAttribute('inert');
    await page.mouse.click(20, 400);
    await page
        .getByRole('button', { name: 'Sit at the desk', exact: true })
        .waitFor();
    await page
        .getByRole('button', { name: 'The family’s wishes', exact: true })
        .click();
    await expect(page.locator('.board-surface')).not.toHaveAttribute('inert');
    await expect(page.locator('.hotspots')).not.toHaveAttribute('inert');
    await page.mouse.click(20, 400);
    await page
        .getByRole('button', { name: 'Sit at the desk', exact: true })
        .click();
    await page.getByRole('button', { name: 'Write a wish' }).waitFor();
    await expect.poll(async () => (await sounds()).length).toBe(8);
    await expect(page.locator('.paper')).not.toHaveAttribute('inert');
    await expect(page.locator('.hotspots')).not.toHaveAttribute('inert');
    await page.mouse.click(20, 400);
    await expect(
        page.getByRole('button', { name: 'Sit at the desk', exact: true })
    ).toBeVisible();
    await expect.poll(async () => (await sounds()).length).toBe(9);
    await page.getByRole('button', { name: 'Sound on' }).click();
    await page.mouse.click(star.x, star.y);
    expect((await sounds()).length).toBe(9);
    const peaks = await page.evaluate(
        () => (window as Window & { soundPeaks?: number[] }).soundPeaks ?? []
    );
    expect(peaks).toHaveLength(9);
    expect(peaks.every(peak => peak > 0.01)).toBe(true);
});

test('sound starts on the first gesture and configured music loops, mutes and resumes', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/v1/public-config', async route => {
        const response = await route.fetch();
        const config = publicConfigSchema.parse(await response.json());
        await route.fulfill({
            response,
            json: {
                ...config,
                audio: {
                    backgroundMusic: '/audio/magic-twinkle.mp3',
                    musicVolume: 0.15,
                },
            },
        });
    });
    await page.addInitScript(() => {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with the original media element as this
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            const probe = window as Window & {
                backgroundTrack?: HTMLMediaElement;
            };
            probe.backgroundTrack = this;
            return play.call(this);
        };
    });
    const playing = () =>
        page.evaluate(() => {
            const track = (
                window as Window & { backgroundTrack?: HTMLMediaElement }
            ).backgroundTrack;
            return !!track && !track.paused && track.currentTime > 0;
        });
    await page.goto('/');
    const toggle = page.locator('[data-sound-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-anchor=door]').waitFor();
    expect(await playing()).toBe(false);
    // Muting can be the very first gesture, without unlocking unwanted audio.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await playing()).toBe(false);
    await page.reload();
    await page.locator('[data-anchor=door]').waitFor();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect.poll(playing).toBe(true);
    expect(
        await page.evaluate(
            () =>
                (window as Window & { backgroundTrack?: HTMLMediaElement })
                    .backgroundTrack?.loop
        )
    ).toBe(true);
    await toggle.click();
    await expect.poll(playing).toBe(false);
    await page.getByRole('button', { name: 'Magyar', exact: true }).click();
    expect(await playing()).toBe(false);
    await toggle.click();
    await expect.poll(playing).toBe(true);
});

test('choosing an ornament plays the recorded glass break once', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
        const probe = window as Window & { glassBreaks?: number };
        probe.glassBreaks = 0;
        // eslint-disable-next-line @typescript-eslint/unbound-method -- invoked with the original audio node below
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
            if (this.buffer && Math.abs(this.buffer.duration - 0.85) < 0.01) {
                const peak = this.buffer
                    .getChannelData(0)
                    .reduce(
                        (value, sample) => Math.max(value, Math.abs(sample)),
                        0
                    );
                if (peak > 0.01)
                    probe.glassBreaks = (probe.glassBreaks ?? 0) + 1;
            }
            start.apply(this, args);
        };
    });
    const breaks = () =>
        page.evaluate(
            () => (window as Window & { glassBreaks?: number }).glassBreaks ?? 0
        );
    await enterHouse(page, 8);
    await page
        .getByRole('button', { name: 'Pick something shiny', exact: true })
        .click();
    expect(await breaks()).toBe(0);
    await page.locator('.ornament-pin:enabled').first().click();
    await expect(
        page.getByRole('heading', { name: 'Your person is', exact: true })
    ).toBeVisible();
    await expect.poll(breaks).toBe(1);
});
