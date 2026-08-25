import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY is required for transactional email");
}

export const resend = new Resend(apiKey);

export const OTTO_EMAIL_FROM =
  process.env.OTTO_EMAIL_FROM || "OTTO Cloud <no-reply@otto.okeldijital.africa>";
