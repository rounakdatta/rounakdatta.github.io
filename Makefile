build:
	cd site && npm run build

dev:
	cd site && npm run dev

run:
	python3 -m http.server --directory docs/

clean:
	rm -rf docs/*

# Legacy Hugo commands (deprecated)
build-hugo:
	hugo --source src/ --destination ../docs/
