import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { OcrProvider, OcrResult } from "./ocr-provider";

/**
 * Local OCR provider for environments that ship Poppler + Tesseract.
 *
 * The provider deliberately keeps the runtime contract small: PDF bytes in,
 * page-preserving text out. It does not call a hosted OCR API.
 */
export class LocalPdfOcrProvider implements OcrProvider {
  async extractText(input: {
    buffer: Buffer;
    mimeType: string;
    filename?: string;
  }): Promise<OcrResult> {
    if (input.mimeType !== "application/pdf") {
      throw new Error("Local PDF OCR only supports application/pdf");
    }

    const root = await mkdtemp(join(tmpdir(), "otto-ocr-"));
    const pdfPath = join(root, "document.pdf");
    const prefix = join(root, "page");

    try {
      await writeFile(pdfPath, input.buffer);
      await run("pdftoppm", ["-r", "200", "-png", pdfPath, prefix]);

      const { stdout: files } = await run("sh", [
        "-c",
        `printf '%s\\n' "${prefix}"-*.png | sort -V`,
      ]);
      const pages = files
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);

      if (pages.length === 0) {
        throw new Error("Local OCR could not render PDF pages");
      }

      const results: OcrResult["pages"] = [];
      for (let index = 0; index < pages.length; index += 1) {
        const { stdout } = await run("tesseract", [
          pages[index],
          "stdout",
          "-l",
          process.env.OCR_LANG || "eng",
          "--psm",
          "3",
        ]);
        results.push({ pageNumber: index + 1, text: stdout.trim() });
      }

      return {
        fullText: results
          .map((page) => `[PAGE ${page.pageNumber}]\n${page.text}`)
          .join("\n\n"),
        pages: results,
        ocrApplied: true,
        provider: "local-tesseract",
      };
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
}

function run(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} failed (${code}): ${stderr.slice(0, 1000)}`));
    });
  });
}

export const localPdfOcrProvider = new LocalPdfOcrProvider();
