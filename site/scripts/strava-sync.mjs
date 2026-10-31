#!/usr/bin/env node
// Pull the fitness journal's data from Strava: `npm run strava` (or `make strava`).
//
//   src/data/strava-activities.json     every activity: date, kind, distance, time, climb
//   src/data/fitness/tracks/<slug>.json  for each new chapter in chapters.json: its route (minus
//                                        anything near where it began or ended), its elevation
//                                        profile and its numbers
//   src/assets/fitness/<slug>/*.jpg      each chapter's photos, downloaded once
//
// Chapters themselves (which days, their titles, taglines and photos) are chosen by hand in
// src/data/fitness/chapters.json; this only fills in what Strava knows. A chapter that starts
// somewhere public (a race, a trailhead) can say `"publicStart": true` to be drawn whole.
//
// Credentials, in order of preference:
//   STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET + STRAVA_REFRESH_TOKEN  (CI: a fresh token every run)
//   STRAVA_ACCESS_TOKEN                                               (a token you already have)
//   ~/.config/strava-mcp/config.json                                  (the Strava MCP's, locally)

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { trimNear, privacyRadius, dropSpecks } from './privacy.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const exists = (path) => access(path).then(() => true, () => false);
const API = 'https://www.strava.com/api/v3';

async function token() {
  const { STRAVA_CLIENT_ID: id, STRAVA_CLIENT_SECRET: secret, STRAVA_REFRESH_TOKEN: refresh, STRAVA_ACCESS_TOKEN: access } = process.env;
  if (id && secret && refresh) {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
    });
    if (!res.ok) throw new Error(`Strava refused the refresh token: ${res.status}`);
    const body = await res.json();
    // Strava may rotate the refresh token. The old one then stops working, and the secret must be
    // replaced; say so (without printing either token) rather than fail mysteriously next week.
    if (body.refresh_token && body.refresh_token !== refresh)
      console.warn('::warning::Strava issued a new refresh token: update the STRAVA_REFRESH_TOKEN secret before the next run.');
    return body.access_token;
  }
  if (access) return access;
  const config = JSON.parse(await readFile(join(homedir(), '.config/strava-mcp/config.json'), 'utf8'));
  const expires = config.expiresAt > 1e12 ? config.expiresAt / 1000 : config.expiresAt;
  if (expires * 1000 < Date.now() + 5 * 60_000)
    throw new Error('The Strava MCP token has expired: ask the MCP anything (it refreshes itself), then run this again.');
  return config.accessToken;
}

const bearer = await token();

async function strava(path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${bearer}` } });
  if (res.status === 429) throw new Error('Strava rate limit reached (100 requests per 15 minutes); try again later.');
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Google's encoded polyline format, which Strava uses for routes. */
function decodePolyline(encoded) {
  const points = [];
  let lat = 0;
  let lng = 0;
  for (let i = 0; i < encoded.length; ) {
    for (const axis of [0, 1]) {
      let shift = 0;
      let result = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Keep every nth point so a route stays a few hundred points, enough to draw smoothly. */
const thin = (points, max) => (points.length <= max ? points : points.filter((_, i) => i % Math.ceil(points.length / max) === 0 || i === points.length - 1));

const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;

// ---------- Every activity ----------

const activities = [];
for (let page = 1; ; page++) {
  const batch = await strava(`/athlete/activities?per_page=200&page=${page}`);
  activities.push(...batch);
  if (batch.length < 200) break;
}
// Activities only their owner can see stay off a public site, totals and calendar included.
const log = activities
  .filter((a) => !a.private && a.visibility !== 'only_me')
  .map((a) => ({
    id: a.id,
    date: a.start_date_local.slice(0, 10),
    name: a.name,
    type: a.sport_type ?? a.type,
    distance: Math.floor(a.distance),
    movingTime: a.moving_time,
    elevation: Math.floor(a.total_elevation_gain ?? 0),
  }))
  .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

// The date only moves when something new arrived, so a quiet week commits nothing.
const logFile = join(ROOT, 'src/data/strava-activities.json');
const previous = await readFile(logFile, 'utf8').then(JSON.parse, () => null);
const changed = JSON.stringify(previous?.activities) !== JSON.stringify(log);
const lastUpdated = changed || !previous ? new Date().toISOString().slice(0, 10) : previous.lastUpdated;
await writeFile(logFile, `${JSON.stringify({ lastUpdated, activities: log }, null, 1)}\n`);
console.log(`${log.length} activities, ${log.at(-1)?.date} to ${log[0]?.date}${changed ? '' : ' (nothing new)'}`);

// ---------- Each chapter ----------

const chapters = JSON.parse(await readFile(join(ROOT, 'src/data/fitness/chapters.json'), 'utf8'));
await mkdir(join(ROOT, 'src/data/fitness/tracks'), { recursive: true });

// A chapter is fetched once. Its route is trimmed with a radius chosen then and kept nowhere, so
// fetching it again would trim it differently, and redraw (and recommit) its map for nothing.
// `npm run strava -- --refresh` fetches every chapter again anyway.
const refresh = process.argv.includes('--refresh');

/** A place name for a route that has none, from OpenStreetMap's own reverse geocoder (one request a second). */
async function placeOf([lat, lng]) {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=en&lat=${lat}&lon=${lng}`, {
    headers: { 'User-Agent': 'rounak.taptappers.club site build (github.com/rounakdatta/rounakdatta.github.io)' },
  });
  if (!res.ok) return '';
  const { address = {} } = await res.json();
  const local = address.city ?? address.town ?? address.village ?? address.county ?? address.state_district;
  const wider = address.city === 'Singapore' ? '' : address.state ?? address.country;
  // "Ramanagara taluk" reads as Ramanagara; OpenStreetMap still calls the city Bangalore.
  const tidy = (name) => name?.replace(/ taluk$/, '').replace(/^Bangalore( (North|South|East|West|Urban))?$/, 'Bengaluru');
  return [tidy(local), wider].filter((part, i, all) => part && all.indexOf(part) === i).join(', ');
}

