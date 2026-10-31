# Everything lives in site/. Pushing to main builds and deploys
# (.github/workflows/site.yml); nothing here needs to run before a commit.

dev:
	cd site && npm run dev

build:
	cd site && npm run build

preview: build
	cd site && npm run preview

check:
	cd site && npm run check

test: build
	cd site && npm test

# Pull the latest activities, routes and photos from Strava into site/src/data.
strava:
	cd site && npm run strava

.PHONY: dev build preview check test strava
