/**
 * Outbound email delivery for IAM (password reset, verification).
 *
 * Resend is the production transactional provider. The OTTO sender is already
 * DNS-verified in Resend; environment variables may override it when needed.
 */

import { logger } from "@/lib/logger";

export type EmailDeliveryChannel = "resend" | "log" | "none";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tags?: string[];
};

export type SendEmailResult = {
  ok: boolean;
  channel: EmailDeliveryChannel;
  id?: string;
  error?: string;
};

function resolveFromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "OTTO Cloud <no-reply@otto.okeldijital.africa>"
  );
}

export function isOutboundEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function shouldExposeAuthLinksInResponse(): boolean {
  if (
    process.env.IAM_EXPOSE_AUTH_LINKS === "1" ||
    process.env.IAM_EXPOSE_AUTH_LINKS === "true"
  ) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!.trim();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resolveFromAddress(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? undefined,
      tags: input.tags?.map((name) => ({ name, value: "true" })),
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!res.ok) {
    const error = body.message || body.name || `Resend HTTP ${res.status}`;
    logger.error("iam.mailer", "Resend send failed", {
      status: res.status,
      error,
      to: input.to,
    });
    return { ok: false, channel: "resend", error };
  }

  logger.info("iam.mailer", "email sent via Resend", {
    id: body.id,
    to: input.to,
    subject: input.subject,
  });
  return { ok: true, channel: "resend", id: body.id };
}

function sendViaLog(input: SendEmailInput): SendEmailResult {
  logger.warn("iam.mailer", "email not delivered via provider — link logged for ops", {
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { ok: true, channel: "log" };
}

export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY?.trim()) {
    try {
      const result = await sendViaResend(input);
      if (result.ok) return result;
      sendViaLog(input);
      return { ...result, channel: "resend" };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      logger.error("iam.mailer", "Resend threw", { error });
      sendViaLog(input);
      return { ok: false, channel: "resend", error };
    }
  }

  return sendViaLog(input);
}

export function passwordResetEmailContent(params: {
  email: string;
  resetUrl: string;
  ttlMinutes: number;
}): { subject: string; text: string; html: string } {
  const subject = "Reset your OTTO password";
  const text = [
    "You requested a password reset for your OTTO account.",
    "",
    `Open this link to choose a new password (expires in ${params.ttlMinutes} minutes):`,
    params.resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  const html = `
    <p>You requested a password reset for your OTTO account.</p>
    <p><a href="${params.resetUrl}">Reset your password</a></p>
    <p style="color:#666;font-size:14px">This link expires in ${params.ttlMinutes} minutes.</p>
    <p style="color:#666;font-size:14px">If you did not request this, you can ignore this email.</p>
  `.trim();
  return { subject, text, html };
}

export function emailVerificationContent(params: {
  email: string;
  verifyUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = "Verify your OTTO email";
  const text = [
    "Confirm your email address for OTTO:",
    params.verifyUrl,
    "",
    "If you did not create an account, you can ignore this email.",
  ].join("\n");
  const html = `
    <p>Confirm your email address for OTTO.</p>
    <p><a href="${params.verifyUrl}">Verify email</a></p>
    <p style="color:#666;font-size:14px">If you did not create an account, you can ignore this email.</p>
  `.trim();
  return { subject, text, html };
}
