import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const launcher = 'https://xd-play.com/games/legend-ball-x1000/play';
const gameUrl = 'https://legendballx.xd-play.com/play/';
const output = 'qa-artifacts/legendballx-live-launcher';
await mkdir(output, { recursive: true });

for (const [name, engine, viewport] of [
  ['desktop-chromium', chromium, { width: 1440, height: 900 }],
  ['mobile-webkit', webkit, { width: 390, height: 844 }]
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport, hasTouch: engine === webkit });
    page.setDefaultTimeout(30000);
    const response = await page.goto(launcher, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    const frameSources = response.headers()['content-security-policy']
      .split(';').map(s => s.trim()).find(s => s.startsWith('frame-src '));
    assert.equal(frameSources, 'frame-src https://legendballx.xd-play.com');
    const iframe = page.locator('iframe');
    assert.equal(await iframe.count(), 1);
    assert.equal(await iframe.getAttribute('src'), gameUrl);
    const game = page.frameLocator('#game-frame');
    const button = name => game.getByRole('button', { name, exact: true });
    await button('ENTER LEGEND BALL X1000').click();
    await button('Menu permainan').click();
    const sound = game.getByRole('switch', { name: /SOUND/ });
    const initialSound = await sound.isChecked();
    await sound.click();
    assert.notEqual(await sound.isChecked(), initialSound);
    await sound.click();
    assert.equal(await sound.isChecked(), initialSound);
    let fullscreen = 'not exercised on emulated mobile';
    if (engine === chromium) {
      await button('Layar penuh').click();
      await page.waitForFunction(() => document.fullscreenElement?.id === 'game-frame');
      await game.locator('html').evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.fullscreenElement);
      fullscreen = 'entered and exited';
    } else {
      await button('Tutup menu').click();
    }

    const amounts = game.getByRole('button', { name: 'Ganti tampilan kredit atau koin', exact: true });
    const before = await amounts.allTextContents();
    await button('Tambah bet').click();
    assert.notDeepEqual(await amounts.allTextContents(), before);
    await button('Kurangi bet').click();
    assert.deepEqual(await amounts.allTextContents(), before);
    await button('Buka aturan').click();
    await game.getByRole('dialog', { name: /GAME RULES/ }).waitFor();
    await button('Tutup aturan').click();
    const spin = await button('Mulai spin').boundingBox();
    assert(spin && spin.x >= 0 && spin.y >= 0 && spin.x + spin.width <= viewport.width + 1 &&
      spin.y + spin.height <= viewport.height + 1, 'spin control must fit the launcher viewport');
    await page.screenshot({ path: output + '/' + name + '.png' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await button('ENTER LEGEND BALL X1000').click();
    await button('Mulai spin').waitFor();
    console.log(JSON.stringify({ name, viewport, iframe: gameUrl, fullscreen, refresh: 'passed' }));
  } finally {
    await browser.close();
  }
}
