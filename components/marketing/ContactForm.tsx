"use client";

import { FormEvent, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  organisation: "",
  phone: "",
  message: "",
  website: "",
};

export default function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const update = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Contact request failed");

      setForm(initialForm);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form className="contact-form" onSubmit={submit}>
      <input
        className="contact-honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(event) => update("website", event.target.value)}
      />

      <div className="form-grid">
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required autoComplete="name" />
        </label>
        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required autoComplete="email" />
        </label>
        <label>
          <span>Organisation</span>
          <input value={form.organisation} onChange={(event) => update("organisation", event.target.value)} required autoComplete="organization" />
        </label>
        <label>
          <span>Phone / contact detail</span>
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" />
        </label>
      </div>

      <label>
        <span>How can we help?</span>
        <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={5} required />
      </label>

      {status === "success" && <p className="form-status form-status-success" role="status">Thanks. Your message has been sent. We&apos;ll get back to you.</p>}
      {status === "error" && <p className="form-status form-status-error" role="alert">We couldn&apos;t send your message. Please try again.</p>}

      <button type="submit" className="button button-primary" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
