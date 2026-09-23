# Project Tracker

Development Status Portal migrated from Sites to Next.js on Railway.

Dashboard statuses and progress are reported values, not independently verified
completion. Counts cover the loaded accessible tickets; the UI warns when older
tickets exceed the 250-record list limit. See [STRIDE-REVIEW.md](STRIDE-REVIEW.md)
for the focused reporting corrections and the team-visibility assessment.

## Run

Node 24 and pnpm 11.25.0. Run `pnpm install`, `pnpm build`, `pnpm start`.
For local development use `pnpm dev`. Storage defaults to `./data`.
Never commit credentials, databases, uploads, or environment files.

## Railway deployment

Deploy this repository using its Dockerfile. Attach **one persistent volume at `/data`** before starting. The entrypoint refuses Railway startup without this mount. Keep one replica. SQLite migrations run when storage is opened; SQLite WAL and foreign keys are enabled. Both the database and uploaded files live on the volume. Configure scheduled Railway volume backups in the Railway dashboard.

Set `APP_BASE_URL` to the public HTTPS origin, `DATA_DIR=/data`, and `PORT=3000`. `/api/health` reports storage readiness and whether authentication configuration is present; it does not prove an OAuth login has succeeded.

The original Sites database and attachments are **not automatically migrated**. This deployment starts a new database. A separate authorized export/import with identity mapping is required to preserve old projects.

## Authentication setup (required before using the app)

1. Create an Auth0 **Regular Web Application**. Set callback URL to `APP_BASE_URL/auth/callback`, logout URL to `APP_BASE_URL`, and web origin to `APP_BASE_URL`.
2. In Railway Variables, enter `AUTH0_DOMAIN` (hostname only), `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET`. Set `AUTH0_SECRET` to a cryptographically random 32-byte hex secret. Do not send secrets in chat.
3. Enable the desired Auth0 login connection and signup policy. Users must verify their email. Access to projects is limited to owners and members; signup alone grants no access to another user's projects.
4. Redeploy, sign in, and open Profile. A verified web sign-in establishes the user identity used by MCP. No fake accounts or test authentication bypass exists in production.

## Authenticated MCP

Endpoint: `APP_BASE_URL/mcp` (Streamable HTTP POST, stateless JSON responses).
Protected-resource discovery: `APP_BASE_URL/.well-known/oauth-protected-resource/mcp`.

Create an Auth0 API with identifier **exactly `APP_BASE_URL/mcp`**, RS256 signing, and scope `portal:access`. Enable Auth0's Resource Parameter Compatibility Profile for MCP resource indicators. Register/approve the ChatGPT OAuth client using Auth0's supported client registration flow (CIMD where supported, otherwise a registered OAuth client with the callback URL shown by ChatGPT). The portal web application credentials and the MCP client's credentials are separate. Do not reuse the web client secret in a plugin archive.

The authorization server remains Auth0; resource metadata points to its issuer. Missing configuration returns 503 for discovery. MCP requests without a valid bearer token return 401 with a resource-metadata challenge. Valid tokens require the correct issuer, audience, expiration, RS256 signature, subject, and `portal:access` scope. Sign into the portal once before connecting MCP. Existing project permissions apply to all tools.

Opening `/mcp` in a browser does not perform OAuth or list tickets. Use an MCP client. A plugin ZIP cannot enable server-side OAuth by itself.

### What a connected agent may not do

A connected agent acts as the user who authorized it, but it is not that user. The
identity records how it was proved - a bearer token for the `/mcp` audience is an
agent, a signed-in session is a person - and two things are refused for agents:

- **Setting status to `Resolved`.** Resolving is an acceptance, and acceptance is a
  human act. An agent moves finished work to `QA Started` and records its evidence
  with `add_comment`; a person accepts it.
- **Setting `progress`.** A percentage an agent chose has no evidence behind it and
  reads on a board exactly like a measured one.

Both are enforced in the ticket handler, not in the MCP layer, so a bearer token
used directly against `/api/tickets/{id}` is refused the same way. Ticket activity
records `updated by agent` rather than `updated`, so the timeline distinguishes what
an agent reported from what a person did.

These are authorization rules, not prompt guidance. A tool description asking an
agent not to resolve untested work is advice; this is a control.

## Verification

`pnpm test` checks MCP validation/protocol, navigation rendering, network error handling, storage, permissions, workflow and token rejection. `pnpm build` checks production compilation/types.
Live login, browser CRUD, and a real ChatGPT OAuth handshake must be verified after Auth0 is configured. Unit/integration fixtures do not count as live dogfooding.
