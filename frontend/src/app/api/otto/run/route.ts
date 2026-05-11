import { runOtto } from "../../services/otto-client/ottoClient";
import { z } from "zod";

const OttoRequestSchema = z.object({
  task: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  mode: z.enum(["sync", "async", "stream"]).optional(),
});

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60000;

const MOCK_USER_ID = "1";
const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";

function getClientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];

  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_WINDOW_MS);

  if (recentTimestamps.length >= RATE_LIMIT) {
    return false;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);
  return true;
}

function generateUUID(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
    return (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4))).toString(16);
  });
}

function normalizeResponse(data: any): { success: boolean; data?: any; error?: string } {
  if (data && typeof data === "object" && "success" in data) {
    return data;
  }
  return { success: true, data };
}

async function runOttoAsync(input: any, userId: string, orgId: string) {
  const res = await fetch("http://localhost:8000/api/otto/run-async", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-org-id": orgId,
    },
    body: JSON.stringify(input)
  })
  return res.json()
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = generateUUID();
  const clientIP = getClientIP(request);

  const userId = request.headers.get("x-user-id") ?? MOCK_USER_ID;
  const orgId = request.headers.get("x-org-id") ?? MOCK_ORG_ID;

  if (!checkRateLimit(clientIP)) {
    return Response.json(
      {
        success: false,
        error: "Rate limit exceeded",
        meta: {
          requestId,
          duration: Date.now() - startTime,
        },
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validation = OttoRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid input",
          meta: {
            requestId,
            duration: Date.now() - startTime,
          },
        },
        { status: 400 }
      );
    }

    if (body.mode === "stream") {
      return new Response("Streaming not implemented", { status: 501 });
    }

    let backendResponse;
    if (body.mode === "async") {
      const asyncResult = await runOttoAsync(body, userId, orgId);
      if (!asyncResult.success) {
        return Response.json(
          {
            success: false,
            error: asyncResult.data?.error || "Async job creation failed",
            meta: {
              requestId,
              duration: Date.now() - startTime,
            },
          },
          { status: 500 }
        );
      }
      return Response.json({
        success: true,
        data: { jobId: asyncResult.data.jobId },
        meta: {
          requestId,
          duration: Date.now() - startTime,
        },
      });
    }

    backendResponse = await runOtto(body);
    const normalized = normalizeResponse(backendResponse);
    const duration = Date.now() - startTime;

    return Response.json({
      ...normalized,
      meta: {
        requestId,
        duration,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    return Response.json(
      {
        success: false,
        data: null,
        error: String(error),
        meta: {
          requestId,
          duration,
        },
      },
      { status: 500 }
    );
  }
}