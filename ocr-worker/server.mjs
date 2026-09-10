import { createServer } from "node:http";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.OCR_WORKER_TOKEN || "";
const MAX_BYTES = Number(process.env.OCR_MAX_BYTES || 25 * 1024 * 1024);
const OCR_LANG = process.env.OCR_LANG || "eng";

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true, provider: "local-tesseract" });
    }

    if (req.method !== "POST" || req.url !== "/ocr") {
      return json(res, 404, { error: "Not found" });
    }

    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
      return json(res, 401, { error: "Unauthorized" });
    }

    const body = await readBody(req, MAX_BYTES);
    const payload = JSON.parse(body.toString("utf8"));
    if (payload.mimeType !== "application/pdf" || typeof payload.data !== "string") {
      return json(res, 400, { error: "Expected base64 PDF data and application/pdf mimeType" });
    }

    const buffer = Buffer.from(payload.data, "base64");
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return json(res, 413, { error: "PDF exceeds OCR worker size limit" });
    }

    const pages = normalizePages(payload.pages);
    return json(res, 200, await ocrPdf(buffer, pages));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    const status = message === "Request body too large" ? 413 : 422;
    return json(res, status, { error: message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`OTTO OCR worker listening on ${PORT}`);
});

async function ocrPdf(buffer, pages) {
  const root = await mkdtemp(join(tmpdir(), "otto-ocr-worker-"));
  const pdfPath = join(root, "document.pdf");
  const prefix = join(root, "page");

  try {
    await writeFile(pdfPath, buffer);

    const renderArgs = ["-r", "200", "-png"];
    if (pages.length) {
      renderArgs.push("-f", String(pages[0]), "-l", String(pages[pages.length - 1]));
    }
    renderArgs.push(pdfPath, prefix);
    await run("pdftoppm", renderArgs);

    const requested = new Set(pages);
    const files = (await readdir(root))
      .filter((name) => /^page-\d+\.png$/.test(name))
      .filter((name) => requested.has(Number(name.match(/\d+/)?.[0])))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

    if (!files.length) throw new Error("OCR worker could not render requested PDF pages");

    const results = [];
    for (const file of files) {
      const pageNumber = Number(file.match(/\d+/)?.[0]);
      const { stdout } = await run("tesseract", [
        join(root, file),
        "stdout",
        "-l",
        OCR_LANG,
        "--psm",
        "3",
      ]);
      results.push({ pageNumber, text: stdout.trim() });
    }

    return {
      provider: "local-tesseract",
      ocrApplied: true,
      pages: results,
      fullText: results
        .map((page) => `[PAGE ${page.pageNumber}]\n${page.text}`)
        .join("\n\n"),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function normalizePages(value) {
  if (!Array.isArray(value) || value.length === 0) return [1];
  const pages = [...new Set(value.map(Number))].filter(
    (page) => Number.isInteger(page) && page > 0
  );
  if (!pages.length) return [1];
  return pages.sort((a, b) => a - b);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} failed (${code}): ${stderr.slice(0, 1200)}`));
    });
  });
}

function json(res, status, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(data),
  });
  res.end(data);
}
