import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { authConfigured } from "../../../lib/auth0";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    getDb().get(sql`select 1`);
    return Response.json({ status: "ok", authentication: authConfigured() ? "configured" : "setup_required" });
  } catch { return Response.json({ status: "storage_unavailable" }, { status: 503 }); }
}
