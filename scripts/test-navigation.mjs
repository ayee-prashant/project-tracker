import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
async function load(path, transform = s => s) {
  const source = transform(await readFile(new URL(path, import.meta.url), 'utf8'));
  let { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  for (const pkg of ['react/jsx-runtime', 'lucide-react']) outputText = outputText.replaceAll(`from "${pkg}"`, `from "${import.meta.resolve(pkg)}"`);
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { AppShell } = await load('../components/app-shell.tsx', s => s.replace(/import \{ chatGPTSignOutPath \} from "[^\"]+";/, 'const chatGPTSignOutPath = () => "/signout-with-chatgpt";'));
const html = renderToStaticMarkup(createElement(AppShell, { user: { displayName: 'QA User', email: 'qa@example.test' }, active: 'profile' }, 'Page content'));
for (const path of ['/profile', '/tickets', '/projects', '/dashboard']) {
  assert.ok(html.includes(`href="${path}"`), `${path} has native links`);
  const page = await readFile(new URL(`../app${path}/page.tsx`, import.meta.url), 'utf8');
  assert.ok(page.includes('force-dynamic') && page.includes('requireChatGPTUser'), `${path} stays protected`);
}
assert.ok(html.includes('aria-label="Open profile"'));
for (const name of ['app-shell','profile-form','ticket-workspace','projects-workspace','project-detail','ticket-detail']) {
  const source = await readFile(new URL(`../components/${name}.tsx`, import.meta.url), 'utf8');
  assert.ok(!source.includes('next/link'), `${name} uses native navigation`);
  if (name !== 'app-shell') assert.ok(source.includes('portalFetch') && source.includes('LoadError'), `${name} exposes load failures`);
}
const { LoadError } = await load('../components/load-error.tsx');
const errorHtml = renderToStaticMarkup(createElement(LoadError, { message: 'Session expired', retry(){} }));
assert.ok(errorHtml.includes('role="alert"') && errorHtml.includes('Retry') && errorHtml.includes('target="_top"'));
const { portalFetch } = await load('../lib/portal-fetch.ts');
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_, options) => { assert.equal(options.credentials, 'same-origin'); return Response.json({ profile: { displayName: 'QA' } }); };
  assert.equal((await (await portalFetch('/api/profile')).json()).profile.displayName, 'QA');
  for (const response of [new Response('login', {status:401}), new Response('<html>login</html>', {headers:{'Content-Type':'text/html'}}), new Response('{bad', {headers:{'Content-Type':'application/json'}})]) {
    globalThis.fetch = async () => response;
    const r = await portalFetch('/api/profile'); assert.equal(r.ok, false); assert.ok((await r.json()).error);
  }
  globalThis.fetch = async () => { throw new Error('network down'); };
  assert.match((await (await portalFetch('/api/tickets')).json()).error, /retry/i);
  assert.match((await (await portalFetch('/api/tickets', {method:'POST'})).json()).error, /before trying again/i);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: rendered desktop/mobile navigation, protected route declarations, recovery actions, JSON success, expired session, HTML response, malformed JSON, network failure, and uncertain save handling. Live sign-in/browser navigation not covered.');
