/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation rechecks private-session authentication; existing portal navigation contract. */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { portalFetch } from '../lib/portal-fetch';
import { LoadError } from './load-error';
import { SpaceBoard } from './space-board';
import { SpaceTicketDialog } from './space-ticket-dialog';
import type { SpaceTicket } from '../lib/space-board';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

type SpaceData = { project: { name: string; key: string; role: string }; tickets: SpaceTicket[]; hasMore: boolean; members: { id: number; userEmail: string; role: string; userId: string | null }[] };
export function ProjectDetail({ id }: { id: string }) {
  const [data, setData] = useState<SpaceData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [selected, setSelected] = useState<SpaceTicket | null>(null);
  const [create, setCreate] = useState(false), [members, setMembers] = useState(false), [busy, setBusy] = useState(false), [formError, setFormError] = useState('');
  const saving = useRef(false), generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const response = await portalFetch(`/api/projects/${id}`), result = await response.json(); if (current !== generation.current) return; if (!response.ok) throw new Error(result.error || 'Could not load space'); setData(result); }
    catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Could not load space'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [id]);
  // Fetch from the external API; invalidate outstanding responses on unmount.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  function confirmed(ticket: SpaceTicket) { generation.current++; setLoading(false); setData(current => current && ({ ...current, tickets: current.tickets.map(row => row.id === ticket.id ? ticket : row).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id) })); setNotice(`${ticket.key} saved. Its status is a report, not independent verification.`); }
  async function move(ticket: SpaceTicket, status: string) {
    if (saving.current) return false; saving.current = true; setBusy(true); setNotice(''); generation.current++; setLoading(false);
    try { const response = await portalFetch(`/api/tickets/${ticket.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, expectedUpdatedAt: ticket.updatedAt }) }), result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not move ticket'); confirmed(result.ticket); return true; }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Could not move ticket. Refresh before trying again.'); return false; }
    finally { saving.current = false; setBusy(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>, member: boolean) {
    event.preventDefault(); if (saving.current) return; const form = event.currentTarget, body = Object.fromEntries(new FormData(form));
    saving.current = true; setBusy(true); setFormError(''); generation.current++; setLoading(false);
    try {
      const response = await portalFetch(member ? `/api/projects/${id}/members` : '/api/tickets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(member ? body : { ...body, projectId: Number(id) }) }), result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save');
      if (member) { form.reset(); await load(); }
      else { setData(current => current && ({ ...current, tickets: [result.ticket, ...current.tickets].slice(0, 500), hasMore: current.hasMore || current.tickets.length >= 500 })); setCreate(false); setNotice(`${result.ticket.key} created in To Do.`); }
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not save. Your draft is retained.'); }
    finally { saving.current = false; setBusy(false); }
  }
  if (!data) return <main className="min-h-screen bg-[#e9f2ff] p-6"><a href="/projects">Spaces</a>{error ? <LoadError message={error} retry={load} /> : <p role="status">Loading space…</p>}</main>;
  return <>{error && <div className="bg-amber-50 p-3" role="alert">Showing the last loaded snapshot. {error} <button onClick={load}>Retry</button></div>}
    <SpaceBoard name={data.project.name} spaceKey={data.project.key} tickets={data.tickets} editable={['owner', 'editor'].includes(data.project.role) && !error} owner={data.project.role === 'owner'} refreshing={loading} busy={busy} hasMore={data.hasMore} notice={notice} onRefresh={load} onOpen={setSelected} onCreate={() => { setFormError(''); setCreate(true); }} onMembers={() => { setFormError(''); setMembers(true); }} onMove={move} />
    {selected && <SpaceTicketDialog key={selected.id} ticket={selected} onClose={() => setSelected(null)} onSaved={confirmed} />}
    <Dialog open={create} onOpenChange={open => { if (!busy) setCreate(open); }}><DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl"><DialogTitle>Create work item</DialogTitle><DialogDescription>New work starts as Created in To Do. Follow the review and QA workflow from its card.</DialogDescription><form onSubmit={event => submit(event, false)} className="grid gap-4 sm:grid-cols-2"><Field label="Title" wide><Input name="title" required maxLength={300} disabled={busy} /></Field><Field label="Work type"><Select name="issueType" values={['Task', 'Bug', 'Story', 'Epic']} disabled={busy} /></Field><Field label="Priority"><Select name="priority" values={['Medium', 'High', 'Critical', 'Low']} disabled={busy} /></Field><Field label="Assignee"><Input name="assigneeName" maxLength={200} disabled={busy} /></Field><Field label="Labels (comma separated)"><Input name="labels" maxLength={2000} disabled={busy} /></Field><Field label="Start date"><Input name="startDate" type="date" disabled={busy} /></Field><Field label="Due date"><Input name="dueDate" type="date" disabled={busy} /></Field><Field label="Description" wide><Textarea name="description" maxLength={100000} disabled={busy} /></Field>{formError && <p role="alert" className="text-red-700 sm:col-span-2">{formError}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setCreate(false)}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : 'Create work item'}</Button></div></form></DialogContent></Dialog>
    <Dialog open={members} onOpenChange={open => { if (!busy) setMembers(open); }}><DialogContent className="max-h-[90vh] overflow-auto"><DialogTitle>Space members</DialogTitle><DialogDescription>Members also need access to this private site. No invitation email is sent. Add the same email to change its role.</DialogDescription><form onSubmit={event => submit(event, true)} className="grid gap-3"><Field label="Member email"><Input name="email" type="email" required disabled={busy} /></Field><Field label="Role"><Select name="role" values={['editor', 'viewer']} disabled={busy} /></Field><Button disabled={busy}>Save member</Button></form>{formError && <p role="alert">{formError}</p>}<ul>{data.members.map(member => <li key={member.id} className="border-b py-3">{member.userEmail} · {member.role} · {member.userId ? 'Connected' : 'Not connected yet'}</li>)}</ul></DialogContent></Dialog>
  </>;
}
export function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`grid gap-1.5 text-sm ${wide ? 'sm:col-span-2' : ''}`}><span className="font-medium">{label}</span>{children}</label>; }
export function Select({ name, values, disabled, defaultValue }: { name: string; values: string[]; disabled?: boolean; defaultValue?: string }) { return <select name={name} defaultValue={defaultValue} disabled={disabled} className="h-9 w-full rounded-md border bg-white px-3">{values.map(value => <option key={value}>{value}</option>)}</select>; }
