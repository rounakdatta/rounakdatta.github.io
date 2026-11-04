import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export interface Photo {
  src: ImageMetadata;
  caption?: string;
  alt?: string;
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

// Prints in an album's strip don't all hang at one size: four portraits in a row would read as
// four identical tiles. Each takes its turn in a gentle rhythm of sizes, the first the largest.
const RHYTHM = [1, 0.8, 0.92, 0.74, 0.96, 0.84];

/**
 * How tall a photo hangs in an album's strip, as a share of the tallest print: about the same
 * area whatever its shape, so a panorama doesn't swamp a portrait, and then its turn in the rhythm.
 */
export const printScale = (aspect: number, index: number) => Math.min(1, Math.sqrt(0.75 / aspect)) * RHYTHM[index % RHYTHM.length];
