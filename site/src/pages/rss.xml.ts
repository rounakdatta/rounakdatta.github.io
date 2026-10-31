import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { publishedNotes, summaryOf } from '../lib/notes';
import { SITE } from '../lib/site';

export const GET: APIRoute = async () =>
  rss({
    title: `${SITE.name}: notes`,
    description: 'Stories, ideas, half-baked thoughts and questions, lest we forget.',
    site: SITE.url,
    items: (await publishedNotes()).map((note) => ({
      title: note.data.title,
      pubDate: note.data.date,
      description: summaryOf(note),
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
    })),
    customData: '<language>en-gb</language>',
  });
