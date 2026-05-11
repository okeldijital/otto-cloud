import { OttoResponse } from "../types/otto";

export async function getJobStatus(jobId: string, userId?: string, orgId?: string): Promise<OttoResponse> {
  const headers: Record<string, string> = {};

  if (userId) headers["x-user-id"] = userId;
  if (orgId) headers["x-org-id"] = orgId;

  const res = await fetch(`http://localhost:8000/api/otto/job/${jobId}`, {
    method: "GET",
    headers,
  })
  return res.json()
}