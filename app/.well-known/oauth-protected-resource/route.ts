import { issuer, resource } from "../../../lib/bearer";
export const dynamic = "force-dynamic";
export function GET() {
  const iss = issuer(), url = resource();
  if (!iss || !url) return Response.json({ error: "OAuth setup is required" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json({ resource: url, authorization_servers: [iss], bearer_methods_supported: ["header"], scopes_supported: ["portal:access"] }, { headers: { "Cache-Control": "no-store" } });
}
