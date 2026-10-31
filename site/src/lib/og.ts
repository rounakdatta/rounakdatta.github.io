// Link previews, drawn at build time in the site's own type and paper, so a shared link looks
// like the page it leads to. Satori lays out the card; sharp turns its SVG into a PNG.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const font = (file: string) => readFile(require.resolve(`@fontsource/eb-garamond/files/${file}`));

const fonts = Promise.all([
  font('eb-garamond-latin-400-normal.woff'),
  font('eb-garamond-latin-600-normal.woff'),
  font('eb-garamond-latin-400-italic.woff'),
]).then(([regular, semibold, italic]) => [
  { name: 'EB Garamond', data: regular, weight: 400 as const, style: 'normal' as const },
  { name: 'EB Garamond', data: semibold, weight: 600 as const, style: 'normal' as const },
  { name: 'EB Garamond', data: italic, weight: 400 as const, style: 'italic' as const },
]);

const PAPER = '#fffff8';
const INK = '#2a2926';
const MUTED = '#696760';
const RULE = '#e4e1d4';
const ACCENT = '#ad4310';
const ROUTE = '#fc4c02';

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

export interface Card {
  /** Small capitals above the title: the section of the site. */
  kicker: string;
  title: string;
  /** One quiet line under the title: a date, a count, a place. */
  footnote?: string;
  /** A route to draw beside the words, as SVG path data in a 400×400 box. */
  route?: string;
  /** A photo to set beside the words (a data URI). */
  photo?: string;
}

export async function renderCard({ kicker, title, footnote, route, photo }: Card): Promise<Buffer> {
  const titleSize = title.length > 70 ? 58 : title.length > 40 ? 68 : 80;
  const side = route
    ? h('img', { width: 400, height: 400 }, undefined)
    : photo
      ? h('img', { width: 420, height: 630, objectFit: 'cover' }, undefined)
      : null;
  if (side && route) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path d="${route}" fill="none" stroke="${ROUTE}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    side.props.src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  } else if (side && photo) side.props.src = photo;

  const words = h(
    'div',
    { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '72px 72px 64px 80px' },
    h('div', { display: 'flex', fontSize: 30, letterSpacing: 3, color: MUTED, textTransform: 'uppercase' }, kicker),
    h('div', { display: 'flex', fontSize: titleSize, fontWeight: 600, lineHeight: 1.08, color: INK, letterSpacing: -1 }, title),
    h(
      'div',
      { display: 'flex', alignItems: 'center', gap: 20, fontSize: 30, color: MUTED },
      h('div', { width: 48, height: 3, background: ACCENT }, ''),
      footnote ?? 'rounak.taptappers.club',
    ),
  );

  const card = h(
    'div',
    { display: 'flex', width: 1200, height: 630, background: PAPER, fontFamily: 'EB Garamond', borderBottom: `14px solid ${RULE}` },
    words,
    ...(side ? [h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: route ? '0 72px 0 0' : 0 }, side)] : []),
  );

  const svg = await satori(card as never, { width: 1200, height: 630, fonts: await fonts });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/** A photo, shrunk and cropped for the side of a card, as a data URI satori can embed. */
export async function photoForCard(path: string): Promise<string> {
  const jpeg = await sharp(path).resize(420, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}
