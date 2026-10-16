# Repo contract (nextjedi-world/platform docs/CONTRACTS.md):
#   make setup   install dependencies
#   make dev     run locally
#   make verify  lint + format check + typecheck + unit tests + build (what CI and the Stop hook run)
#   make e2e     no browser e2e suite yet (see CLAUDE.md); runs the unit tests as the smoke gate
.DEFAULT_GOAL := verify
.PHONY: setup dev verify lint format format-check typecheck test build e2e clean

setup:
	pnpm install --frozen-lockfile
	@pnpm exec lefthook install 2>/dev/null || echo "lefthook: hooks not installed"

dev:
	pnpm dev

lint:
	pnpm lint

format:
	pnpm format

format-check:
	pnpm format:check

typecheck:
	pnpm typecheck

test:
	pnpm test

build:
	pnpm build

verify: lint format-check typecheck test build

e2e:
	pnpm test

clean:
	rm -rf .next coverage
