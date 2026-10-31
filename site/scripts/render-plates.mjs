#!/usr/bin/env node
// Draw a map "plate" for every chapter of the fitness journal: `npm run plates`.
//
// Each plate is the ground under one route, printed once in the site's own paper and ink, light
// and dark, and saved as an image. The page never loads a map library or a tile server; it shows
// the picture and draws the route over it as an SVG, from the coordinates saved here, so the line
// lands exactly on the roads it followed.
//
// Map data © OpenStreetMap contributors, served by OpenFreeMap; hill shading from the Terrain
// Tiles on AWS (Mapzen's terrarium encoding). Both are credited under every plate.
//
//   in:  src/data/fitness/chapters.json, src/data/fitness/tracks/<slug>.json
//   out: src/assets/fitness/<slug>/plate-light.jpg, plate-dark.jpg
//        and a `plate` entry (size, route path, start, finish) in each track file

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1200;
const HEIGHT = 800;
// `npm run plates` draws every chapter; `-- --missing` only those without plates yet; `-- <slug>` one.
const only = process.argv[2] === '--missing' ? undefined : process.argv[2];
const missingOnly = process.argv[2] === '--missing';

// ---------- The two inks ----------

const PALETTES = {
  light: {
    paper: '#fffff8', water: '#dbe4e2', waterLine: '#c9d6d4', green: '#f3f4e6', residential: '#fbfaf1',
    building: '#f1eee3', minor: '#ece8dc', major: '#e3dece', motorway: '#d9d3c1', rail: '#ddd8ca',
    boundary: '#cfcabb', label: '#8a877c', labelStrong: '#5f5c54', waterLabel: '#7b9095', halo: '#fffff8',
    shadow: 'rgba(70, 55, 30, 0.36)', highlight: 'rgba(255, 255, 248, 0.3)',
  },
  dark: {
    paper: '#151412', water: '#1b2326', waterLine: '#223035', green: '#181b16', residential: '#171614',
    building: '#1d1c19', minor: '#26241f', major: '#2e2b26', motorway: '#36332c', rail: '#2c2a25',
    boundary: '#3a372f', label: '#8a857a', labelStrong: '#b3ad9f', waterLabel: '#6f858a', halo: '#151412',
    shadow: 'rgba(0, 0, 0, 0.6)', highlight: 'rgba(255, 250, 230, 0.06)',
  },
};

// What a plate keeps of the base style. Road names, shields and airports' labels are noise around a
// route; places big enough to orient by stay. Villages only appear once a plate is zoomed in on the
// countryside, where they are the only names there are.
const KEEP_LABELS = new Set(['label_city', 'label_city_capital', 'label_town', 'label_village', 'water_name_point_label', 'water_name_line_label']);

function paperStyle(base, p) {
  const style = structuredClone(base);
  delete style.sources.ne2_shaded;
  style.sources.terrain = {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 14,
  };
  const paint = (id) => {
    if (id === 'background') return { 'background-color': p.paper };
    if (id === 'park' || id === 'landcover_wood') return { 'fill-color': p.green };
    if (id === 'water') return { 'fill-color': p.water };
    if (id === 'waterway') return { 'line-color': p.waterLine };
    if (id === 'landuse_residential') return { 'fill-color': p.residential };
    if (id === 'building') return { 'fill-color': p.building, 'fill-outline-color': p.building };
    if (id.startsWith('landcover_')) return { 'fill-color': p.paper };
    if (id.includes('motorway') && id.includes('casing')) return { 'line-color': p.paper };
    if (id.includes('motorway')) return { 'line-color': p.motorway };
    if (id === 'highway_major_casing') return { 'line-color': p.paper };
    if (id.includes('major')) return { 'line-color': p.major };
    if (id === 'highway_minor' || id === 'highway_path') return { 'line-color': p.minor };
    if (id.startsWith('railway')) return { 'line-color': id.includes('dash') ? p.paper : p.rail };
    if (id.startsWith('aeroway') || id.startsWith('road_') || id.startsWith('tunnel_')) return { [id.startsWith('aeroway-area') || id === 'road_area_pier' ? 'fill-color' : 'line-color']: p.minor };
    if (id.startsWith('boundary')) return { 'line-color': p.boundary };
    return null;
  };

  const layers = [];
  for (const layer of style.layers) {
    if (layer.type === 'symbol') {
      if (!KEEP_LABELS.has(layer.id)) continue;
      const water = layer.id.startsWith('water');
      layer.paint = {
        'text-color': water ? p.waterLabel : layer.id === 'label_city' || layer.id === 'label_city_capital' ? p.labelStrong : p.label,
        'text-halo-color': p.halo,
        'text-halo-width': 1.6,
        'text-halo-blur': 0.5,
      };
      if (layer.id === 'label_village') layer.minzoom = 12;
      layers.push(layer);
      continue;
    }
    const colours = paint(layer.id);
    if (colours) layer.paint = { ...layer.paint, ...colours };
    layers.push(layer);
    // Hills, faintly, right above the ground cover: they matter on a mountain, and vanish in a city.
    if (layer.id === 'landcover_wood') {
      layers.push({
        id: 'hills',
        type: 'hillshade',
        source: 'terrain',
        paint: {
          'hillshade-exaggeration': 0.28,
          'hillshade-shadow-color': p.shadow,
          'hillshade-highlight-color': p.highlight,
          'hillshade-accent-color': p.shadow,
        },
      });
    }
  }
  // Summits, named with their height: on a hike, the peak is the point of the day.
  layers.push({
    id: 'peaks',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'mountain_peak',
    minzoom: 11,
    filter: ['has', 'name'],
    layout: {
      'text-field': ['case', ['has', 'ele'], ['concat', ['get', 'name'], '  ', ['to-string', ['get', 'ele']], ' m'], ['get', 'name']],
      'text-font': ['Noto Sans Italic'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.4],
    },
    paint: { 'text-color': p.label, 'text-halo-color': p.halo, 'text-halo-width': 1.6 },
  });
  style.layers = layers;
  return style;
}

