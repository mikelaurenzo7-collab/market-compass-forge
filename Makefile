.PHONY: dev build seed test

dev:
	docker-compose up --build

build:
	docker-compose build

seed:
	docker-compose run --rm web_api python -m web_api.seed

test:
	cd engine && pip install -e . 2>/dev/null || true && pytest tests -v