for (const chapter of chapters) {
  const trackFile = join(ROOT, `src/data/fitness/tracks/${chapter.slug}.json`);
  if (!refresh && (await exists(trackFile))) continue;

  // A chapter is one activity, or several in a row (a trek walked over days): `ids` lists them in order.
  const ids = chapter.ids ?? [chapter.id];
  const parts = [];
  for (const id of ids) {
    const detail = await strava(`/activities/${id}`);
    const streams = await strava(`/activities/${id}/streams?keys=altitude,distance,latlng&key_by_type=true`).catch(() => ({}));
    parts.push({ id, detail, streams });
  }

  // About 600 points in all, shared between the segments by length, enough to draw smoothly.
  // A race or a public trailhead starts nowhere private; anything else might start at a door.
  // An indoor session (HYROX, a gym) has no route at all, and its chapter simply has no map.
  const segments = parts.flatMap(({ detail, streams }) => {
    const raw = streams.latlng?.data ?? decodePolyline(detail.map?.polyline ?? detail.map?.summary_polyline ?? '');
    return dropSpecks(trimNear(raw, chapter.publicStart ? 0 : privacyRadius()));
  });
  const total = segments.reduce((n, seg) => n + seg.length, 0);
  const route = segments.map((segment) => thin(segment, Math.max(2, Math.ceil((600 * segment.length) / total))).map(([lat, lng]) => [round(lat, 5), round(lng, 5)]));

  // Height against distance across every part, a hundred and fifty samples in all. An indoor
  // session has a barometer but no distance, so its heights would draw nothing true: none at all.
  const profile = [];
  let offset = 0;
  for (const { detail, streams } of route.length ? parts : []) {
    const altitude = streams.altitude?.data ?? [];
    const along = streams.distance?.data ?? [];
    const step = Math.max(1, Math.floor((altitude.length * parts.length) / 150));
    altitude.forEach((h, i) => { if (i % step === 0) profile.push([Math.round(offset + (along[i] ?? 0)), round(h, 1)]); });
    offset += detail.distance;
  }

  const first = parts[0].detail;
  const last = parts.at(-1).detail;
  const sum = (key) => parts.reduce((n, { detail }) => n + (detail[key] ?? 0), 0);
  const middle = route.flat()[Math.floor(route.flat().length / 2)];
  const track = {
    id: ids[0],
    ids,
    date: first.start_date_local.slice(0, 10),
    endDate: last.start_date_local.slice(0, 10),
    startTime: first.start_date_local.slice(11, 16),
    type: first.sport_type ?? first.type,
    distance: Math.floor(sum('distance')),
    movingTime: sum('moving_time'),
    elapsedTime: sum('elapsed_time'),
    elevation: Math.floor(sum('total_elevation_gain')),
    ...(first.average_heartrate && { averageHeartrate: Math.round(first.average_heartrate), maxHeartrate: Math.round(first.max_heartrate) }),
    place: chapter.place ?? (middle ? await placeOf(middle) : ''),
    route,
    profile,
  };
  await writeFile(trackFile, `${JSON.stringify(track)}\n`);

  // Photos: the ones chapters.json lists, or else every photo on the activities, in order.
  let urls = chapter.photos;
  if (!urls) {
    urls = [];
    for (const { id } of parts) {
      const photos = await strava(`/activities/${id}/photos?size=2048&photo_sources=true`);
      urls.push(...photos.map((ph) => ph.urls?.['2048']).filter(Boolean));
    }
  }
  const dir = join(ROOT, `src/assets/fitness/${chapter.slug}`);
  await mkdir(dir, { recursive: true });
  let fetched = 0;
  for (const [i, url] of urls.entries()) {
    const file = join(dir, `photo-${i + 1}.jpg`);
    if (await exists(file)) continue;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ${chapter.slug}: photo ${i + 1} is gone (${res.status})`);
      continue;
    }
    // Kept at up to 2000px: the site makes every smaller size it needs from this.
    await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
    fetched++;
  }
  console.log(`${chapter.slug}: ${parts.length > 1 ? `${parts.length} activities, ` : ''}${route.flat().length} points in ${route.length} part${route.length === 1 ? '' : 's'}, ${profile.length} heights, ${fetched} new photos${track.place ? `, ${track.place}` : ''}`);
}
