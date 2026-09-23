import { Auth0Client } from "@auth0/nextjs-auth0/server";
export function authConfigured() {
  return ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET", "APP_BASE_URL"].every(key => Boolean(process.env[key]));
}
let client: Auth0Client | undefined;
export function getAuth0() {
  if (!authConfigured()) return null;
  return client ??= new Auth0Client({ authorizationParameters: { scope: "openid profile email" }, enableAccessTokenEndpoint: false });
}
