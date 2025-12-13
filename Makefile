build:
	cd site && npm run build

dev:
	cd site && npm run dev

preview:
	python3 -m http.server --directory docs/

clean:
	rm -rf docs/*
