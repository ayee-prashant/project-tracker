# Space tracking

The project page now uses the user's Jira business-space screenshot as its visual
reference: a pale-blue workspace, compact project header and view tabs, search and
assignee toolbar, narrow status columns and white ticket cards. The interface is
implemented in project-tracker; it does not replace STRIDE's Hub database.

## Working behavior

- Board, List, Summary, due-date Calendar and planned-date Timeline use the same
  loaded tickets and filters. Search covers title, key, labels and assignee.
- Board grouping supports assignee or priority. Card settings toggle labels and
  due dates. Cards open an accessible edit dialog with recorded activity/comments;
  the full ticket page retains attachment handling. Owners retain member editing.
- To Do groups Created/Open; In Progress groups Started/Peer Review/QA Started/QA
  Issue; Done groups Resolved. Legacy statuses are normalized for display.
- Drag/drop advances only an allowed transition to the destination column. It
  cannot skip review/QA. Use the card's status selector for transitions within a
  column or for keyboard operation. New work always starts Created.
- Saves update the board only after a confirmed response. Failed edits retain the
  draft. Board edits supply the read version; stale versions receive 409. Existing
  clients may omit this optional version for compatibility, so that guarantee
  applies to version-aware clients. Each ticket update and activity row commit in
  one SQLite transaction, with persisted membership rechecked there.
- Project reads are ordered by latest update/id and capped at 500. A visible
  warning discloses the subset when more exist. Filters and counts are local to
  that subset. This is not a complete search of larger projects.

Resolved means reported resolved. Agent comments are not CI verification. This
repo still lacks STRIDE's structured evidence provenance, agent challenges and
personal handover receipts. No automatic agent execution or new model dependency
was added. Free-model testing preferences are unchanged; this UI uses no model.

## Reference research

Reviewed official Atlassian documentation on 2026-09-24:

- [Business boards](https://support.atlassian.com/jira-software-cloud/docs/work-with-boards-in-business-projects/)
- [Business project views](https://support.atlassian.com/jira-software-cloud/docs/work-in-jira-business-projects/)
- [List](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-list-view/)
- [Calendar](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-calendar/)
- [Summary](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-summary-view/)

Jira's board organizes work by workflow status and supports movement, filters and
grouping. STRIDE's implementation adapts those behaviors to the existing review
workflow. It is not full Jira parity: no configurable status schema, ranking,
subtasks, Approvals, Forms, Docs, Reports or archive system is added. The screenshot's
additional tabs are omitted instead of presenting controls without functionality.

## Validation and local launch

The browser preview at http://127.0.0.1:7530 uses the actual components with
explicitly synthetic responses, separated from application authentication. Sample
ticket edits persist only in that browser. Reset samples restores the reference
layout. The protected application is at http://127.0.0.1:7531; local Auth0 setup is
still required. Discussion history remains at http://127.0.0.1:7520.

See docs/RELEASE_REVIEW.md for actual checks and limitations. No live OAuth login,
real participant trial, time savings, or reporting-overhead result is claimed.
