.PHONY: dev build seed test reset e2e boundary-check

dev:
	./scripts/dev.sh

build:
	docker compose build

seed:
	docker compose run --rm web_api python -m web_api.seed

reset:
	docker compose down -v
	docker compose up -d
	sleep 10
	$(MAKE) seed

test: boundary-check
	cd engine && pip install -e . 2>/dev/null || true && python3 -m pytest tests -v

boundary-check:
	python3 tools/boundary_check.py

e2e:
	cd apps/web && npx playwright install chromium 2>/dev/null || true && npx playwright test
