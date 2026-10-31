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
