install:
    uv sync --all-extras
    uv run pre-commit install

lint:
    uv run pre-commit run --all-files

test:
    uv run pytest

docs_serve:
    uv run mkdocs serve