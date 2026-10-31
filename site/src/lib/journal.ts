// The fitness journal's chapters: what chapters.json says by hand, joined to what
// `npm run strava` and `npm run plates` fetched and drew for each.
import type { ImageMetadata } from 'astro';
import chapterList from '../data/fitness/chapters.json' with { type: 'json' };
import milestoneData from '../data/fitness/milestones.json' with { type: 'json' };
import { activities, sportOf, type Activity } from './fitness';

interface Track {
  id: number;
  date: string;
  startTime: string;
  type: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  elevation: number;
  /** The route as segments: anything near its start or finish is left out (see scripts/privacy.mjs). */
  route: [number, number][][];
  /** [metres along, metres above the sea] */
  profile: [number, number][];
  plate?: { width: number; height: number; d: string; start: [number, number]; end: [number, number] };
}

export interface Chapter extends Track {
  slug: string;
  /** It starts somewhere public (a race, a trailhead), so its route is drawn whole. */
  publicStart: boolean;
  title: string;
  tagline: string;
  place: string;
  photos: ImageMetadata[];
  plates?: { light: ImageMetadata; dark: ImageMetadata };
  stravaUrl: string;
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
    return [
      {
        ...track,
        slug: c.slug,
        publicStart: 'publicStart' in c && c.publicStart === true,
        title: c.title,
        tagline: c.tagline,
        place: c.place,
        photos: imagesOf(c.slug, 'photo-'),
        plates: light && dark ? { light, dark } : undefined,
        stravaUrl: `https://www.strava.com/activities/${c.id}`,
      },
    ];
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export const chapterOnDate = new Map(chapters.map((c) => [c.date, c]));

export interface Milestone {
  year: number;
  month: number;
  text: string;
  position: 'above' | 'below';
}
export const milestones = milestoneData.milestones as Milestone[];
export const yearNotes = milestoneData.yearHighlights as { year: number; text: string }[];

export interface Best {
  label: string;
  value: string;
  activity?: Activity;
  when: string;
  href?: string;
}

const linkFor = (a: Activity) => {
  const chapter = chapters.find((c) => c.id === a.id);
  return chapter ? `/fitness/${chapter.slug}/` : a.id ? `https://www.strava.com/activities/${a.id}` : undefined;
};

const top = (list: Activity[], by: (a: Activity) => number) => list.reduce<Activity | undefined>((best, a) => (!best || by(a) > by(best) ? a : best), undefined);

/** The days worth singling out: marked because they are exceptional, and there are only four. */
export function bestsOf(list: Activity[]): { run?: Activity; ride?: Activity; climb?: Activity; month?: { key: string; metres: number } } {
  const months = new Map<string, number>();
  for (const a of list) if (sportOf(a.type) !== 'other') months.set(a.date.slice(0, 7), (months.get(a.date.slice(0, 7)) ?? 0) + a.distance);
  const month = [...months].reduce<[string, number] | undefined>((best, m) => (!best || m[1] > best[1] ? m : best), undefined);
  return {
    run: top(list.filter((a) => sportOf(a.type) === 'run'), (a) => a.distance),
    ride: top(list.filter((a) => sportOf(a.type) === 'ride'), (a) => a.distance),
    climb: top(list, (a) => a.elevation ?? 0),
    month: month && { key: month[0], metres: month[1] },
  };
}

export const bests = bestsOf(activities);
export { linkFor };
