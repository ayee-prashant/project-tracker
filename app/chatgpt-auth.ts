import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { profiles } from "../db/schema";
import { getAuth0 } from "../lib/auth0";
import { verifyBearer } from "../lib/bearer";
// Compatibility names retained for existing portal components; Sites headers are never trusted.
// via records HOW the caller proved who they are, which is the only reliable
// way to tell an agent from the person it signs in as. A bearer token is issued
// for the /mcp audience and can only belong to a connected agent; a session
// cookie means a person is at a keyboard. Both are the same USER - they are not
// the same authority, and handlers must be able to tell them apart.
export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null; via: "agent" | "browser" };
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const authorization = (await headers()).get("authorization");
  if (authorization) {
    if (!authorization.startsWith("Bearer ")) return null;
    try {
      const sub = await verifyBearer(authorization.slice(7));
      const profile = getDb().select().from(profiles).where(eq(profiles.userId, sub)).get();
      // Verified web sign-in must establish the subject/email mapping first.
      return profile ? { userId: sub, email: profile.email, displayName: profile.displayName, fullName: profile.displayName, via: "agent" } : null;
    } catch { return null; }
  }
  const client = getAuth0();
  if (!client) return null;
  const session = await client.getSession();
  const user = session?.user;
  if (!user?.sub || !user.email || user.email_verified !== true) return null;
  const email = String(user.email).toLowerCase();
  const fullName = typeof user.name === "string" ? user.name : null;
  getDb().insert(profiles).values({ userId: user.sub, email, displayName: fullName || email }).onConflictDoNothing().run();
  return { userId: user.sub, email, displayName: fullName || email, fullName, via: "browser" };
}
export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safePath(returnTo))}`);
}
function safePath(value: string) {
  try {
    const url = new URL(value, "https://app.local");
    return value.startsWith("/") && url.origin === "https://app.local" && !url.pathname.startsWith("/auth/") ? `${url.pathname}${url.search}` : "/dashboard";
  } catch { return "/dashboard"; }
}
export function chatGPTSignInPath(returnTo: string) { return `/auth/login?returnTo=${encodeURIComponent(safePath(returnTo))}`; }
export function chatGPTSignOutPath(_returnTo = "/") { return "/auth/logout"; }
