build:
	hugo --source src/ --destination ../docs/

run:
	python3 -m http.server --directory docs/

clean:
	rm -rf src/content/
	rm -rf docs/*

