/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation rechecks private-session authentication; existing portal navigation contract. */
'use client';

import { useMemo, useRef, useState } from 'react';
import { AlignLeft, ArrowUpRight, CalendarDays, CheckSquare2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp, Columns3, Equal, Globe2, Layers2, List, Maximize2, Minimize2, MoreHorizontal, Plus, RefreshCw, Search, Settings2, SlidersHorizontal, TriangleAlert, Users } from 'lucide-react';
import { boardColumns, columnFor, dateLabel, filterTickets, groupTickets, initials, moveTargets, ticketLabels, type BoardColumn, type SpaceTicket } from '../lib/space-board';
import { summarizeReports } from '../lib/reporting';
import { normalizeStatus } from '../lib/workflow';
import styles from './space-board.module.css';

type View = 'Summary' | 'Board' | 'List' | 'Calendar' | 'Timeline';
type Props = {
  name: string; spaceKey: string; tickets: SpaceTicket[]; editable: boolean; owner: boolean;
  refreshing: boolean; busy: boolean; hasMore: boolean; notice?: string;
  onRefresh: () => void; onOpen: (ticket: SpaceTicket) => void; onCreate: () => void;
  onMembers: () => void; onMove: (ticket: SpaceTicket, status: string) => Promise<boolean>;
};
const views = [{ name: 'Summary', icon: Globe2 }, { name: 'Board', icon: Columns3 }, { name: 'List', icon: List }, { name: 'Calendar', icon: CalendarDays }, { name: 'Timeline', icon: AlignLeft }] as const;
const avatarColors = ['#00a4bd', '#ff991f', '#de350b', '#6554c0', '#0065ff', '#00875a'];
function Avatar({ name }: { name: string }) {
  const color = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length;
  return <span className={styles.avatar} style={{ background: avatarColors[color] }} title={name} aria-label={name}>{initials(name)}</span>;
}
function Priority({ value }: { value: string }) {
  const Icon = ['High', 'Critical'].includes(value) ? ChevronsUp : value === 'Low' ? ChevronDown : Equal;
  return <span className={styles.priority} data-priority={value} title={`${value} priority`}><Icon size={15} aria-label={`${value} priority`} /></span>;
}

