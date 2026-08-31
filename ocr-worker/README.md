# OTTO OCR Worker

Self-hosted PDF OCR service for Contract Intelligence. It uses Poppler to render PDF pages and Tesseract to extract text. No hosted OCR API is required.

## Runtime

- Node.js 22
- Poppler (`pdftoppm`)
- Tesseract OCR
- English and isiZulu language data are included in the Vercel container

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
- `OCR_WORKER_TOKEN` — shared bearer token; set this when the worker is exposed directly
- `OCR_LANG` — Tesseract language, default `eng`; use `eng+zul` for English/isiZulu documents
- `OCR_MAX_BYTES` — request/PDF limit, default `26214400`

## Vercel deployment

The worker can run as a Vercel container service using `Dockerfile.vercel`. Vercel builds the OCI image with Poppler and Tesseract and runs it as an autoscaling Vercel Function. The main OTTO service receives the worker URL through a Vercel service binding as `OCR_WORKER_URL`.

This keeps OCR self-hosted without requiring a VPS or hosted OCR API during OTTO's internal-use phase.

## Security boundary

The worker accepts only PDF bytes and does not accept shell commands, executable paths, or arbitrary URLs. Temporary files are deleted after every request. When the worker is exposed directly, configure HTTPS and require a token. When used as an internal Vercel service, keep the service private and use the service binding from the frontend service.
