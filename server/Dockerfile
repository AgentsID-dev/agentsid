FROM python:3.12-slim AS base

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system --no-cache . resend cryptography sentry-sdk[fastapi]

COPY src/ src/
COPY static/ static/
COPY alembic/ alembic/
COPY alembic.ini .

# Landing page lives one level up
COPY ../site/ ../site/ 2>/dev/null || true

RUN adduser --disabled-password --no-create-home appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
