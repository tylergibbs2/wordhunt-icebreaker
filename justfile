default: fmt check

fmt: fmt-backend fmt-frontend

check: check-backend check-frontend

check-backend:
    uv run ruff check .
    uv run ruff format --check .
    uv run pyright

[working-directory: 'frontend']
check-frontend:
    bun run format:check

fmt-backend:
    uv run ruff format
    uv run ruff check --fix

[working-directory: 'frontend']
fmt-frontend:
    bun run format

test:
    uv run pytest

deploy:
    fly deploy
