import { normalizeStatus } from "./workflow";

type ReportedTicket = { id: number; status: string; dueDate: string | null };

// These are counts of recorded statuses, never evidence of verified completion.
// A ticket can have several reasons for attention but is counted only once.
export function summarizeReports(tickets: ReportedTicket[], today: string) {
  let active = 0, started = 0, review = 0, reportedResolved = 0, overdue = 0, qaIssues = 0;
  const attention = new Set<number>();
  for (const ticket of tickets) {
    const status = normalizeStatus(ticket.status);
    if (status === "Resolved") reportedResolved++;
    else active++;
    if (status === "Started") started++;
    if (status === "Peer Review" || status === "QA Started") review++;
    if (status === "QA Issue") { qaIssues++; attention.add(ticket.id); }
    if (status !== "Resolved" && ticket.dueDate && ticket.dueDate < today) {
      overdue++; attention.add(ticket.id);
    }
  }
  return { active, started, review, reportedResolved, overdue, qaIssues, attention: attention.size };
}
