import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export interface Photo {
  src: ImageMetadata;
  caption?: string;
  alt?: string;
  /** Where a polaroid's square window sits on the photo (CSS object-position). */
  focus?: string;
}

/** The full-screen version: big enough for a laptop at 2×, never bigger than the original. */
export async function fullSize(photo: Photo) {
  const widths = [1200, 2000].filter((w) => w < photo.src.width).concat(Math.min(photo.src.width, 2400));
  const unique = [...new Set(widths)];
  const variants = await Promise.all(unique.map((width) => getImage({ src: photo.src, width, format: 'webp', quality: 80 })));
  const largest = variants.at(-1)!;
  return {
    src: largest.src,
    srcset: variants.map((v, i) => `${v.src} ${unique[i]}w`).join(', '),
    width: largest.attributes.width as number,
    height: largest.attributes.height as number,
  };
}

/** What a screen reader hears for a photo. A caption is a stand-in until the photo has real alt text. */
export const altOf = (photo: Photo) => photo.alt ?? photo.caption ?? '';

// ---------- Polaroids ----------

/**
 * AVIF quality for a polaroid: small, and black and white until looked at, so a little more than a
 * note's illustration and less than a print. 70 made the first view of 32 polaroids 620 KB on a phone.
 */
export const POLAROID_QUALITY = 64;

/**
 * The sizes a polaroid's photo is made in: a tall photo on a phone needs only 300, and a wide one
 * about 450, which without a 500 it took from the 600.
 */
export const polaroidWidths = (photo: Photo) => [300, 400, 500, 600, 800].filter((w) => w <= photo.src.width);

/**
 * How wide a polaroid's photo is drawn, for the browser to pick a size: exactly, because a phone at
 * twice the density that is told a pixel too many fetches the next size up, half as heavy again.
 * The window is square and the photo fills it, so a wide photo is drawn wider than its window. A
 * window is 89% of its polaroid. A phone has two polaroids to a row across the screen less its
 * gutters and the gap between them (3.35rem in all). Wider, there are three in the text's column,
 * which is the screen less its gutters (4vw each, at most 2rem), but never more than 34em of the
 * body text: that text grows from 0.95rem + 0.55vw to 22px, so the column from 32.3rem + 18.7vw to
 * 46.75rem; less the two gaps of 2.1rem.
 */
export function polaroidSizes(photo: Photo) {
  const wider = Math.max(1, photo.src.width / photo.src.height);
  const phone = `calc((100vw - 3.35rem) * ${(0.445 * wider).toFixed(4)})`;
  const column = 'min(max(92vw, 100vw - 4rem), 32.3rem + 18.7vw, 46.75rem)';
  return `(max-width: 40rem) ${phone}, calc((${column} - 4.2rem) * ${((0.89 / 3) * wider).toFixed(4)})`;
}
