import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PROJECT_EXT } from '../../src/project/format';

const outDir = mkdtempSync(join(tmpdir(), 'watercolor-pwa-'));
const read = (file: string) => readFileSync(join(outDir, file), 'utf8');
const manifestUrl = 'https://example.com/watercolor-playground/manifest.webmanifest';
const resolve = (path: string) => new URL(path, manifestUrl).href;

interface Icon { src: string; sizes: string; type: string; purpose?: string }
let manifest: {
  name: string; start_url: string; scope: string; display: string; prefer_related_applications?: boolean; icons: Icon[];
  file_handlers: { action: string; accept: Record<string, string[]> }[];
};
let precached: string[];

beforeAll(async () => {
  await build({ configFile: join(process.cwd(), 'vite.config.ts'), logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  manifest = JSON.parse(read('manifest.webmanifest'));
  precached = [...read('sw.js').matchAll(/"?url"?:\s*"([^"]+)"/g)].map(m => m[1]);
}, 60_000);

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe('web app manifest', () => {
  it('has what Chromium requires for installability', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    expect(manifest.prefer_related_applications ?? false).toBe(false);
    const any = manifest.icons.filter(i => (i.purpose ?? 'any') === 'any').map(i => i.sizes);
    expect(any).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('declares a maskable icon', () => {
    expect(manifest.icons.some(i => i.purpose === 'maskable')).toBe(true);
  });

  it('points every icon at a PNG of the declared size', () => {
    for (const icon of manifest.icons) {
      const file = join(outDir, icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const png = readFileSync(file);
      const [w, h] = icon.sizes.split('x').map(Number);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], icon.src).toEqual([w, h]);
    }
  });

  it('keeps start_url and the file handler inside the scope, so it works under a sub-path', () => {
    const scope = resolve(manifest.scope);
    expect(scope).toBe('https://example.com/watercolor-playground/');
    expect(resolve(manifest.start_url).startsWith(scope)).toBe(true);
    for (const handler of manifest.file_handlers) expect(resolve(handler.action).startsWith(scope)).toBe(true);
  });

  it('hands project files to the app', () => {
    const extensions = manifest.file_handlers.flatMap(h => Object.values(h.accept).flat());
    expect(extensions).toEqual([`.${PROJECT_EXT}`]);
  });
});

describe('index.html', () => {
  it('links the manifest and the touch icon relatively, so a sub-path works', () => {
    const html = read('index.html');
    expect(html).toContain('<link rel="manifest" href="./manifest.webmanifest">');
    expect(html).toContain('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />');
  });
});

describe('service worker', () => {
  it('precaches the app shell', () => {
    expect(precached).toContain('index.html');
    expect(precached.find(u => u.startsWith('assets/index-'))).toBeTruthy();
    for (const icon of manifest.icons) expect(precached).toContain(icon.src);
  });

  it('leaves the 3 MB HEIC decoder out of the precache', () => {
    expect(precached.some(u => u.includes('heic-to-'))).toBe(false);
  });

  it('lists each precached file once', () => {
    expect(precached.filter((u, i) => precached.indexOf(u) !== i)).toEqual([]);
  });

  it('never activates a new version on its own, because a reload would lose the painting', () => {
    const sw = read('sw.js');
    expect(sw).not.toContain('clientsClaim');
    expect(sw.match(/skipWaiting/g)).toHaveLength(1);
    const guard = sw.indexOf('SKIP_WAITING');
    expect(guard).toBeGreaterThan(-1);
    expect(sw.indexOf('skipWaiting') - guard).toBeLessThan(80);
  });
});
