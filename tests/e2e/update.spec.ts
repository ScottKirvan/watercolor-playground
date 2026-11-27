import { expect, test, type Page } from '@playwright/test';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const swFile = join(process.cwd(), 'dist', 'sw.js');
let originalSw = '';

test.beforeEach(async () => { originalSw = await readFile(swFile, 'utf8'); });
test.afterEach(async () => { await writeFile(swFile, originalSw); });

async function visitAndWaitForNewVersion(page: Page) {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.evaluate(() => { (window as unknown as { sameLoad: boolean }).sameLoad = true; });
  await appendFile(swFile, `\n// new version ${Date.now()}\n`);
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
}

const reloaded = (page: Page) => expect.poll(async () => {
  try { return await page.evaluate(() => (window as unknown as { sameLoad?: boolean }).sameLoad); } catch { return 'navigating'; }
}, { timeout: 20_000 }).toBeUndefined();
const stayedOnSamePage = async (page: Page) => {
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { sameLoad?: boolean }).sameLoad)).toBe(true);
};

async function paintAStroke(page: Page) {
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: /^undo/i })).toBeEnabled();
}

test('given a new version and a blank sheet, when the user updates, then the page reloads without asking to save', async ({ page }) => {
  await visitAndWaitForNewVersion(page);
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  const notice = page.getByRole('dialog', { name: 'App update' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('A new version is available.');
  await notice.getByRole('button', { name: 'Update', exact: true }).click();
  await reloaded(page);
  expect(downloaded).toBe(false);
});

test('given a new version and a painting, when the user chooses to save and update, then the project downloads and the page reloads', async ({ page }) => {
  await visitAndWaitForNewVersion(page);
  await paintAStroke(page);
  await page.getByRole('dialog', { name: 'App update' }).getByRole('button', { name: 'Update', exact: true }).click();
  const question = page.getByRole('dialog', { name: 'Unsaved painting' });
  await expect(question).toBeVisible();
  await expect(question).toContainText('discards your current painting');
  await stayedOnSamePage(page);
  const [download] = await Promise.all([page.waitForEvent('download'), question.getByRole('button', { name: 'Save, then update' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.wcp$/);
  await reloaded(page);
});

test('given a new version and a painting, when the user chooses to update without saving, then the page reloads and nothing downloads', async ({ page }) => {
  await visitAndWaitForNewVersion(page);
  await paintAStroke(page);
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  await page.getByRole('dialog', { name: 'App update' }).getByRole('button', { name: 'Update', exact: true }).click();
  await page.getByRole('dialog', { name: 'Unsaved painting' }).getByRole('button', { name: 'Update without saving' }).click();
  await reloaded(page);
  expect(downloaded).toBe(false);
});

test('given a new version, when the user chooses Not now, then the notice closes and the page stays as it is', async ({ page }) => {
  await visitAndWaitForNewVersion(page);
  const notice = page.getByRole('dialog', { name: 'App update' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Not now' }).click();
  await expect(notice).toBeHidden();
  await stayedOnSamePage(page);
});
