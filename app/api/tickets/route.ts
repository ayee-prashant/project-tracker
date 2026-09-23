import { ticketCreate } from "../../../lib/validation";
import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm"; import { getDb } from "../../../db"; import { profiles,projectMembers,projects,ticketActivity,tickets } from "../../../db/schema"; import { getChatGPTUser } from "../../chatgpt-auth";import { canEdit,projectAccess } from "../../../lib/project-access";
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"Authentication required"},{status:401});const db=getDb(),owned=await db.select({id:projects.id}).from(projects).where(eq(projects.ownerId,user.userId)),member=await db.select({id:projectMembers.projectId}).from(projectMembers).where(or(eq(projectMembers.userId,user.userId),eq(projectMembers.userEmail,user.email))),ids=[...new Set([...owned,...member].map(x=>x.id))],url=new URL(request.url),status=url.searchParams.get("status"),project=url.searchParams.get("project"),q=url.searchParams.get("q")?.trim(),access=ids.length?or(and(isNull(tickets.projectId),eq(tickets.reporterId,user.userId)),inArray(tickets.projectId,ids)):and(isNull(tickets.projectId),eq(tickets.reporterId,user.userId));const fs=[access,status?eq(tickets.status,status):undefined,project?eq(tickets.project,project):undefined,q?or(like(tickets.title,`%${q}%`),like(tickets.key,`%${q}%`),like(tickets.description,`%${q}%`)):undefined].filter(Boolean);const rows=await db.select().from(tickets).where(and(...fs as any)).orderBy(desc(tickets.updatedAt),desc(tickets.id)).limit(250);return Response.json({tickets:rows})}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const parsed = ticketCreate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const body = parsed.data;
  const projectId = body.projectId || null;
  let projectName = body.project || "General", projectKey = projectName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "DEV";
  if (projectId) {
    const access = await projectAccess(projectId, user);
    if (!access || !canEdit(access.role)) return Response.json({ error: "Editor access is required" }, { status: 403 });
    projectName = access.project.name; projectKey = access.project.key;
  }
  const db = getDb();
  const ticket = db.transaction(tx => {
    tx.insert(profiles).values({ userId: user.userId, email: user.email, displayName: user.fullName ?? user.displayName }).onConflictDoNothing().run();
    const profile = tx.select().from(profiles).where(eq(profiles.userId, user.userId)).get();
    const created = tx.insert(tickets).values({
      projectId, key: `pending-${crypto.randomUUID()}`, title: body.title, description: body.description || "",
      project: projectName, issueType: body.issueType || "Task", status: "Created", priority: body.priority || "Medium",
      reporterId: user.userId, assigneeName: body.assigneeName || "Unassigned", progress: body.progress || 0,
      storyPoints: body.storyPoints || null, startDate: body.startDate || null, dueDate: body.dueDate || null, labels: body.labels || "",
    }).returning().get();
    const result = tx.update(tickets).set({ key: `${projectKey}-${created.id}` }).where(eq(tickets.id, created.id)).returning().get();
    tx.insert(ticketActivity).values({ ticketId: result.id, userId: user.userId, userName: profile?.displayName || user.displayName, action: "created", detail: `Created ${result.key}` }).run();
    return result;
  });
  return Response.json({ ticket }, { status: 201 });
}
