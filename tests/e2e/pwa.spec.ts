import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function waitUntilControlled(page: Page) {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('given a visited app, when the network is lost and the page reloads, then the app still loads', async ({ page, context }) => {
  await waitUntilControlled(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle('Watercolor');
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('given the app served under a sub-path, when the service worker registers, then its scope is that sub-path', async ({ page }) => {
  await page.goto('./');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(new URL('./', page.url()).href);
});

test('given a launched project file, when the installed app receives it, then the project opens', async ({ browser }) => {
  const saver = await (await browser.newContext({ acceptDownloads: true })).newPage();
  await saver.goto('./');
  await expect(saver.locator('canvas').first()).toBeVisible();
  const [download] = await Promise.all([saver.waitForEvent('download'), saver.keyboard.press('Control+s')]);
  const path = await download.path();
  const name = download.suggestedFilename();
  const bytes = (await readFile(path)).toString('base64');

  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: { setConsumer(fn: unknown) { (window as unknown as { launch: unknown }).launch = fn; } },
    });
  });
  await page.goto('./');
  await page.waitForFunction(() => 'launch' in window);
  // the toast is only up for about a second, so record what it says instead of polling for it
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { toasts: string[] }).toasts = seen;
    new MutationObserver(() => { const text = document.querySelector('.toast')?.textContent; if (text) seen.push(text); })
      .observe(document.querySelector('.toast')!, { childList: true, characterData: true, subtree: true });
  });
  await page.evaluate(async ([fileName, data]) => {
    const file = new File([Uint8Array.from(atob(data), c => c.charCodeAt(0))], fileName);
    await (window as unknown as { launch: (p: unknown) => Promise<void> }).launch({ files: [{ getFile: async () => file }] });
  }, [name, bytes]);
  await expect.poll(() => page.evaluate(() => (window as unknown as { toasts: string[] }).toasts)).toContain(`Opened ${name}`);
});
