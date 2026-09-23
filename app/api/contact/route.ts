import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = clean(body.name, 120);
    const email = clean(body.email, 320).toLowerCase();
    const organisation = clean(body.organisation, 160);
    const phone = clean(body.phone, 120);
    const message = clean(body.message, 4000);
    const website = clean(body.website, 200);

    if (website) {
      return NextResponse.json({ ok: true });
    }

    if (!name || !EMAIL_PATTERN.test(email) || !organisation || !message) {
      return NextResponse.json({ error: "Please complete the required fields." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.CONTACT_EMAIL || process.env.INITIAL_ADMIN_EMAIL;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !recipient || !from) {
      console.error("Contact form email configuration is incomplete.");
      return NextResponse.json({ error: "Contact form is not configured." }, { status: 503 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: `New OTTO enquiry — ${organisation}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Organisation: ${organisation}`,
          `Phone / contact detail: ${phone || "Not provided"}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      console.error("Resend contact form request failed", await response.text());
      return NextResponse.json({ error: "Unable to send enquiry." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error", error);
    return NextResponse.json({ error: "Unable to send enquiry." }, { status: 500 });
  }
}
