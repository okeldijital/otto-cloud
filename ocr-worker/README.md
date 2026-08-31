# OTTO OCR Worker

Self-hosted PDF OCR service for Contract Intelligence. It uses Poppler to render PDF pages and Tesseract to extract text. No hosted OCR API is required.

## Runtime

- Node.js 22
- Poppler (`pdftoppm`)
- Tesseract OCR
- English language data by default

## API

`GET /health` returns worker health.

`POST /ocr` accepts JSON:

```json
{
  "mimeType": "application/pdf",
  "filename": "contract.pdf",
  "data": "<base64 PDF>"
}
```

Set `OCR_WORKER_TOKEN` on the worker to require `Authorization: Bearer <token>`.

The response follows the application `OcrResult` shape and preserves page boundaries.

## Environment

- `PORT` — HTTP port, default `8080`
- `OCR_WORKER_TOKEN` — optional shared bearer token
- `OCR_LANG` — Tesseract language, default `eng`
- `OCR_MAX_BYTES` — request/PDF limit, default `26214400`

## Deployment

Build and run the container from this directory. The worker is intended to run on infrastructure that supports long-running containers (for example an OTTO-managed VPS), not as a Vercel serverless function.

The Next.js application connects to it using `OCR_WORKER_URL`, `OCR_WORKER_TOKEN`, and `OCR_WORKER_TIMEOUT_MS`.

## Security boundary

The worker accepts only PDF bytes and does not accept shell commands, executable paths, or arbitrary URLs. Temporary files are deleted after every request.
