# rounak.taptappers.club

Rounak Datta's site: notes, projects, photos and a fitness journal. Built with [Astro](https://astro.build)
in `site/`, deployed to GitHub Pages by `.github/workflows/site.yml` on every push to `main`.

```sh
cd site && npm ci
npm run dev        # http://localhost:4321
npm run build      # into site/dist
npm test           # against the build: CHROME_PATH=… if Playwright has no browser of its own
```

## Writing

| to add | put it in | notes |
|---|---|---|
| a note | `site/src/content/notes/<slug>.md` (or `.mdx`) | `title`, `date`, optional `description` (the link preview) and `tags`. `draft: true` keeps it off the site entirely. |
| a photo in a note | `site/src/assets/images/…`, then `![what it shows](../../assets/images/x.jpg "caption")` | Alone in a paragraph it becomes a captioned figure; it is resized and served as AVIF. |
| a margin note | a markdown footnote, `[^1]` | Sits beside its line on a wide screen and opens in place on a phone. In MDX, `<Sidenote>…</Sidenote>` does the same. |
| an album | `site/src/content/photos/<slug>.md` | `photos: [{ src, caption, alt }]`, paths relative to the file. |
| a project | `site/src/content/projects/<slug>.md` | `year`, `status`, `stack`, `github`/`url`, a `logo`. |
| a book | `site/src/content/books.yaml` | The Reading page lists them by shelf once there are any. |
| a fitness chapter | `site/src/data/fitness/chapters.json` | A Strava activity `id` (or `ids` for a trek walked over days), a `slug`, `title` and `tagline`. Optional: `place` (otherwise looked up from the route), `photos` (otherwise the activity's own), and `publicStart` for a race or trailhead, so the route is drawn whole. Then run the two commands below. |

## The fitness journal

`npm run strava` pulls every activity, and each chapter's route, elevation and photos, from Strava.
`npm run plates` draws each chapter's map once, in the site's paper and ink, light and dark, with
MapLibre over OpenFreeMap tiles; the page shows the picture and draws the route over it, so it loads
no map library at all. A weekly workflow (`.github/workflows/strava.yml`) does both once the Strava
secrets it describes are set.

## Checks

`npm test` holds every page to four screens (320 and 390 phones, a phone on its side, a laptop) and
fails on: a page wider than the screen, a link or image that goes nowhere or redirects, a missing
link preview, an image more than twice the size it is shown at, anything that moves under reduced
motion, a page over its weight budget, or any request to another site.
