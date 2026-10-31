// One link-preview image for every page: /og/<page path>.png, which BaseLayout points at by default.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { publishedNotes, tagSlug, minutesToRead } from '../../lib/notes';
import { renderCard, photoForCard, type Card } from '../../lib/og';
import { fullDate, monthOfYear } from '../../lib/dates';
import { activities, totalsOf, km } from '../../lib/fitness';
import { chapters } from '../../lib/journal';
import { fitRoute } from '../../lib/routes';
import { sportOf, kmTenths } from '../../lib/fitness';

/** Astro keeps the file an imported image came from; the preview needs the original pixels. */
const fileOf = (image: { fsPath?: string } | undefined) => image?.fsPath;

export const getStaticPaths = (async () => {
  const notes = await publishedNotes();
  const albums = await getCollection('photoAlbums');
  const moving = totalsOf(activities);
  const cards: { path: string; card: Card | (() => Promise<Card>) }[] = [];

  cards.push({
    path: 'home',
    card: async () => ({
      kicker: 'rounak.taptappers.club',
      title: 'Rounak Datta',
      footnote: 'Notes, projects, photos and a fitness journal',
      photo: await photoForCard(fileOf((await import('../../assets/images/profile.jpeg')).default as never)!),
    }),
  });
  cards.push({ path: '404', card: { kicker: 'Rounak Datta', title: 'Nothing lives here', footnote: 'Page not found' } });
  cards.push({ path: 'notes', card: { kicker: 'Rounak Datta', title: 'Notes', footnote: `${notes.length} stories, ideas and half-baked thoughts` } });
  for (const note of notes)
    cards.push({
      path: `notes/${note.id}`,
      card: { kicker: 'Notes', title: note.data.title, footnote: `${fullDate(note.data.date)} · ${minutesToRead(note)} min read` },
    });
  const tags = new Set(notes.flatMap((n) => n.data.tags));
  for (const tag of tags)
    cards.push({ path: `notes/tags/${tagSlug(tag)}`, card: { kicker: 'Notes, tagged', title: tag } });
  cards.push({ path: 'projects', card: { kicker: 'Rounak Datta', title: 'Projects', footnote: 'Software I build and keep building' } });
  cards.push({ path: 'reading', card: { kicker: 'Rounak Datta', title: 'The Reading Project' } });
  cards.push({
    path: 'photos',
    card: async () => ({
      kicker: 'Rounak Datta',
      title: 'Photos',
      footnote: `${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`,
      photo: albums[0] ? await photoForCard(fileOf(albums[0].data.photos[0].src as never)!) : undefined,
    }),
  });
  for (const album of albums)
    cards.push({
      path: `photos/${album.id}`,
      card: async () => ({
        kicker: 'Photos',
        title: album.data.title,
        footnote: `${album.data.date ? `${monthOfYear(album.data.date)} · ` : ''}${album.data.photos.length} photos`,
        photo: await photoForCard(fileOf(album.data.photos[0].src as never)!),
      }),
    });
  const longest = chapters.reduce((a, b) => (b.distance > a.distance ? b : a));
  cards.push({
    path: 'fitness',
    card: {
      kicker: 'The Fitness Project',
      title: `${km(moving.footAndBike)} km on foot and by bike`,
      footnote: `Since ${monthOfYear(new Date(`${moving.first}T00:00:00Z`))}`,
      route: fitRoute(longest.route, 400, 400, 24).d,
    },
  });
  for (const c of chapters)
    cards.push({
      path: `fitness/${c.slug}`,
      card: {
        kicker: 'The Fitness Project',
        title: c.title,
        footnote: `${kmTenths(c.distance)} km ${sportOf(c.type) === 'walk' ? 'hike' : sportOf(c.type)} · ${c.place}`,
        route: fitRoute(c.route, 400, 400, 24).d,
      },
    });

  return cards.map(({ path, card }) => ({ params: { path }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const card = typeof props.card === 'function' ? await props.card() : props.card;
  return new Response(new Uint8Array(await renderCard(card)), { headers: { 'Content-Type': 'image/png' } });
};
