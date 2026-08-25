export const OTTO_EMAIL_FROM =
  process.env.OTTO_EMAIL_FROM || "OTTO Cloud <no-reply@otto.okeldijital.africa>";

export async function sendOttoEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for transactional email");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: OTTO_EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email delivery failed (${response.status}): ${detail}`);
  }

  return response.json() as Promise<{ id: string }>;
}
