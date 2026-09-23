import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const workflow = moduleUrl(compile(await readFile(new URL('../lib/workflow.ts', import.meta.url), 'utf8')));
const reporting = compile(await readFile(new URL('../lib/reporting.ts', import.meta.url), 'utf8')).replace('from "./workflow"', `from "${workflow}"`);
const { summarizeReports } = await import(moduleUrl(reporting));
const result = summarizeReports([
  { id: 1, status: 'QA Issue', dueDate: '2026-09-20' },
  { id: 2, status: 'Started', dueDate: '2026-09-20' },
  { id: 3, status: 'QA Issue', dueDate: null },
  { id: 4, status: 'Resolved', dueDate: '2026-09-20' },
  { id: 5, status: 'Peer Review', dueDate: '2026-09-24' },
  { id: 6, status: 'QA Started', dueDate: '2026-09-25' },
], '2026-09-24');
assert.deepEqual(result, { active: 5, started: 1, review: 2, reportedResolved: 1, overdue: 2, qaIssues: 2, attention: 3 });
assert.equal(summarizeReports([{ id: 1, status: 'Blocked', dueDate: '2026-09-20' }, { id: 2, status: 'Done', dueDate: '2026-09-20' }], '2026-09-24').attention, 1);
assert.equal(summarizeReports([], '2026-09-24').attention, 0);
assert.equal(summarizeReports([{ id: 1, status: 'Open', dueDate: '2026-09-24' }], '2026-09-24').overdue, 0);
console.log('PASS: overlapping attention reasons count each ticket once, resolved reports do not count as overdue, review states and legacy statuses are included, due-today and empty sets are handled.');
