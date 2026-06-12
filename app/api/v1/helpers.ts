import { NextResponse, NextRequest } from "next/server";
import { validateApiKey, keyHasScope, type ApiScope } from "@/lib/api-keys";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function withApiAuth(
  req: NextRequest,
  requiredScope: ApiScope,
  handler: (orgId: string, body?: any) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  if (!keyHasScope(result.key, requiredScope)) {
    return NextResponse.json({ error: "Insufficient scope. Required: " + requiredScope }, { status: 403 });
  }

  const rateKey = result.key.prefix;
  const maxReqs = result.key.rate_limit || 100;
  const rateResult = checkRateLimit(rateKey, maxReqs);

  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: getRateLimitHeaders(rateResult) }
    );
  }

  const orgId = result.key.organization_id;
  const response = await handler(orgId);

  for (const [key, value] of Object.entries(getRateLimitHeaders(rateResult))) {
    response.headers.set(key, value);
  }

  return response;
}
