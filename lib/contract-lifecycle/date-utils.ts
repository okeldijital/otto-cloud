import type { KeyDateType } from "./constants";
import { prisma } from "@/lib/prisma";

export function tryParseDate(text: string): Date | null {
  const iso = Date.parse(text);
  if (!Number.isNaN(iso)) return new Date(iso);

  const m = text.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})|([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/
  );
  if (m) {
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  return null;
}

export async function seedVerifiedContractKeyDate(params: {
  lifecycleId: string;
  organizationId: string;
  contractId: number;
  dateType: KeyDateType;
  text?: string | null;
  sourceRef: string;
}) {
  if (!params.text) return;
  const parsed = tryParseDate(params.text);
  if (!parsed) return;

  await prisma.contractKeyDate.upsert({
    where: {
      lifecycleId_dateType: {
        lifecycleId: params.lifecycleId,
        dateType: params.dateType,
      },
    },
    create: {
      lifecycleId: params.lifecycleId,
      organizationId: params.organizationId,
      contractId: params.contractId,
      dateType: params.dateType,
      dateValue: parsed,
      timezone: "UTC",
      verificationState: "verified",
      source: "verified_contract",
      sourceRef: params.sourceRef,
      notes: `Seeded from: ${params.text}`,
    },
    update: {},
  });
}
