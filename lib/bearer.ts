import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
let keySet: JWTVerifyGetKey | undefined;
export function issuer() {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain || !/^[a-zA-Z0-9.-]+$/.test(domain)) return null;
  return `https://${domain}/`;
}
export function resource() { return process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/mcp` : null; }
export async function verifyBearer(token: string, keys?: JWTVerifyGetKey) {
  const iss = issuer(), aud = resource();
  if (!iss || !aud) throw new Error("OAuth is not configured");
  const { payload } = await jwtVerify(token, keys ?? (keySet ??= createRemoteJWKSet(new URL(".well-known/jwks.json", iss))), {
    issuer: iss, audience: aud, algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat"],
  });
  if (!payload.sub || payload.sub.endsWith("@clients")) throw new Error("A user token is required");
  const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
  if (!scopes.includes("portal:access")) throw new Error("portal:access scope is required");
  return payload.sub;
}
