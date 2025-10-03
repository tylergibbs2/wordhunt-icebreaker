default: fmt check

fmt: fmt-backend fmt-frontend

check: check-backend check-frontend

install: install-backend install-frontend

install-backend:
    uv sync --locked --all-extras

[working-directory: 'frontend']
install-frontend:
    bun install

check-backend:
    uv run ruff check .
    uv run ruff format --check .
    uv run pyright

[working-directory: 'frontend']
check-frontend:
    bun run format:check
    bun run lint

fmt-backend:
    uv run ruff format
    uv run ruff check --fix

[working-directory: 'frontend']
fmt-frontend:
    bun run format

dev-backend:
    uv run fastapi dev app/main.py --host 0.0.0.0

[working-directory: 'frontend']
dev-frontend:
    bun run dev

test:
    uv run pytest

deploy:
    fly deploy
