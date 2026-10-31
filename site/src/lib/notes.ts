import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, readingMinutes, excerptOf } from './text';

export type Note = CollectionEntry<'notes'>;

/** Every note a reader may see, newest first. Pages are built from this, so a draft never gets a URL. */
export async function publishedNotes(): Promise<Note[]> {
  const notes = await getCollection('notes', ({ data }) => isPublished(data));
  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** What a note is about, for previews: its own description, or failing that its opening sentences. */
export function summaryOf(note: Note): string {
  return note.data.description ?? excerptOf(note.body ?? '');
}

export function minutesToRead(note: Note): number {
  return readingMinutes(note.body ?? '');
}

/** Tags as they appear in URLs. */
export const tagSlug = (tag: string) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
