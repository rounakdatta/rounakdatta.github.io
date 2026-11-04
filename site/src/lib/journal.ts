// The fitness journal's chapters: what chapters.json says by hand, joined to what
// `npm run strava` and `npm run plates` fetched and drew for each.
import type { ImageMetadata } from 'astro';
import chapterList from '../data/fitness/chapters.json' with { type: 'json' };
import milestoneData from '../data/fitness/milestones.json' with { type: 'json' };
import { parseMilestones } from './calendar';

interface Track {
  id: number;
  /** Every activity in the chapter, in order: one, or several for a trek walked over days. */
  ids?: number[];
  date: string;
  /** The last day, when a chapter spans several. */
  endDate?: string;
  startTime: string;
  type: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  elevation: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  /** Where, looked up from the route when chapters.json does not say. */
  place?: string;
  /** The route as recorded, within 3 m, in one segment per activity; an end at home is left out (see scripts/privacy.mjs). */
  route: [number, number][][];
  /** [metres along, metres above the sea] */
  profile: [number, number][];
  /** The route projected onto its map, landscape (wide screens) and portrait (phones). */
  plate?: Plate;
  plateTall?: Plate;
}

export interface Plate {
  width: number;
  height: number;
  d: string;
  start: [number, number];
  end: [number, number];
}

export interface Chapter extends Track {
  slug: string;
  /** It starts somewhere public (a race, a trailhead), so its route is drawn whole. */
  publicStart: boolean;
  title: string;
  tagline: string;
  place: string;
  photos: ImageMetadata[];
  plates?: { light: ImageMetadata; dark: ImageMetadata; tallLight: ImageMetadata; tallDark: ImageMetadata };
  /** One link per activity: a trek has a link for each day. */
  stravaUrls: string[];
  /** Every date the chapter spans. */
  days: string[];
}

const tracks = import.meta.glob<Track>('../data/fitness/tracks/*.json', { eager: true, import: 'default' });
const images = import.meta.glob<ImageMetadata>('../assets/fitness/*/*.jpg', { eager: true, import: 'default' });

const imagesOf = (slug: string, prefix: string) =>
  Object.entries(images)
    .filter(([path]) => path.includes(`/fitness/${slug}/${prefix}`))
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([, image]) => image);

/** Newest first. A chapter whose track was never synced is left out rather than shown half-drawn. */
export const chapters: Chapter[] = chapterList
  .flatMap((c): Chapter[] => {
    const track = tracks[`../data/fitness/tracks/${c.slug}.json`];
    if (!track) return [];
    const [light, dark] = [imagesOf(c.slug, 'plate-light')[0], imagesOf(c.slug, 'plate-dark')[0]];
    const [tallLight, tallDark] = [imagesOf(c.slug, 'plate-tall-light')[0], imagesOf(c.slug, 'plate-tall-dark')[0]];
    const ids = track.ids ?? [track.id];
    const days: string[] = [];
    for (let d = new Date(`${track.date}T00:00:00Z`); d <= new Date(`${track.endDate ?? track.date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1))
      days.push(d.toISOString().slice(0, 10));
    return [
      {
        ...track,
        ids,
        slug: c.slug,
        publicStart: 'publicStart' in c && c.publicStart === true,
        title: c.title,
        tagline: c.tagline ?? '',
        place: ('place' in c && c.place) || track.place || '',
        photos: imagesOf(c.slug, 'photo-'),
        plates: light && dark && tallLight && tallDark ? { light, dark, tallLight, tallDark } : undefined,
        stravaUrls: ids.map((id) => `https://www.strava.com/activities/${id}`),
        days,
      },
    ];
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export const milestones = parseMilestones(milestoneData.milestones);
export const yearNotes = milestoneData.yearHighlights as { year: number; text: string }[];
