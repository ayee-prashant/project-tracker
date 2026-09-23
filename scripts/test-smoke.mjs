import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const directory = await mkdtemp(path.join(os.tmpdir(), 'portal-smoke-'));
await cp('drizzle', '.next/standalone/drizzle', { recursive: true });
await cp('public', '.next/standalone/public', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
const base = 'http://127.0.0.1:3082';
const server = spawn(process.execPath, ['.next/standalone/server.js'], { env: { ...process.env, APP_BASE_URL: base, HOSTNAME: '127.0.0.1', PORT: '3082', DATA_DIR: directory, AUTH0_DOMAIN: '', AUTH0_CLIENT_ID: '', AUTH0_CLIENT_SECRET: '', AUTH0_SECRET: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', d => { logs += d; }); server.stderr.on('data', d => { logs += d; });
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { clearInterval(check); reject(new Error(`Server startup timed out: ${logs}`)); }, 20000);
    const check = setInterval(async () => { try { await fetch(base + '/login'); clearTimeout(timeout); clearInterval(check); resolve(); } catch {} }, 300);
  });
  for (const [url, expected] of [['/login', 200], ['/api/health', 200], ['/profile', 307], ['/tickets/1', 307], ['/api/projects', 401], ['/mcp', 401], ['/.well-known/oauth-protected-resource/mcp', 503]]) {
    const response = await fetch(base + url, { redirect: 'manual', headers: { 'oai-authenticated-user-id': 'forged', 'oai-authenticated-user-email': 'attacker@example.test' } });
    assert.equal(response.status, expected, `${url}: ${await response.clone().text()}`);
    if (url === '/api/health') assert.equal((await response.json()).authentication, 'setup_required');
    if (url === '/mcp') assert.match(response.headers.get('www-authenticate'), /resource_metadata/);
  }
  const denied = await fetch(base + '/api/projects', { method: 'POST', headers: { origin: 'https://evil.example.test', 'content-type': 'application/json' }, body: '{"name":"Forged","key":"BAD"}' });
  assert.equal(denied.status, 403);
  console.log('PASS: standalone server, setup screen, health/storage, protected navigation, forged Sites headers denied, MCP OAuth challenge, and CSRF rejection.');
} finally {
  server.kill();
  await new Promise(resolve => server.once('exit', resolve));
  await rm(directory, { recursive: true, force: true });
}
