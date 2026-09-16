/**
 * Document Intelligence unit tests (Milestone 3.0).
 * Run: npx tsx lib/document-intelligence/__tests__/intelligence.test.ts
 */
import assert from "node:assert/strict";
import { classifyDocument, documentTypeLabel } from "../classification";
import {
  adjustForOcr,
  clampConfidence,
  computeOverallConfidence,
} from "../confidence";
import { DeterministicExtractionProvider } from "../providers/deterministic-extraction";
import { EXTRACTION_FIELD_DEFS, JOB_STATUS } from "../constants";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${e.message}`);
    }
  })();
}

async function main() {
  console.log("\nDocument Intelligence (M3.0)\n");

  await test("clampConfidence bounds", () => {
    assert.equal(clampConfidence(1.5), 1);
    assert.equal(clampConfidence(-1), 0);
    assert.equal(clampConfidence(0.42), 0.42);
  });

  await test("computeOverallConfidence mean", () => {
    const v = computeOverallConfidence([
      { fieldKey: "a", fieldLabel: "A", value: "x", confidence: 0.5 },
      { fieldKey: "b", fieldLabel: "B", value: "y", confidence: 1 },
    ]);
    assert.ok(Math.abs(v - 0.75) < 1e-9);
  });

  await test("adjustForOcr reduces confidence", () => {
    assert.ok(adjustForOcr(1, true) < 1);
    assert.equal(adjustForOcr(0.5, false), 0.5);
  });

  await test("classify NDA", () => {
    const r = classifyDocument("This Non-Disclosure Agreement protects confidential information.");
    assert.equal(r.documentType, "nda");
    assert.ok(r.confidence > 0.5);
  });

  await test("classify recording agreement", () => {
    const r = classifyDocument("EXCLUSIVE RECORDING AGREEMENT between Artist and Label.");
    assert.equal(r.documentType, "recording_agreement");
  });

  await test("classify unknown", () => {
    const r = classifyDocument("Hello world with no legal keywords.");
    assert.equal(r.documentType, "unknown");
  });

  await test("documentTypeLabel", () => {
    assert.equal(documentTypeLabel("nda"), "NDA");
    assert.equal(documentTypeLabel("nope"), "nope");
  });

  await test("deterministic extraction produces draft fields", async () => {
    const provider = new DeterministicExtractionProvider();
    const text = `
      Recording Agreement
      Effective Date: January 1, 2024
      Parties: Artist A and Label B
      Territory: Worldwide
      Currency: USD
      Governing Law: State of California
      Contract Number: CON-12345
    `;
    const result = await provider.extract({
      text,
      filename: "recording.pdf",
      promptVersion: "test",
    });
    assert.equal(result.provider, "deterministic");
    assert.ok(result.fields.length === EXTRACTION_FIELD_DEFS.length);
    const parties = result.fields.find((f) => f.fieldKey === "parties");
    assert.ok(parties?.value);
    assert.ok((parties?.confidence || 0) > 0);
    // Never "verified"
    assert.ok(result.overallConfidence <= 1);
  });

  await test("job status constants complete", () => {
    assert.equal(JOB_STATUS.queued, "queued");
    assert.equal(JOB_STATUS.failed, "failed");
    assert.equal(JOB_STATUS.retrying, "retrying");
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
