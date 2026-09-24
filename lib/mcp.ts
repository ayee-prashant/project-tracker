// Stateless Streamable HTTP: every call is authorized by the portal's existing
// route handlers. No user identity, SQL, arbitrary URL, or role is accepted as input.
type Schema = { type: string; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: boolean; enum?: string[]; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; format?: string; pattern?: string };
const text = (maxLength = 10000): Schema => ({ type: "string", maxLength });
const id: Schema = { type: "integer", minimum: 1 };
const title: Schema = { type: "string", minLength: 1, maxLength: 300 };
const date: Schema = { type: "string", format: "date" };
const status: Schema = { type: "string", enum: ["Created", "Open", "Started", "Peer Review", "QA Started", "QA Issue", "Resolved"] };
const ticketFields = {
  title, description: text(30000), issueType: { type: "string", enum: ["Task", "Bug", "Story", "Epic"] },
  priority: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
  assigneeName: text(200), startDate: date, dueDate: date,
  progress: { type: "integer", minimum: 0, maximum: 100 },
  storyPoints: { type: "integer", minimum: 0, maximum: 1000 }, labels: text(1000),
} satisfies Record<string, Schema>;
const object = (properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: "object", properties, required, additionalProperties: false });
const definition = (name: string, description: string, inputSchema: Schema, readOnlyHint: boolean, destructiveHint = false) => ({
  name, description, inputSchema,
  annotations: { readOnlyHint, destructiveHint, idempotentHint: readOnlyHint, openWorldHint: false },
});
export const tools = [
  definition("list_projects", "List projects visible to the authenticated user. Find an existing project before creating one.", object({}), true),
  definition("get_project", "Read a project, its members, and its tickets. Access is limited to the owner and project members.", object({ projectId: id }, ["projectId"]), true),
  definition("create_project", "Create a persistent project owned by the authenticated user. Project key must be unique. Check list_projects first; do not retry blindly after a connection error.", object({ name: title, key: { type: "string", pattern: "^[A-Z0-9]{1,8}$" }, description: text() }, ["name", "key"]), false),
  definition("list_tickets", "List up to 250 accessible tickets, newest first. hasMore=true means older accessible tickets were omitted; counts of this response are not project totals. Status and progress are reports, not independently verified completion. Optionally filter by exact project name, status, or search text. Use get_project for tickets in one project.", object({ project: text(300), status, q: text(300) }), true),
  definition("get_ticket", "Read a ticket with comments, attachments, activity and current project role. Read before editing. A ticket is resolved by a person, not by you.", object({ ticketId: id }, ["ticketId"]), true),
  definition("create_ticket", "Create a ticket in an existing project. Requires owner/editor permission. Initial status is Created. Assignment is a display name, not an account or permission grant. Do not retry blindly after a connection error.", object({ projectId: id, ...ticketFields }, ["projectId", "title"]), false),
  definition("update_ticket", "Update specified ticket fields, including assignment and dates. Requires owner/editor permission. Status follows Created → Open → Started → Peer Review → QA Started → Resolved, with QA Issue → Started and Resolved → Open loops. You CANNOT set Resolved or progress: resolving is a human acceptance and the server refuses both from a connected agent. When your work is finished, move the ticket to QA Started and record your evidence with add_comment.", object({ ticketId: id, ...ticketFields, status }, ["ticketId"]), false, true),
  definition("add_comment", "Add a Markdown text comment, such as test steps, expected/actual results and evidence. Requires owner/editor permission. Persisted under the connected user's identity. Do not retry blindly after a connection error.", object({ ticketId: id, body: { type: "string", minLength: 1, maxLength: 30000 } }, ["ticketId", "body"]), false),
];

