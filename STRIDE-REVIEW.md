# STRIDE interface assessment

Reviewed against the user's team visibility goal on 2026-09-24, starting at
`127314e`. Working branch: `codex/team-visibility-pilot`.

The initial assessment used this repository as a UI reference. The user's later
Jira-space request explicitly authorizes a working tracking interface here; see
SPACE-TRACKING.md for the implemented scope and validation. Keep STRIDE's existing ticket/event authority and
its scoped PM attention, developer handover and evidence-backed timeline. Replacing
the existing backend or adding a second identity bridge would increase the pilot
scope without establishing its value.

The source reviewed here does not distinguish agent reports from independently
observed evidence, bind checks to the submitted commit, maintain personal handover
receipts, or preserve structured cross-agent challenges. MCP uses the connected
user's identity; an assignee display name is not an independently authenticated
agent. A status transition or a comment saying tests passed is not verification.
This assessment is based on code review; it is not a deployed security audit.

## Bounded reporting corrections

- Removed the dashboard's average progress percentage presented as delivery health.
- Marked editable progress and resolved status as reports, with an explanation of
  what remains unverified.
- Counted each ticket once when it is both overdue and in the QA Issue state.
- Replaced the started-work dashboard metric with reported review work, covering
  both Peer Review and QA Started.
- Exposed the 250-ticket list limit with `hasMore`, and made the dashboard's loaded
  scope explicit. Metadata uses the same permission-filtered query as ticket data.
- Withheld current counts while loading or after a failed refresh rather than
  displaying zero or stale counts as current. Preserved the last loaded ticket
  snapshot with an explicit message after errors.

No schema, authentication, workflow authority, deployment, or orchestration change.
Existing stored progress values remain available as explicitly reported estimates.
This does not implement the full STRIDE pilot in a second application.

## Validation

New tests cover overlapping attention reasons, reported resolved/legacy statuses,
review counts, due-today behavior, and permission-scoped list-limit metadata.
Run `pnpm test`, `pnpm typecheck`, and `pnpm build` with the frozen lockfile.
Actual results:
- Frozen-lockfile install completed without changing the lockfile.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, including 47 MCP checks, rendered navigation/network
  handling, reporting regressions, real SQLite persistence/permissions, the
  250-ticket limit and inaccessible-ticket metadata isolation.
- `pnpm build`: passed. The unchanged Auth0 dependency emits a webpack dynamic
  dependency warning; this is not evidence of a completed live OAuth handshake.
- `node scripts/test-smoke.mjs`: passed against the standalone build, including
  protected routes, forged-header rejection, OAuth challenge and CSRF rejection.
- Browser: actual dashboard component with explicitly synthetic responses checked
  at desktop and 390px mobile widths, including overlapping counts, the limited
  250-ticket response, unavailable/loading states and zero reported page errors.
  This isolated component fixture does not bypass production authentication.
- `git diff --check`: passed. This repository has no configured lint command or
  ESLint configuration; a full lint pass is not claimed.

The first test run passed its assertions but failed Windows cleanup because the
fixture's SQLite connection remained open. The harness now closes it and validates
the temporary path before removal; the full rerun passed. An initial build attempt
also caught a nullability error in a disposable browser fixture `.tsx` file, which
was unintentionally included by the existing compiler glob. The fixture is now a
JSX artifact under ignored test-results; the subsequent production build passed.
Authenticated live browser CRUD and real-user MCP sessions were not exercised.

The STRIDE comparison still requires one PM and two developers using their own
MCP-connected agents. Accuracy, missed relevant updates, active investigation time,
and reporting/setup/correction overhead must be observed. Neither fixture timings
nor changes in reported progress establish human time savings.