export function SpaceBoard(props: Props) {
  const [view, setView] = useState<View>('Board');
  const [query, setQuery] = useState(''), [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState(''), [type, setType] = useState('');
  const [group, setGroup] = useState<'none' | 'assignee' | 'priority'>('none');
  const [showLabels, setShowLabels] = useState(true), [showDue, setShowDue] = useState(true);
  const [dragged, setDragged] = useState<number | null>(null), [dropMessage, setDropMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLElement>(null);
  const today = new Date().toLocaleDateString('en-CA');
  const people = useMemo(() => [...new Set(props.tickets.map(ticket => ticket.assigneeName || 'Unassigned'))].sort(), [props.tickets]);
  const filtered = useMemo(() => filterTickets(props.tickets, { query, assignee, priority, type }), [props.tickets, query, assignee, priority, type]);
  const groups = useMemo(() => groupTickets(filtered, group), [filtered, group]);
  const activeFilters = Number(Boolean(assignee)) + Number(Boolean(priority)) + Number(Boolean(type));
  const openTicket = (ticket: SpaceTicket) => { setDropMessage(''); props.onOpen(ticket); };
  const clearFilters = () => { setQuery(''); setAssignee(''); setPriority(''); setType(''); };
  async function drop(column: BoardColumn) {
    const ticket = props.tickets.find(row => row.id === dragged); setDragged(null);
    if (!ticket || columnFor(ticket.status) === column || props.busy) return;
    const targets = moveTargets(ticket, column);
    if (targets.length !== 1) {
      setDropMessage(targets.length ? 'Open the card and choose the exact next status.' : `The workflow does not allow ${ticket.status} to move directly to ${column}. Open the card to see its next steps.`);
      return;
    }
    setDropMessage(''); await props.onMove(ticket, targets[0]);
  }
  return <section ref={root} className={`${styles.space} ${expanded ? styles.expanded : ''}`} aria-label={`${props.name} tracking space`}>
    <header className={styles.header}>
      <a href="/projects" className={styles.breadcrumb}>Spaces</a>
      <div className={styles.titleRow}>
        <span className={styles.spaceIcon}><Layers2 size={14} /></span><h1>{props.name}</h1>
        {props.owner && <button className={styles.iconButton} title="Space members" aria-label="Space members" onClick={props.onMembers}><Users size={16} /></button>}
        <details className={styles.menu}><summary aria-label="Space options"><MoreHorizontal size={18} /></summary><div className={styles.popover}><strong>{props.spaceKey} · Tracking space</strong><p>Three board columns group the existing workflow. Done means reported resolved; it does not verify a test result.</p><a href="/dashboard">PM dashboard <ArrowUpRight size={13} /></a><a href="/projects">All spaces <ArrowUpRight size={13} /></a></div></details>
        <div className={styles.headerActions}><button className={styles.iconButton} title={expanded ? 'Exit expanded view' : 'Expand space'} aria-label={expanded ? 'Exit expanded view' : 'Expand space'} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button></div>
      </div>
      <nav className={styles.tabs} aria-label="Space views">{views.map(({ name, icon: Icon }) => <button key={name} className={view === name ? styles.activeTab : ''} aria-current={view === name ? 'page' : undefined} onClick={() => setView(name)}><Icon size={15} />{name}</button>)}</nav>
    </header>
    <div className={styles.toolbar}>
      <label className={styles.search}><Search size={15} /><input aria-label="Search board" placeholder={`Search ${view.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className={styles.people} aria-label="Filter by assignee">{people.slice(0, 7).map(person => <button key={person} aria-label={`Filter by ${person}`} aria-pressed={assignee === person} onClick={() => setAssignee(assignee === person ? '' : person)}><Avatar name={person} /></button>)}{people.length > 7 && <span className={styles.morePeople}>+{people.length - 7}</span>}</div>
      <details className={styles.menu}><summary className={styles.toolButton}><SlidersHorizontal size={15} />Filter{activeFilters > 0 && <span className={styles.count}>{activeFilters}</span>}</summary><div className={styles.popover}>
        <label>Assignee<select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Everyone</option>{people.map(person => <option key={person}>{person}</option>)}</select></label>
        <label>Priority<select value={priority} onChange={event => setPriority(event.target.value)}><option value="">All priorities</option>{['Critical', 'High', 'Medium', 'Low'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Work type<select value={type} onChange={event => setType(event.target.value)}><option value="">All types</option>{['Task', 'Bug', 'Story', 'Epic'].map(value => <option key={value}>{value}</option>)}</select></label><button onClick={clearFilters}>Clear filters</button>
      </div></details>
      {view === 'Board' && <details className={styles.menu}><summary className={styles.toolButton}><Layers2 size={15} />Group{group !== 'none' && <span className={styles.count}>1</span>}</summary><div className={styles.popover}><label>Group into swimlanes<select value={group} onChange={event => setGroup(event.target.value as typeof group)}><option value="none">None</option><option value="assignee">Assignee</option><option value="priority">Priority</option></select></label></div></details>}
      {(activeFilters > 0 || query) && <button className={styles.clearButton} onClick={clearFilters}>Clear</button>}
      <div className={styles.toolbarEnd}>
        {view === 'Board' && <details className={`${styles.menu} ${styles.alignRight}`}><summary className={styles.iconButton} aria-label="Card display settings"><Settings2 size={16} /></summary><div className={styles.popover}><strong>Card fields</strong><label className={styles.checkLabel}><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} />Labels</label><label className={styles.checkLabel}><input type="checkbox" checked={showDue} onChange={event => setShowDue(event.target.checked)} />Due date</label><p>Cards are ordered by latest update. Status moves are saved only after the server confirms them.</p></div></details>}
        <button className={styles.iconButton} aria-label="Refresh space" disabled={props.refreshing || props.busy} onClick={() => { setDropMessage(''); props.onRefresh(); }}><RefreshCw size={16} className={props.refreshing ? styles.spin : ''} /></button>
        {props.editable && <button className={styles.toolButton} onClick={() => { setDropMessage(''); props.onCreate(); }} disabled={props.busy}><Plus size={16} />Create</button>}
      </div>
    </div>
    {props.hasMore && <p className={styles.notice}>Showing the 500 most recently updated tickets. Counts, filters and date views cover this subset; older work is not shown.</p>}
    {(props.notice || dropMessage) && <p className={styles.notice} role="status">{dropMessage || props.notice}</p>}
    {props.refreshing && !props.tickets.length ? <div className={styles.empty} role="status">Loading your space…</div> : <>
      {view === 'Board' && <div className={styles.board} aria-label="Work board">{groups.map(lane => <div key={lane.name} className={styles.lane}>
        {lane.name && <h2 className={styles.laneHeading}>{lane.name}<span>{lane.tickets.length}</span></h2>}
        <div className={styles.columns}>{boardColumns.map(column => {
          const rows = lane.tickets.filter(ticket => columnFor(ticket.status) === column);
          return <section key={column} className={styles.column} aria-label={`${lane.name ? lane.name + ' ' : ''}${column}`} onDragOver={event => { if (props.editable && !props.busy) event.preventDefault(); }} onDrop={event => { event.preventDefault(); void drop(column); }}>
            <div className={styles.columnHeading}><h2>{column}</h2><span className={styles.count}>{rows.length}</span>{column === 'Done' && <span className={styles.reported} title="Resolved status is reported, not independent verification">Reported</span>}</div>
            <div className={styles.cards}>{rows.map(ticket => <article key={ticket.id} className={styles.card} draggable={props.editable && !props.busy} onDragStart={event => { setDragged(ticket.id); event.dataTransfer.setData('text/plain', String(ticket.id)); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragged(null)}>
              <button className={styles.cardTitle} onClick={() => openTicket(ticket)}>{ticket.title}</button>
              {showLabels && <div className={styles.labels}>{ticketLabels(ticket.labels).map(label => <span key={label} className={styles.tag}>{label}</span>)}</div>}
              {showDue && ticket.dueDate && <div className={styles.due}><span>Due date</span><div>{dateLabel(ticket.dueDate)}{ticket.dueDate < today && column !== 'Done' && <TriangleAlert size={12} className={styles.overdue} aria-label="Overdue" />}</div></div>}
              {!['Created', 'Open', 'Started', 'Resolved'].includes(normalizeStatus(ticket.status)) && <span className={styles.statusBadge}>{ticket.status}</span>}
              <div className={styles.cardFooter}><button className={styles.ticketKey} onClick={() => openTicket(ticket)}><CheckSquare2 size={14} />{ticket.key}</button><span className={styles.footerSpacer} /><Priority value={ticket.priority} /><button className={styles.avatarButton} aria-label={`Open ${ticket.key}, assigned to ${ticket.assigneeName}`} onClick={() => openTicket(ticket)}><Avatar name={ticket.assigneeName} /></button></div>
            </article>)}</div>
            {props.editable && column === 'To Do' && <button className={styles.columnCreate} disabled={props.busy} onClick={() => { setDropMessage(''); props.onCreate(); }}><Plus size={17} />Create</button>}
            {!rows.length && column !== 'To Do' && <p className={styles.emptyColumn}>No work items</p>}
          </section>;
        })}</div>
      </div>)}</div>}
      {view === 'List' && <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Work item</th><th>Reported status</th><th>Assignee</th><th>Priority</th><th>Due date</th><th>Labels</th></tr></thead><tbody>{filtered.map(ticket => <tr key={ticket.id}><td><button onClick={() => openTicket(ticket)}><CheckSquare2 size={14} /><span className={styles.listKey}>{ticket.key}</span>{ticket.title}</button></td><td><span className={styles.statusBadge}>{ticket.status}</span></td><td><span className={styles.personCell}><Avatar name={ticket.assigneeName} />{ticket.assigneeName}</span></td><td><Priority value={ticket.priority} /> {ticket.priority}</td><td>{dateLabel(ticket.dueDate)}</td><td>{ticketLabels(ticket.labels).join(', ')}</td></tr>)}</tbody></table></div>}
      {view === 'Summary' && <SpaceSummary tickets={filtered} today={today} onOpen={openTicket} />}
      {view === 'Calendar' && <SpaceCalendar tickets={filtered} onOpen={openTicket} />}
      {view === 'Timeline' && <SpaceTimeline tickets={filtered} onOpen={openTicket} />}
      {!filtered.length && <div className={styles.empty}><strong>{props.tickets.length ? 'No work matches these filters' : 'Your space is ready'}</strong><p>{props.tickets.length ? 'Try another search or clear the filters.' : 'Create the first work item to start tracking.'}</p>{props.tickets.length > 0 && <button className={styles.toolButton} onClick={clearFilters}>Clear filters</button>}</div>}
    </>}
    <footer className={styles.coverage}>Connected reports only · Status changes are not verified completion · {filtered.length} of {props.tickets.length} loaded work items</footer>
  </section>;
}

function SpaceSummary({ tickets, today, onOpen }: { tickets: SpaceTicket[]; today: string; onOpen: Props['onOpen'] }) {
  const summary = summarizeReports(tickets, today);
  const attention = tickets.filter(ticket => normalizeStatus(ticket.status) === 'QA Issue' || ['Peer Review', 'QA Started'].includes(normalizeStatus(ticket.status)) || (ticket.dueDate && ticket.dueDate < today && columnFor(ticket.status) !== 'Done'));
  return <div className={styles.summary}><h2>What needs your attention?</h2><p>Based on the reports and dates recorded in this space.</p><div className={styles.metrics}>{[['Active work', summary.active], ['Reported in review', summary.review], ['Overdue / QA issues', summary.attention], ['Reported resolved', summary.reportedResolved]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><section className={styles.attention}><h3>Attention queue</h3>{attention.length ? attention.map(ticket => <button key={ticket.id} onClick={() => onOpen(ticket)}><span>{ticket.key}</span><strong>{ticket.title}</strong><span>{ticket.assigneeName}</span><span>{ticket.status}</span><ChevronRight size={15} /></button>) : <p>No review, overdue or QA issue is recorded in this selection. Unreported blockers remain unknown.</p>}</section></div>;
}
function SpaceCalendar({ tickets, onOpen }: { tickets: SpaceTicket[]; onOpen: Props['onOpen'] }) {
  const [month, setMonth] = useState(() => { const value = new Date(); return new Date(value.getFullYear(), value.getMonth(), 1); });
  const first = (month.getDay() + 6) % 7, days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const key = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return <div className={styles.calendar}><div className={styles.dateHeading}><h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div><p>Work items appear on their recorded due date. {tickets.filter(ticket => !ticket.dueDate).length} have no due date.</p><div className={styles.calendarGrid}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <strong key={day}>{day}</strong>)}{Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, index) => { const day = index - first + 1; return <div key={index} className={styles.calendarDay}>{day > 0 && day <= days && <><span>{day}</span>{tickets.filter(ticket => ticket.dueDate === key(day)).map(ticket => <button key={ticket.id} onClick={() => onOpen(ticket)}><small>{ticket.key}</small>{ticket.title}</button>)}</>}</div>; })}</div></div>;
}
function SpaceTimeline({ tickets, onOpen }: { tickets: SpaceTicket[]; onOpen: Props['onOpen'] }) {
  const dated = tickets.filter(ticket => ticket.startDate && ticket.dueDate && ticket.startDate <= ticket.dueDate).sort((a, b) => a.startDate!.localeCompare(b.startDate!));
  const day = (value: string) => Date.parse(value + 'T00:00:00Z') / 86400000;
  const min = dated.length ? Math.min(...dated.map(ticket => day(ticket.startDate!))) : 0;
  const max = dated.length ? Math.max(...dated.map(ticket => day(ticket.dueDate!))) : 1;
  const span = Math.max(1, max - min + 1);
  return <div className={styles.timeline}><h2>Planned work</h2><p>Recorded start and due dates. Bar length represents time, not progress. {tickets.length - dated.length} work items have incomplete or invalid dates.</p>{dated.length ? <div className={styles.timelineRows}>{dated.map(ticket => <div key={ticket.id} className={styles.timelineRow}><button onClick={() => onOpen(ticket)}><small>{ticket.key}</small>{ticket.title}</button><div className={styles.track}><button aria-label={`${ticket.key}: ${dateLabel(ticket.startDate)} to ${dateLabel(ticket.dueDate)}`} onClick={() => onOpen(ticket)} style={{ left: `${(day(ticket.startDate!) - min) / span * 100}%`, width: `${Math.max(1, (day(ticket.dueDate!) - day(ticket.startDate!) + 1) / span * 100)}%` }} title={`${dateLabel(ticket.startDate)} – ${dateLabel(ticket.dueDate)}`}>{ticket.key}</button></div><span>{dateLabel(ticket.startDate)} – {dateLabel(ticket.dueDate)}</span></div>)}</div> : <div className={styles.empty}>Add start and due dates to plan work on the timeline.</div>}</div>;
}
