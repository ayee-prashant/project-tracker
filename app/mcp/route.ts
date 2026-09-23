import { getChatGPTUser } from "../chatgpt-auth";
import { handleMcp, type ExecuteTool } from "../../lib/mcp";
import * as projects from "../api/projects/route";
import * as project from "../api/projects/[id]/route";
import * as tickets from "../api/tickets/route";
import * as ticket from "../api/tickets/[id]/route";
import * as comments from "../api/tickets/[id]/comments/route";

export const dynamic = "force-dynamic";

// Direct calls retain the verified bearer identity in request scope.
// Each existing API handler repeats its own authentication and permission check.
const execute: ExecuteTool = async (name, args) => {
  const context = (id: unknown) => ({ params: Promise.resolve({ id: String(id) }) });
  const write = (method: string, body: unknown) => new Request("https://portal.internal/api", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const read = new Request("https://portal.internal/api");
  switch (name) {
    case "list_projects": return projects.GET();
    case "get_project": return project.GET(read, context(args.projectId));
    case "create_project": return projects.POST(write("POST", args));
    case "list_tickets": {
      const query = new URLSearchParams(Object.entries(args).map(([k, v]) => [k, String(v)]));
      return tickets.GET(new Request(`https://portal.internal/api?${query}`));
    }
    case "get_ticket": return ticket.GET(read, context(args.ticketId));
    case "create_ticket": return tickets.POST(write("POST", args));
    case "update_ticket": {
      const { ticketId, ...body } = args;
      return ticket.PATCH(write("PATCH", body), context(ticketId));
    }
    case "add_comment": return comments.POST(write("POST", { body: args.body }), context(args.ticketId));
    default: return Response.json({ error: "Unknown tool" }, { status: 400 });
  }
};

async function handle(request: Request) {
  const authenticated = request.headers.get("authorization")?.startsWith("Bearer ") && Boolean(await getChatGPTUser());
  const response = await handleMcp(request, Boolean(authenticated), execute);
  response.headers.set("Cache-Control", "no-store");
  if (response.status === 401 && process.env.APP_BASE_URL) response.headers.set("WWW-Authenticate", `Bearer resource_metadata="${process.env.APP_BASE_URL.replace(/\/$/, "")}/.well-known/oauth-protected-resource/mcp", scope="portal:access"`);
  return response;
}
export const POST = handle;
export const GET = handle;
export const DELETE = handle;
