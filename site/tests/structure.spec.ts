// Checks that need no browser: they read the built HTML the way a crawler or a link preview would.
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { builtPages, referencedUrls, DIST, SITE } from './site';

const pages = builtPages();

/** Where a site URL lands in dist/, the way GitHub Pages resolves it (directories serve index.html). */
function fileFor(pathname: string): string | null {
  const clean = decodeURIComponent(pathname);
  const candidates = clean.endsWith('/')
    ? [join(DIST, clean, 'index.html')]
    : [join(DIST, clean), join(DIST, clean, 'index.html'), join(DIST, `${clean}.html`)];
  return candidates.find((c) => existsSync(c)) ?? null;
}

test('the site was built before testing it', () => {
  expect(pages.length, 'run `npm run build` first').toBeGreaterThan(5);
});

for (const [path, html] of pages) {
  test(`${path}: every internal link, image and in-page anchor leads somewhere`, () => {
    const broken: string[] = [];
    for (const raw of referencedUrls(html)) {
      if (/^(mailto:|tel:|data:|javascript:)/.test(raw)) continue;
      const url = new URL(raw, `${SITE}${path}`);
      if (url.origin !== SITE) continue;
      if (raw.startsWith('#')) {
        const id = raw.slice(1);
        if (id && !html.includes(`id="${id}"`)) broken.push(raw);
        continue;
      }
      if (!fileFor(url.pathname)) broken.push(raw);
    }
    expect(broken, 'these go nowhere').toEqual([]);
  });

  if (path === '/404.html') continue;

  test(`${path}: a shared link previews with a title, description and image`, () => {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    const meta = (key: string) =>
      html.match(new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]+content="([^"]*)"`))?.[1] ?? '';
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/)?.[1] ?? '';

    expect(title.trim(), 'title').not.toBe('');
    // "Home | Rounak Datta" reads like a template, not a person's site.
    expect(title, 'title').not.toMatch(/^Home\b/);
    expect(meta('description').length, 'description').toBeGreaterThan(30);
    expect(canonical, 'canonical').toBe(`${SITE}${path}`);
    for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card'])
      expect(meta(key), key).not.toBe('');
    const image = new URL(meta('og:image'));
    expect(image.origin).toBe(SITE);
    expect(fileFor(image.pathname), `og:image ${image.pathname} exists`).not.toBeNull();
  });
}
