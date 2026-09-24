import { and, eq, or } from 'drizzle-orm';
import { getDb } from '../db';
import { profiles, projectMembers, projects, ticketActivity, tickets } from '../db/schema';
import { validTransition } from './workflow';
import { ticketUpdate } from './validation';
import type { z } from 'zod';

export class TicketUpdateError extends Error { constructor(message: string, public status: number) { super(message); } }
export function updateTicket(id: number, user: { userId: string; email: string; displayName: string }, input: z.infer<typeof ticketUpdate>) {
  return getDb().transaction(tx => {
    const before = tx.select().from(tickets).where(eq(tickets.id, id)).get();
    if (!before) throw new TicketUpdateError('Editor access is required', 403);
    let permitted = before.reporterId === user.userId;
    if (before.projectId) {
      const project = tx.select().from(projects).where(eq(projects.id, before.projectId)).get();
      const member = tx.select().from(projectMembers).where(and(eq(projectMembers.projectId, before.projectId), or(eq(projectMembers.userId, user.userId), eq(projectMembers.userEmail, user.email)))).get();
      permitted = project?.ownerId === user.userId || member?.role === 'editor';
    }
    if (!permitted) throw new TicketUpdateError('Editor access is required', 403);
    const { expectedUpdatedAt, ...fields } = input;
    if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== before.updatedAt) throw new TicketUpdateError('This ticket changed since you opened it. Your draft is retained; reopen or refresh to review the latest version before saving.', 409);
    if (fields.status !== undefined && !validTransition(before.status, fields.status)) throw new TicketUpdateError('Invalid workflow transition. Follow the review and QA loop.', 400);
    const merged = { ...before, ...fields };
    if (merged.startDate && merged.dueDate && merged.startDate > merged.dueDate) throw new TicketUpdateError('Due date cannot be before start date', 400);
    const previousTime = Date.parse(before.updatedAt.includes('T') ? before.updatedAt : before.updatedAt.replace(' ', 'T') + 'Z');
    const updatedAt = new Date(Math.max(Date.now(), (Number.isNaN(previousTime) ? 0 : previousTime) + 1)).toISOString();
    const ticket = tx.update(tickets).set({ ...fields, updatedAt }).where(and(eq(tickets.id, id), eq(tickets.updatedAt, before.updatedAt))).returning().get();
    if (!ticket) throw new TicketUpdateError('Ticket changed. Refresh before trying again.', 409);
    const profile = tx.select().from(profiles).where(eq(profiles.userId, user.userId)).get();
    const changes = (Object.keys(fields) as (keyof typeof fields)[]).filter(key => String(before[key] ?? '') !== String(fields[key] ?? ''));
    tx.insert(ticketActivity).values({ ticketId: id, userId: user.userId, userName: profile?.displayName ?? user.displayName, action: 'updated', detail: changes.length ? changes.map(key => `${key}: ${String(before[key] ?? '—')} → ${String(fields[key] ?? '—')}`).join('; ') : 'Saved ticket without field changes' }).run();
    return ticket;
  });
}
