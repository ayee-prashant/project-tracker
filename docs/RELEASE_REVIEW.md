# Jira-style space tracking review — 2026-09-24

Scope: project page, shared space views, ticket dialog, project query coverage,
validated version-aware updates and atomic activity persistence. No schema change,
dependency addition, identity bypass, Hub migration, deployment or merge.

## Checks

- TypeScript: passed against the changed application.
- MCP protocol (47 checks), navigation/network handling, reporting regressions,
  new board helpers and real SQLite integration: passed.
- SQLite tests include membership restrictions, invalid/merged dates, illegal
  transitions, stale version conflicts, no activity on rejected changes, rollback
  when activity insertion fails, and permission-scoped 500-ticket coverage.
- Scoped Next/TypeScript ESLint for the space components, helpers and changed
  routes: passed. Full-repository lint was also attempted and is not green:
  25 errors and 7 warnings at the time of that run, in older UI/API/test patterns
  (explicit any, CommonJS tests, effect and navigation rules). Two unused imports
  in the changed ticket route were subsequently removed. Unrelated lint cleanup
  is not included. The previously missing lint configuration now exists;
  `pnpm lint:space` reproduces the component/helper check.
- Production build: passed; unchanged Auth0 webpack dynamic-import warning remains.
- Standalone smoke: passed for login/setup, protected navigation, health/storage,
  forged-header denial, MCP authentication challenge and cross-origin writes.
- Browser: actual components with explicitly synthetic responses checked at
  1623px desktop and 390px mobile. Search, five views, creation, allowed card status
  change, grouping, drag/drop, rejected workflow shortcut and retained draft after
  simulated save failure were exercised. No application page errors were reported
  during those checks. Mobile columns scroll horizontally. Local screenshots live
  in ignored test-results; no real user content is included.
- The drag test found a notice-precedence defect; the fix was rechecked in browser:
  Started-to-Done is rejected, the card stays put and the explanation is visible.

## Security and limits

Server identity and persisted project membership determine access. A client role,
assignee display name or record version does not grant authorization. Updates use
validated allowlisted fields and prepared Drizzle SQL, and recheck permissions
inside the update transaction. Draft state changes do not become board truth until
the response confirms persistence. Client versions are optional for compatibility
with older callers; only version-aware clients reject a stale editing snapshot.

The local preview is an isolated synthetic fixture, not a production auth bypass.
Local Auth0 is still unconfigured, so authenticated browser-to-live-database CRUD
and a real MCP OAuth handshake remain unverified. API integration fixtures and
browser component fixtures are separate checks, not a claimed end-to-end login.

Summary counts describe reported records, with a subset warning beyond 500.
Reported resolution and comments are not independent CI evidence. This change does
not establish the original PM/developer pilot's time savings, accuracy in real use,
missed updates or reporting overhead. Full Jira feature parity is not claimed;
see SPACE-TRACKING.md for implemented and omitted behavior.
