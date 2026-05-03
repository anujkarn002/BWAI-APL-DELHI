# syntax=docker/dockerfile:1.7

# ---------- frontend build ----------
FROM oven/bun:1.3 AS frontend
WORKDIR /app
COPY frontend/package.json ./
COPY frontend/bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY frontend/ ./
RUN bun run build

# ---------- python deps ----------
FROM python:3.12-slim AS backend-deps
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---------- runtime ----------
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080
COPY --from=backend-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-deps /usr/local/bin /usr/local/bin
COPY backend/app ./app
COPY --from=frontend /app/dist ./static
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
