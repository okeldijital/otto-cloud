import { OttoRequest, OttoResponse } from "../types/otto";

export async function runOtto(input: OttoRequest, userId?: string, orgId?: string): Promise<OttoResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (userId) headers["x-user-id"] = userId;
  if (orgId) headers["x-org-id"] = orgId;

  const res = await fetch("http://localhost:8000/api/otto/run", {
    method: "POST",
    headers,
    body: JSON.stringify(input)
  })

  return res.json()
}