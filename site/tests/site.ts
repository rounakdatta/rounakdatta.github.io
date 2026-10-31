// What the tests know about the built site: which pages exist, and the screens they must work on.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Page } from '@playwright/test';

export const DIST = join(import.meta.dirname, '..', 'dist');
export const SITE = 'https://rounak.taptappers.club';

/** Every built page as [url path, html], excluding redirect stubs (they have no content of their own). */
export function builtPages(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.html')) {
        const html = readFileSync(full, 'utf8');
        if (/http-equiv="refresh"/i.test(html)) continue;
        const rel = relative(DIST, full).split(sep).join('/');
        const path = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
        out.push([path, html]);
      }
    }
  };
  walk(DIST);
  return out.sort(([a], [b]) => a.localeCompare(b));
}

/** The screens every page is held to: two phones, a phone on its side, and a desktop. */
export const SCREENS = [
  { name: 'phone-320', width: 320, height: 640, isMobile: true, deviceScaleFactor: 2 },
  { name: 'phone-390', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: 'phone-landscape', width: 844, height: 390, isMobile: true, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
] as const;

/** Read the page top to bottom a screen at a time, so lazy content loads the way it would for a person. */
export async function readWholePage(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = page.viewportSize()!.height * 0.8;
  for (let y = 0; y < height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
}

/** Pull every URL a page refers to: links, sources, srcsets and the preview image. */
export function referencedUrls(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/\s(?:href|src|poster)="([^"]*)"/g)) urls.push(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g))
    for (const part of m[1].split(',')) urls.push(part.trim().split(/\s+/)[0]);
  for (const m of html.matchAll(/<meta[^>]+property="og:image"[^>]+content="([^"]*)"/g)) urls.push(m[1]);
  return urls.map((u) => u.replaceAll('&amp;', '&')).filter(Boolean);
}