function validate(value: unknown, schema: Schema, path = "arguments"): string | null {
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return `${path} must be an object`;
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!(key in record)) return `${path}.${key} is required`;
    for (const [key, v] of Object.entries(record)) {
      const field = schema.properties?.[key];
      if (!field) return `${path}.${key} is not supported`;
      const error = validate(v, field, `${path}.${key}`);
      if (error) return error;
    }
  } else if (schema.type === "string") {
    if (typeof value !== "string") return `${path} must be a string`;
    if (schema.minLength && value.trim().length < schema.minLength) return `${path} cannot be empty`;
    if (schema.maxLength && value.length > schema.maxLength) return `${path} is too long`;
    if (schema.enum && !schema.enum.includes(value)) return `${path} must be one of: ${schema.enum.join(", ")}`;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return `${path} has an invalid format`;
    if (schema.format === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return `${path} must be a valid YYYY-MM-DD date`;
  } else if (schema.type === "integer") {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) return `${path} must be an integer`;
    if (schema.minimum !== undefined && value < schema.minimum) return `${path} is below the minimum`;
    if (schema.maximum !== undefined && value > schema.maximum) return `${path} exceeds the maximum`;
  }
  return null;
}

export type ExecuteTool = (name: string, args: Record<string, unknown>) => Promise<Response>;
const versions = ["2025-03-26", "2025-06-18", "2025-11-25"];
const headers = { "Cache-Control": "no-store" };
const rpcError = (id: unknown, code: number, message: string, httpStatus = 200) => Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: httpStatus, headers });
export async function handleMcp(request: Request, authenticated: boolean, execute: ExecuteTool): Promise<Response> {
  if (!authenticated) return Response.json({ error: "Authentication required" }, { status: 401, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origin not allowed" }, { status: 403, headers });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
  const version = request.headers.get("mcp-protocol-version");
  if (version && !versions.includes(version)) return rpcError(null, -32600, "Unsupported protocol version", 400);
  if (!request.headers.get("content-type")?.includes("application/json")) return rpcError(null, -32600, "Expected application/json", 415);
  let message: any;
  try {
    const raw = await request.text();
    if (raw.length > 100000) return rpcError(null, -32600, "Request is too large", 413);
    message = JSON.parse(raw);
  } catch { return rpcError(null, -32700, "Invalid JSON", 400); }
  if (!message || Array.isArray(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string" || ("id" in message && typeof message.id !== "string" && typeof message.id !== "number")) return rpcError(null, -32600, "Invalid JSON-RPC request", 400);
  // Notifications cannot execute writes. A client must supply an ID for tools/call.
  if (!("id" in message)) return new Response(null, { status: 202, headers });
  const { id: rpcId, method, params = {} } = message;
  const result = (value: unknown) => Response.json({ jsonrpc: "2.0", id: rpcId, result: value }, { headers });
  if (!params || typeof params !== "object" || Array.isArray(params)) return rpcError(rpcId, -32602, "Invalid params");
  if (method === "initialize") return result({
    protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : "2025-06-18",
    capabilities: { tools: { listChanged: false } }, serverInfo: { name: "development-status-portal", version: "1.0.0" },
    instructions: "Use list_projects before creating projects. Read a ticket before editing. Reuse existing tickets after uncertain failures. Write test steps and observed results as comments; only resolve tickets after verification. Assignee 'Assistant QA' is a label; actions are attributed to the connected user. MCP tests do not prove browser UI behavior.",
  });
  if (method === "ping") return result({});
  if (method === "tools/list") return result({ tools });
  if (method !== "tools/call") return rpcError(rpcId, -32601, "Method not found");
  const tool = tools.find(t => t.name === params.name);
  if (!tool) return rpcError(rpcId, -32602, "Unknown tool");
  const args = params.arguments ?? {};
  const error = validate(args, tool.inputSchema);
  if (error) return rpcError(rpcId, -32602, error);
  if (tool.name === "update_ticket" && Object.keys(args).length === 1) return rpcError(rpcId, -32602, "Provide at least one field to update");
  if (args.startDate && args.dueDate && args.startDate > args.dueDate) return rpcError(rpcId, -32602, "Estimated end date must not precede start date");
  try {
    const response = await execute(tool.name, args);
    const data = await response.json();
    return result({ content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError: !response.ok });
  } catch {
    console.error("MCP operation failed", tool.name);
    return result({ isError: true, content: [{ type: "text", text: "Operation could not be completed. Read current records before retrying a write; it may have partially succeeded." }] });
  }
}
