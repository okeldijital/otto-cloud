FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (including SQLite support)
RUN apt-get update && apt-get install -y \
    sqlite3 \
    libsqlite3-dev \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application code
COPY backend/ /app/

# Create necessary directories
RUN mkdir -p uploads logs import_logs

# Expose port (configurable via PORT env var)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run the FastAPI app
CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
