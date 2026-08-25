import { NextResponse } from "next/server";
import {
  invitationService,
  organizationService,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { isOutboundEmailConfigured, sendTransactionalEmail } from "@/lib/platform/identity/authentication/email/mailer";

export async function GET(req: Request) {
  try {
    const ctx = await requirePermission(req, "users.manage");
    if (!ctx.organizationId) throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    return NextResponse.json({ invitations: await invitationService.list(ctx.organizationId) });
  } catch (err) { return identityErrorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission(req, "users.invite");
    if (!ctx.organizationId) throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const roleKey = typeof body.roleKey === "string" && body.roleKey.trim() ? body.roleKey.trim() : "member";
    if (!email) throw new IdentityError("Email is required", 400, "VALIDATION_ERROR");
    if (!isOutboundEmailConfigured()) throw new IdentityError("Invitation email delivery is not configured. Add RESEND_API_KEY to the production environment.", 503, "EMAIL_NOT_CONFIGURED");

    const result = await invitationService.create({ organizationId: ctx.organizationId, email, roleKey, invitedById: ctx.identityId });
    const organization = await organizationService.get(ctx.organizationId);
    const delivery = await sendTransactionalEmail({
      to: email,
      subject: `You're invited to join ${organization.name} on OTTO`,
      text: `You have been invited to join ${organization.name} on OTTO.\n\nAccept your invitation: ${result.inviteUrl}\n\nThis invitation expires on ${result.invitation.expiresAt}.`,
      html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827"><h2>You’re invited to ${organization.name}</h2><p>You have been invited to join <strong>${organization.name}</strong> on OTTO.</p><p><a href="${result.inviteUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">Accept invitation</a></p><p>This invitation expires on ${result.invitation.expiresAt}.</p></body></html>`,
      tags: ["organization-invitation"],
    });
    if (!delivery.ok) throw new IdentityError("Invitation was created, but the invitation email could not be sent.", 502, "EMAIL_SEND_FAILED");

    return NextResponse.json({ success: true, invitation: result.invitation, emailSent: true }, { status: 201 });
  } catch (err) { return identityErrorResponse(err); }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requirePermission(req, "users.manage");
    const invitationId = new URL(req.url).searchParams.get("invitation_id");
    if (!invitationId) throw new IdentityError("invitation_id is required", 400, "VALIDATION_ERROR");
    await invitationService.cancel({ invitationId, actorIdentityId: ctx.identityId });
    return NextResponse.json({ success: true });
  } catch (err) { return identityErrorResponse(err); }
}
