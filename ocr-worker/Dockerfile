FROM node:22-alpine

RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-data-eng

WORKDIR /app
COPY package.json ./
COPY server.mjs ./

ENV NODE_ENV=production
ENV PORT=8080
ENV OCR_LANG=eng
ENV OCR_MAX_BYTES=26214400

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

USER node
CMD ["node", "server.mjs"]
