import { z } from "zod";

export const DeliverableStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  APPROVED: "approved",
  BLOCKED: "blocked",
} as const;

export const ApprovalStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "changes_requested",
} as const;

export const PublicationStatus = {
  DRAFT: "draft",
  REVIEW: "review",
  APPROVED: "approved",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
} as const;

export const VideoStatus = {
  PLANNING: "planning",
  PRE_PRODUCTION: "pre-production",
  PRODUCTION: "production",
  POST_PRODUCTION: "post-production",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;

export const ReadinessCategory = {
  METADATA: "metadata",
  ARTWORK: "artwork",
  MARKETING: "marketing",
  DISTRIBUTION: "distribution",
  APPROVALS: "approvals",
  VIDEOS: "videos",
} as const;

export const createDeliverableSchema = z.object({
  workspace_id: z.number().int(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  deliverable_type: z.string().optional(),
  status: z.string().optional().default("not_started"),
  priority: z.string().optional().default("medium"),
  due_date: z.string().optional(),
  assigned_to: z.number().int().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
});

export const updateDeliverableSchema = createDeliverableSchema.partial().omit({ workspace_id: true });

export const createApprovalSchema = z.object({
  workspace_id: z.number().int(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  item_type: z.string().optional(),
  item_id: z.number().int().optional(),
  status: z.string().optional().default("pending"),
  due_date: z.string().optional(),
});

export const updateApprovalSchema = createApprovalSchema.partial().omit({ workspace_id: true });

export const createPublicationSchema = z.object({
  workspace_id: z.number().int(),
  platform: z.string().min(1),
  content_type: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.string().optional().default("draft"),
  scheduled_at: z.string().optional(),
});

export const updatePublicationSchema = createPublicationSchema.partial().omit({ workspace_id: true });

export const createVideoSchema = z.object({
  workspace_id: z.number().int(),
  title: z.string().min(1).max(255),
  video_type: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional().default("planning"),
  due_date: z.string().optional(),
  editor_id: z.number().int().optional(),
  script: z.string().optional(),
});

export const updateVideoSchema = createVideoSchema.partial().omit({ workspace_id: true });

export const createMilestoneSchema = z.object({
  workspace_id: z.number().int(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  section: z.string().optional(),
  status: z.string().optional().default("pending"),
  due_date: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
});

export const updateMilestoneSchema = createMilestoneSchema.partial().omit({ workspace_id: true });

export const createMarketingPhaseSchema = z.object({
  workspace_id: z.number().int(),
  name: z.string().min(1).max(200),
  slug: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
});

export const updateMarketingPhaseSchema = createMarketingPhaseSchema.partial().omit({ workspace_id: true });

export const createMarketingTaskSchema = z.object({
  phase_id: z.number().int(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.string().optional().default("medium"),
  assigned_to: z.number().int().optional(),
  due_date: z.string().optional(),
});

export const updateMarketingTaskSchema = createMarketingTaskSchema.partial().omit({ phase_id: true });

export const createPlaybookSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().optional(),
  release_type: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updatePlaybookSchema = createPlaybookSchema.partial();

export const applyPlaybookSchema = z.object({
  workspace_id: z.number().int(),
  playbook_id: z.number().int(),
});

export const createDiscussionChannelSchema = z.object({
  workspace_id: z.number().int(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const createDiscussionMessageSchema = z.object({
  channel_id: z.number().int(),
  content: z.string().min(1),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type UpdateApprovalInput = z.infer<typeof updateApprovalSchema>;
export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type CreateMarketingPhaseInput = z.infer<typeof createMarketingPhaseSchema>;
export type UpdateMarketingPhaseInput = z.infer<typeof updateMarketingPhaseSchema>;
export type CreateMarketingTaskInput = z.infer<typeof createMarketingTaskSchema>;
export type UpdateMarketingTaskInput = z.infer<typeof updateMarketingTaskSchema>;
export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
export type UpdatePlaybookInput = z.infer<typeof updatePlaybookSchema>;
export type ApplyPlaybookInput = z.infer<typeof applyPlaybookSchema>;
export type CreateDiscussionChannelInput = z.infer<typeof createDiscussionChannelSchema>;
export type CreateDiscussionMessageInput = z.infer<typeof createDiscussionMessageSchema>;
