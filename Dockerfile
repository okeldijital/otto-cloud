FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (psycopg2 build + psql client)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install (repo root build context)
# IMPORTANT: your requirements live in /backend
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application code into /app
COPY backend/ /app/

# Create uploads directory (and any other runtime dirs you need)
RUN mkdir -p uploads

# Cloud Run listens on $PORT (default 8080)
EXPOSE 8080

# Run the FastAPI app (adjust main:app if your entrypoint differs)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
