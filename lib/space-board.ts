import { nextStages, normalizeStatus } from './workflow';

export type SpaceTicket = {
  id: number; key: string; title: string; description: string; status: string;
  issueType: string; priority: string; assigneeName: string; labels: string;
  startDate: string | null; dueDate: string | null; updatedAt: string;
};
export const boardColumns = ['To Do', 'In Progress', 'Done'] as const;
export type BoardColumn = typeof boardColumns[number];
export function columnFor(status: string): BoardColumn {
  const normalized = normalizeStatus(status);
  return normalized === 'Resolved' ? 'Done' : ['Created', 'Open'].includes(normalized) ? 'To Do' : 'In Progress';
}
export function moveTargets(ticket: SpaceTicket, column: BoardColumn) {
  return (nextStages[normalizeStatus(ticket.status)] ?? []).filter(status => columnFor(status) === column);
}
export function ticketLabels(value: string) { return value.split(',').map(label => label.trim()).filter(Boolean); }
export function filterTickets(tickets: SpaceTicket[], filters: { query: string; assignee: string; priority: string; type: string }) {
  const query = filters.query.trim().toLocaleLowerCase();
  return tickets.filter(ticket => (!query || [ticket.key, ticket.title, ticket.assigneeName, ticket.labels].join(' ').toLocaleLowerCase().includes(query))
    && (!filters.assignee || (ticket.assigneeName || 'Unassigned') === filters.assignee)
    && (!filters.priority || ticket.priority === filters.priority)
    && (!filters.type || ticket.issueType === filters.type));
}
export function groupTickets(tickets: SpaceTicket[], group: 'none' | 'assignee' | 'priority') {
  if (group === 'none') return [{ name: '', tickets }];
  const groups = new Map<string, SpaceTicket[]>();
  for (const ticket of tickets) {
    const name = group === 'assignee' ? ticket.assigneeName || 'Unassigned' : ticket.priority;
    groups.set(name, [...groups.get(name) ?? [], ticket]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([name, rows]) => ({ name, tickets: rows }));
}
export function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'; }
export function dateLabel(date: string | null) {
  return date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';
}
