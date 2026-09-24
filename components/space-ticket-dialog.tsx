'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { portalFetch } from '../lib/portal-fetch';
import type { SpaceTicket } from '../lib/space-board';
import { nextStages, normalizeStatus } from '../lib/workflow';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

type Detail = { ticket: SpaceTicket; role: string; activity: { id: number; userName: string; action: string; detail: string; createdAt: string }[]; comments: { id: number; userName: string; body: string }[] };
export function SpaceTicketDialog({ ticket, onClose, onSaved }: { ticket: SpaceTicket; onClose: () => void; onSaved: (ticket: SpaceTicket) => void }) {
  const [data, setData] = useState<Detail | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [comment, setComment] = useState('');
  const saving = useRef(false), active = useRef(true);
  const load = useCallback(async () => { try { const response = await portalFetch(`/api/tickets/${ticket.id}`), result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load ticket'); if (active.current) setData(result); } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Could not load ticket'); } }, [ticket.id]);
  // This effect loads external ticket data, not state derived from render props.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; }; }, [load]);
  async function save(event: React.FormEvent<HTMLFormElement>, isComment = false) {
    event.preventDefault(); if (saving.current || !data) return; saving.current = true; setBusy(true); setError('');
    const body = isComment ? { body: comment } : { ...Object.fromEntries(new FormData(event.currentTarget)), expectedUpdatedAt: data.ticket.updatedAt };
    try { const response = await portalFetch(`/api/tickets/${ticket.id}${isComment ? '/comments' : ''}`, { method: isComment ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save'); if (isComment) setComment(''); else { setData(current => current && ({ ...current, ticket: result.ticket })); onSaved(result.ticket); } await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Your draft is retained.'); }
    finally { saving.current = false; setBusy(false); }
  }
  const editable = data && ['owner', 'editor'].includes(data.role), status = normalizeStatus(data?.ticket.status || ticket.status);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[92vh] overflow-auto sm:max-w-3xl"><DialogTitle>{ticket.key}</DialogTitle><DialogDescription>Reported work and its recorded history. A status change is not independent verification.</DialogDescription><a href={`/tickets/${ticket.id}`} className="text-sm text-blue-700 underline">Open full ticket and attachments</a>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}{!data && <button onClick={load}> Retry</button>}</p>}
    {!data ? <p role="status">Loading ticket…</p> : <><form key={data.ticket.updatedAt} onSubmit={event => save(event)} className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm sm:col-span-2">Title<Input name="title" defaultValue={data.ticket.title} required maxLength={300} disabled={!editable || busy} /></label><label className="grid gap-1 text-sm">Reported status<select name="status" defaultValue={status} disabled={!editable || busy} className="h-9 rounded border bg-white px-2">{[status, ...(nextStages[status] ?? [])].map(value => <option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-sm">Priority<select name="priority" defaultValue={data.ticket.priority} disabled={!editable || busy} className="h-9 rounded border bg-white px-2">{['Low', 'Medium', 'High', 'Critical'].map(value => <option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-sm">Assignee<Input name="assigneeName" defaultValue={data.ticket.assigneeName} maxLength={200} disabled={!editable || busy} /></label><label className="grid gap-1 text-sm">Labels<Input name="labels" defaultValue={data.ticket.labels} maxLength={2000} disabled={!editable || busy} /></label><label className="grid gap-1 text-sm">Start date<Input name="startDate" type="date" defaultValue={data.ticket.startDate || ''} disabled={!editable || busy} /></label><label className="grid gap-1 text-sm">Due date<Input name="dueDate" type="date" defaultValue={data.ticket.dueDate || ''} disabled={!editable || busy} /></label><label className="grid gap-1 text-sm sm:col-span-2">Description<Textarea name="description" defaultValue={data.ticket.description} maxLength={100000} disabled={!editable || busy} /></label>{editable && <Button className="justify-self-end sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>}</form>
    <section className="border-t pt-4"><h3 className="font-semibold">Ticket timeline</h3><p className="text-xs text-slate-500">Latest 100 recorded events. These entries preserve reports; external activity is unknown.</p><ol className="mt-3 space-y-3">{data.activity.map(event => <li key={event.id} className="border-l-2 border-blue-200 pl-3 text-sm"><strong>{event.userName} · {event.action}</strong><time className="block text-xs text-slate-500">{event.createdAt}</time><p className="whitespace-pre-wrap break-words">{event.detail}</p></li>)}</ol>{!data.activity.length && <p className="text-sm">No recorded events.</p>}</section>
    <section className="border-t pt-4"><h3 className="font-semibold">Comments</h3>{data.comments.map(row => <div key={row.id} className="py-2 text-sm"><strong>{row.userName}</strong><p className="whitespace-pre-wrap break-words">{row.body}</p></div>)}{editable && <form onSubmit={event => save(event, true)} className="mt-3 grid gap-2"><label className="text-sm">Add a comment<Textarea value={comment} onChange={event => setComment(event.target.value)} required maxLength={20000} disabled={busy} /></label><Button disabled={busy || !comment.trim()} className="justify-self-end">Post comment</Button></form>}</section></>}
  </DialogContent></Dialog>;
}
