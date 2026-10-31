import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      /** One or two sentences: the link preview and the notes list use it. */
      description: z.string().optional(),
      tags: z.array(z.string()).default([]),
      /** Drafts are never built, not even at their own URL. */
      draft: z.boolean().default(false),
      cover: image().optional(),
    }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** One line: what it is, in plain words. */
      description: z.string().optional(),
      year: z.number().optional(),
      status: z.enum(['active', 'maintained', 'finished', 'retired']).optional(),
      role: z.string().optional(),
      stack: z.array(z.string()).default([]),
      url: z.url().optional(),
      github: z.url().optional(),
      logo: image().optional(),
      /** A page on this site that is the project (the fitness journal, the reading list). */
      internalUrl: z.string().optional(),
      /** Featured is the exception: one or two projects at most, or it says nothing. */
      featured: z.boolean().default(false),
      order: z.number().default(0),
      draft: z.boolean().default(false),
    }),
});

const photoAlbums = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.coerce.date().optional(),
      order: z.number().default(0),
      photos: z.array(
        z.object({
          src: image(),
          caption: z.string().optional(),
          /** What the photo shows, for someone who can't see it. A caption is not alt text. */
          alt: z.string().optional(),
        }),
      ),
    }),
});

const books = defineCollection({
  loader: file('src/content/books.yaml'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      author: z.string(),
      status: z.enum(['reading', 'read', 'want']),
      finished: z.coerce.date().optional(),
      note: z.string().optional(),
      url: z.url().optional(),
      cover: image().optional(),
    }),
});

export const collections = { notes, projects, photoAlbums, books };
