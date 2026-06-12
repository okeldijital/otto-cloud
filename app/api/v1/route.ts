import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "OTTO Cloud API",
    version: "1.0",
    base_url: "/api/v1",
    endpoints: {
      catalog: {
        path: "/api/v1/catalog?entity={artists|releases|tracks|works|labels}",
        method: "GET",
        description: "List catalog entities",
        scopes: ["catalog:read"],
        params: { entity: "Entity type (required)", limit: "Max results (1-100)", offset: "Pagination offset" },
      },
      royalties: {
        path: "/api/v1/royalties",
        method: "GET",
        description: "List royalties with summary by source",
        scopes: ["royalties:read"],
        params: { source: "Filter by source", limit: "Max results (1-100)", offset: "Pagination offset" },
      },
      contracts: {
        path: "/api/v1/contracts",
        method: "GET",
        description: "List contracts",
        scopes: ["contracts:read"],
        params: { status: "Filter by status", limit: "Max results (1-100)", offset: "Pagination offset" },
      },
    },
    authentication: "Bearer API_KEY",
    rate_limiting: "Per-key, configurable (default 100 req/min)",
  });
}
