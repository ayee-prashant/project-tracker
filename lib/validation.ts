import { z } from "zod";
const date = z.string().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "Use a valid YYYY-MM-DD date");
export const ticketUpdate = z.object({
  title: z.string().trim().min(1).max(300).optional(), description: z.string().max(100000).optional(),
  issueType: z.enum(['Task', 'Bug', 'Story', 'Epic']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Created', 'Open', 'Started', 'Peer Review', 'QA Started', 'QA Issue', 'Resolved']).optional(),
  assigneeName: z.string().trim().max(200).optional(),
  progress: z.coerce.number().finite().min(0).max(100).optional(),
  storyPoints: z.preprocess(value => value === '' ? null : value, z.coerce.number().int().min(0).max(1000).nullable()).optional(),
  startDate: date.nullable().transform(value => value || null).optional(), dueDate: date.nullable().transform(value => value || null).optional(),
  labels: z.string().max(2000).optional(), expectedUpdatedAt: z.string().min(1).max(100).optional(),
}).strict().refine(value => Object.keys(value).some(key => key !== 'expectedUpdatedAt'), 'No changes provided');
export const ticketCreate = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  projectId: z.coerce.number().int().nonnegative().optional(),
  project: z.string().max(200).optional(),
  description: z.string().max(100000).optional(),
  issueType: z.enum(["Task", "Bug", "Story", "Epic"]).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  assigneeName: z.string().trim().max(200).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  storyPoints: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  startDate: date.nullable().optional(), dueDate: date.nullable().optional(),
  labels: z.string().max(2000).optional(),
}).refine(data => !data.startDate || !data.dueDate || data.dueDate >= data.startDate, "Estimated end date cannot be before start date");
