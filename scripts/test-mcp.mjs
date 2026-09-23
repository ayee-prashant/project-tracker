import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const importTS = async path => {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
const { handleMcp, tools } = await importTS('../lib/mcp.ts');
const { validTransition } = await importTS('../lib/workflow.ts');
let dispatched = [];
const execute = async (name, args) => { dispatched.push({ name, args }); return Response.json({ success: true }); };
const request = (body, headers = {}, method = 'POST') => new Request('https://portal.test/mcp', { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
const rpc = (method, params = {}) => ({ jsonrpc: '2.0', id: 1, method, params });
const call = (name, args) => rpc('tools/call', { name, arguments: args });
let checks = 0;
async function expect(body, predicate, auth = true, headers = {}, runner = execute) {
  const response = await handleMcp(request(body, headers), auth, runner);
  const json = response.status === 202 ? null : await response.json();
  assert.ok(predicate(json, response), JSON.stringify(json)); checks++;
}
await expect(rpc('initialize', { protocolVersion: '2025-06-18' }), j => j.result.protocolVersion === '2025-06-18');
await expect(rpc('initialize', { protocolVersion: 'future' }), j => j.result.protocolVersion === '2025-06-18');
await expect(rpc('tools/list'), j => j.result.tools.length === 8);
await expect(rpc('ping'), j => !!j.result);
await expect(rpc('no-such-method'), j => j.error.code === -32601);
await expect('{', j => j.error.code === -32700);
await expect([], j => j.error.code === -32600);
await expect({ jsonrpc: '1.0', id: 1, method: 'ping' }, j => j.error.code === -32600);
await expect(rpc('tools/list'), (_, r) => r.status === 401, false);
await expect(call('create_project', { name: 'Project Tracker', key: 'TRACK' }), (_, r) => r.status === 403, true, { Origin: 'https://other.test' });
await expect(rpc('tools/list'), (_, r) => r.status === 400, true, { 'MCP-Protocol-Version': 'bad' });
await expect(rpc('tools/list'), (_, r) => r.status === 415, true, { 'Content-Type': 'text/plain' });
assert.equal(dispatched.length, 0);
await expect({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'create_project', arguments: { name: 'Do not create', key: 'NO' } } }, (_, r) => r.status === 202);
assert.equal(dispatched.length, 0); checks++;
for (const args of [{}, { ticketId: -1 }, { ticketId: '1' }, { ticketId: 1, ownerId: 'spoof' }, { ticketId: 1, title: ' ' }, { ticketId: 1, progress: 101 }, { ticketId: 1, dueDate: '2026-02-30' }, { ticketId: 1, startDate: '2026-10-10', dueDate: '2026-10-01' }, { ticketId: 1, status: 'Finished' }]) {
  await expect(call('update_ticket', args), j => j.error.code === -32602);
}
await expect(call('not_a_tool', {}), j => j.error.code === -32602);
assert.equal(dispatched.length, 0); checks++;
await expect(call('create_project', { name: 'Project Tracker', key: 'TRACK' }), j => j.result.structuredContent.success && !j.result.isError);
assert.deepEqual(dispatched.at(-1), { name: 'create_project', args: { name: 'Project Tracker', key: 'TRACK' } }); checks++;
await expect(call('create_ticket', { projectId: 1, title: 'QA test', assigneeName: 'Assistant QA', startDate: '2026-09-23', dueDate: '2026-09-24' }), j => j.result.structuredContent.success);
await expect(call('add_comment', { ticketId: 1, body: '**PASS**: test evidence' }), j => j.result.structuredContent.success);
await expect(call('update_ticket', { ticketId: 1, status: 'Resolved' }), j => j.result.isError && j.result.structuredContent.error === 'Editor access is required', true, {}, async () => Response.json({ error: 'Editor access is required' }, { status: 403 }));
await expect(call('get_ticket', { ticketId: 999 }), j => j.result.isError, true, {}, async () => Response.json({ error: 'Not found' }, { status: 404 }));
await expect(call('add_comment', { ticketId: 1, body: 'test' }), j => j.result.isError && j.result.content[0].text.includes('before retrying'), true, {}, async () => { throw new Error('secret database details'); });
for (const method of ['GET', 'DELETE']) { const r = await handleMcp(request(null, {}, method), true, execute); assert.equal(r.status, 405); checks++; }
for (const [from, to] of [['Created','Open'], ['Open','Started'], ['Started','Peer Review'], ['Peer Review','QA Started'], ['QA Started','QA Issue'], ['QA Issue','Started'], ['QA Started','Resolved'], ['Resolved','Open']]) { assert.equal(validTransition(from,to), true); checks++; }
for (const [from, to] of [['Created','Resolved'], ['Open','QA Started'], ['QA Issue','Resolved'], ['Resolved','Started']]) { assert.equal(validTransition(from,to), false); checks++; }
for (const tool of tools) { assert.equal(tool.inputSchema.additionalProperties, false); assert.equal(tool.annotations.openWorldHint, false); }
checks++;
console.log(`PASS: ${checks} MCP protocol, validation, error propagation and workflow checks. Database authorization and browser UI require separate integration tests.`);
