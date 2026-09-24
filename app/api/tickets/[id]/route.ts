import { desc,eq } from "drizzle-orm"; import { getDb } from "../../../../db"; import { ticketActivity,ticketAttachments,ticketComments } from "../../../../db/schema"; import { getChatGPTUser } from "../../../chatgpt-auth";import { canEdit,ticketAccess } from "../../../../lib/project-access";
import { ticketUpdate } from "../../../../lib/validation";
import { updateTicket, TicketUpdateError } from "../../../../lib/update-ticket";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const user=await getChatGPTUser();if(!user)return Response.json({error:"Authentication required"},{status:401});const {id}=await params,access=await ticketAccess(Number(id),user);if(!access)return Response.json({error:"Ticket not found or access denied"},{status:404});const db=getDb(),activity=await db.select().from(ticketActivity).where(eq(ticketActivity.ticketId,access.ticket.id)).orderBy(desc(ticketActivity.createdAt)).limit(100),comments=await db.select().from(ticketComments).where(eq(ticketComments.ticketId,access.ticket.id)).orderBy(desc(ticketComments.createdAt)).limit(100),attachments=await db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId,access.ticket.id)).orderBy(desc(ticketAttachments.createdAt));return Response.json({ticket:access.ticket,activity,comments,attachments,role:access.role})}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) return Response.json({ error: "Invalid ticket" }, { status: 400 });
  const access = await ticketAccess(Number(id), user);
  if (!access || !canEdit(access.role)) return Response.json({ error: "Editor access is required" }, { status: 403 });
  const parsed = ticketUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid ticket update" }, { status: 400 });
  try { return Response.json({ ticket: updateTicket(Number(id), user, parsed.data) }, { headers: { "cache-control": "no-store" } }); }
  catch (error) { if (error instanceof TicketUpdateError) return Response.json({ error: error.message }, { status: error.status }); throw error; }
}