// ---------- A tiny page for MapLibre ----------

const dist = join(ROOT, 'node_modules/maplibre-gl/dist');
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/maplibre-gl.css">
<style>html,body{margin:0;background:#888}#map{width:${WIDTH}px;height:${HEIGHT}px}</style></head>
<body><div id="map"></div><script type="module">
import * as maplibregl from '/maplibre-gl.mjs';
window.render = (style, bounds) => new Promise((resolve) => {
  const map = new maplibregl.Map({ container: 'map', style, bounds, fitBoundsOptions: { padding: { top: 96, bottom: 96, left: 120, right: 120 }, maxZoom: 15 },
    attributionControl: false, interactive: false, fadeDuration: 0, preserveDrawingBuffer: true, pixelRatio: 2 });
  window.map = map;
  map.once('idle', () => resolve(true));
});
</script></body></html>`;

const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  try {
    const body = path === '/' ? PAGE : await readFile(join(dist, path));
    const type = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' }[extname(path)] ?? 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  // Software WebGL: no GPU needed, and the same pixels on any machine.
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.warn('  page error:', e.message));

const baseStyle = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
const styles = { light: paperStyle(baseStyle, PALETTES.light), dark: paperStyle(baseStyle, PALETTES.dark) };

const chapters = JSON.parse(await readFile(join(ROOT, 'src/data/fitness/chapters.json'), 'utf8'));
for (const chapter of chapters) {
  if (only && chapter.slug !== only) continue;
  const trackFile = join(ROOT, `src/data/fitness/tracks/${chapter.slug}.json`);
  const track = JSON.parse(await readFile(trackFile, 'utf8'));
  if (missingOnly && track.plate) continue;
  // An indoor session has no ground to draw.
  if (!track.route.length) continue;
  const points = track.route.flat();
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const bounds = [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
  const dir = join(ROOT, `src/assets/fitness/${chapter.slug}`);
  await mkdir(dir, { recursive: true });

  let projected;
  for (const theme of ['light', 'dark']) {
    await page.goto(base);
    await page.evaluate(([style, b]) => window.render(style, b), [styles[theme], bounds]);
    // Where the route falls on this picture, in its own pixels (identical for both themes).
    projected ??= await page.evaluate((segments) => segments.map((segment) => segment.map(([lat, lng]) => {
      const p = window.map.project([lng, lat]);
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    })), track.route);
    const png = await page.locator('#map canvas').screenshot();
    await sharp(png).jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(join(dir, `plate-${theme}.jpg`));
  }

  track.plate = {
    width: WIDTH,
    height: HEIGHT,
    d: projected.map((segment) => `M${segment.map(([x, y]) => `${x} ${y}`).join('L')}`).join(''),
    start: projected[0][0],
    end: projected.at(-1).at(-1),
  };
  await writeFile(trackFile, `${JSON.stringify(track)}\n`);
  console.log(`${chapter.slug}: plates drawn`);
}

await browser.close();
server.close();
