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

    return json(res, 200, await ocrPdf(buffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    const status = message === "Request body too large" ? 413 : 422;
    return json(res, status, { error: message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`OTTO OCR worker listening on ${PORT}`);
});

async function ocrPdf(buffer) {
  const root = await mkdtemp(join(tmpdir(), "otto-ocr-worker-"));
  const pdfPath = join(root, "document.pdf");
  const prefix = join(root, "page");

  try {
    await writeFile(pdfPath, buffer);
    await run("pdftoppm", ["-r", "200", "-png", pdfPath, prefix]);

    const files = (await readdir(root))
      .filter((name) => /^page-\d+\.png$/.test(name))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

    if (!files.length) throw new Error("OCR worker could not render PDF pages");

    const pages = [];
    for (let i = 0; i < files.length; i += 1) {
      const { stdout } = await run("tesseract", [
        join(root, files[i]),
        "stdout",
        "-l",
        OCR_LANG,
        "--psm",
        "3",
      ]);
      pages.push({ pageNumber: i + 1, text: stdout.trim() });
    }

    return {
      provider: "local-tesseract",
      ocrApplied: true,
      pages,
      fullText: pages.map((page) => `[PAGE ${page.pageNumber}]\n${page.text}`).join("\n\n"),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(data) });
  res.end(data);
}
