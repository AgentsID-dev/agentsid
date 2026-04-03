FROM node:20-slim AS frontend

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM python:3.12-slim AS base

WORKDIR /app

RUN pip install --no-cache-dir uv

# Force rebuild by changing this comment: v5
COPY server/ server/

# Copy React build output
COPY --from=frontend /app/web/dist web/dist/

# Copy scanner registry index for API
COPY scanner/registry-index.json scanner/registry-index.json

# Install dependencies including resend for email notifications
RUN cd server && uv pip install --system --no-cache . resend cryptography "sentry-sdk[fastapi]"

# Create non-root user
RUN adduser --disabled-password --no-create-home appuser
USER appuser

WORKDIR /app/server

EXPOSE 8000

CMD uvicorn src.app:app --host 0.0.0.0 --port ${PORT:-8000}
