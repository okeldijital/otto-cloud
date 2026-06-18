import { prisma } from "@/lib/prisma";

export interface CreateNotificationInput {
  workspace_id: number;
  organization_id: string;
  user_ids?: number[];
  type: string;
  title: string;
  message?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const { workspace_id, organization_id, user_ids, type, title, message, link } = input;

  if (user_ids && user_ids.length > 0) {
    await prisma.workspace_notifications.createMany({
      data: user_ids.map((user_id) => ({
        workspace_id,
        organization_id,
        user_id,
        type,
        title,
        message: message || title,
        link,
      })),
    });
    return;
  }

  await prisma.workspace_notifications.create({
    data: {
      workspace_id,
      organization_id,
      type,
      title,
      message: message || title,
      link,
    },
  });
}

export async function getMemberIds(workspaceId: number): Promise<number[]> {
  const members = await prisma.workspace_members.findMany({
    where: { workspace_id: workspaceId },
    select: { user_id: true },
  });
  return members.map((m) => m.user_id).filter(Boolean) as number[];
}

export async function notifyDeliverableBlocked(
  deliverable: { id: number; name: string; workspace_id: number },
  organizationId: string
) {
  const userIds = await getMemberIds(deliverable.workspace_id);
  await createNotification({
    workspace_id: deliverable.workspace_id,
    organization_id: organizationId,
    user_ids: userIds,
    type: "deliverable_blocked",
    title: `Deliverable blocked: "${deliverable.name}"`,
    message: `A deliverable has been marked as blocked and needs attention.`,
    link: `/workspaces/${deliverable.workspace_id}?section=deliverables`,
  });
}

export async function notifyApprovalRequested(
  approval: { id: number; name: string; workspace_id: number },
  organizationId: string
) {
  const userIds = await getMemberIds(approval.workspace_id);
  await createNotification({
    workspace_id: approval.workspace_id,
    organization_id: organizationId,
    user_ids: userIds,
    type: "approval_requested",
    title: `Approval requested: "${approval.name}"`,
    message: `An item requires your approval.`,
    link: `/workspaces/${approval.workspace_id}?section=approvals`,
  });
}

export async function notifyApprovalResolved(
  approval: { id: number; name: string; workspace_id: number; requested_by?: number | null },
  organizationId: string,
  newStatus: string
) {
  const userIds: number[] = [];
  if (approval.requested_by) userIds.push(approval.requested_by);
  if (userIds.length === 0) return;

  await createNotification({
    workspace_id: approval.workspace_id,
    organization_id: organizationId,
    user_ids: userIds,
    type: "approval_resolved",
    title: `Approval ${newStatus}: "${approval.name}"`,
    message: `Your approval request has been resolved.`,
    link: `/workspaces/${approval.workspace_id}?section=approvals`,
  });
}

export async function notifyMilestoneDueSoon(
  milestone: { id: number; name: string; workspace_id: number; due_date: Date | null },
  organizationId: string,
  daysLeft: number
) {
  const userIds = await getMemberIds(milestone.workspace_id);
  await createNotification({
    workspace_id: milestone.workspace_id,
    organization_id: organizationId,
    user_ids: userIds,
    type: "milestone_due_soon",
    title: `Milestone due ${daysLeft === 0 ? "today" : `in ${daysLeft} days`}: "${milestone.name}"`,
    message: `A milestone is approaching its deadline.`,
    link: `/workspaces/${milestone.workspace_id}?section=milestones`,
  });
}

export async function notifyDeliverableOverdue(
  deliverable: { id: number; name: string; workspace_id: number; due_date: Date | null },
  organizationId: string
) {
  const userIds = await getMemberIds(deliverable.workspace_id);
  await createNotification({
    workspace_id: deliverable.workspace_id,
    organization_id: organizationId,
    user_ids: userIds,
    type: "deliverable_overdue",
    title: `Overdue deliverable: "${deliverable.name}"`,
    message: `A deliverable is past its due date.`,
    link: `/workspaces/${deliverable.workspace_id}?section=deliverables`,
  });
}

export async function notifyWorkspaceStatusChange(
  workspace: { id: number; name: string },
  organizationId: string,
  oldStatus: string,
  newStatus: string
) {
  const userIds = await getMemberIds(workspace.id);
  await createNotification({
    workspace_id: workspace.id,
    organization_id: organizationId,
    user_ids: userIds,
    type: "workspace_status_change",
    title: `Workspace status changed: ${oldStatus} → ${newStatus}`,
    message: `"${workspace.name}" moved from ${oldStatus} to ${newStatus}.`,
    link: `/workspaces/${workspace.id}`,
  });
}
