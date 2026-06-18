import { z } from "zod";

export const WorkspaceRole = {
  OWNER: "owner",
  MANAGER: "manager",
  MEMBER: "member",
  GUEST: "guest",
} as const;

export const WorkspaceStatus = {
  PLANNING: "planning",
  WRITING: "writing",
  RECORDING: "recording",
  PRODUCTION: "production",
  MIXING: "mixing",
  MASTERING: "mastering",
  ARTWORK: "artwork",
  MARKETING: "marketing",
  DISTRIBUTION: "distribution",
  RELEASED: "released",
  ARCHIVED: "archived",
} as const;

export const TimelineEventType = {
  STATUS_CHANGE: "status_change",
  FILE_UPLOAD: "file_upload",
  MEMBER_ADDED: "member_added",
  TASK_COMPLETED: "task_completed",
  APPROVAL: "approval",
  COMMENT: "comment",
  MILESTONE: "milestone",
  SYSTEM: "system",
} as const;

export const FileCategory = {
  AUDIO: "audio",
  STEMS: "stems",
  MASTERS: "masters",
  COVER_ART: "cover_art",
  CONTRACTS: "contracts",
  LYRICS: "lyrics",
  PHOTOS: "photos",
  VIDEOS: "videos",
  PRESS_KIT: "press_kit",
  INVOICES: "invoices",
  OTHER: "other",
} as const;

export const NotificationType = {
  APPROVAL: "approval",
  UPLOAD: "upload",
  SIGNED: "signed",
  SPLIT_CHANGE: "split_change",
  BUDGET_EXCEEDED: "budget_exceeded",
  DELAY: "delay",
  MILESTONE: "milestone",
  GENERAL: "general",
} as const;

const workspaceStatusSchema = z.enum([
  "planning", "writing", "recording", "production",
  "mixing", "mastering", "artwork", "marketing",
  "distribution", "released", "archived",
]);

const workspaceRoleSchema = z.enum(["owner", "manager", "member", "guest"]);

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  template_id: z.number().int().optional(),
  status: workspaceStatusSchema.optional().default("planning"),
  cover_image_url: z.string().url().optional().or(z.literal("")),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const addMemberSchema = z.object({
  user_id: z.number().int().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: workspaceRoleSchema.default("member"),
});

export const updateMemberSchema = z.object({
  role: workspaceRoleSchema,
});

export const createTimelineEventSchema = z.object({
  event_type: z.string().min(1),
  summary: z.string().min(1).max(255),
  details: z.string().optional(),
});

export const createFileSchema = z.object({
  category: z.string().min(1),
  filename: z.string().min(1).max(255),
  original_name: z.string().min(1).max(255),
  file_path: z.string().min(1).max(500),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
});

export const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(255),
  message: z.string().optional(),
  link: z.string().optional(),
  user_id: z.number().int().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type CreateTimelineEventInput = z.infer<typeof createTimelineEventSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
