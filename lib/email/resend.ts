import { Resend } from "resend";

export const OTTO_EMAIL_FROM =
  process.env.OTTO_EMAIL_FROM || "OTTO Cloud <no-reply@otto.okeldijital.africa>";

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for transactional email");
  }

  return new Resend(apiKey);
}
