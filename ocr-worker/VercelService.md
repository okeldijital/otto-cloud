# Vercel OCR service

Vercel supports OCI containers as Vercel Functions. The worker uses `Dockerfile.vercel` and requires a Vercel service entry with `root: ocr-worker/`, `runtime: container`, and `entrypoint: Dockerfile.vercel`.

The service should expose `/health` and `/ocr`, with `OCR_WORKER_TOKEN` configured in the service environment.
