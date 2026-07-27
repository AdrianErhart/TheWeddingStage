/**
 * Wiederverwendbare UI-Komponente `home-contact-form`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import { useState } from "react";

type ContactResponse = {
  ok: boolean;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function HomeContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);

  const normalizedEmail = email.trim();
  const normalizedMessage = message.trim();
  const emailInvalid = validationAttempted && !EMAIL_PATTERN.test(normalizedEmail);
  const messageInvalid = validationAttempted && normalizedMessage.length === 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationAttempted(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedMessage.length === 0) {
      setErrorMessage("Bitte fülle beide Pflichtfelder korrekt aus.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          message: normalizedMessage,
        }),
      });

      const payload = (await response.json()) as ContactResponse;

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Nachricht konnte nicht versendet werden.");
        setIsSubmitting(false);
        return;
      }

      setEmail("");
      setMessage("");
      setValidationAttempted(false);
      setSuccessMessage("Wir haben deine Nachricht erhalten.");
      setIsSubmitting(false);
    } catch {
      setErrorMessage("Nachricht konnte nicht versendet werden.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="deine@email.de"
        aria-invalid={emailInvalid}
        className={`h-12 w-full rounded-xl border bg-transparent px-4 text-sm outline-none placeholder:text-black/45 focus:border-black ${
          emailInvalid ? "border-red-500" : "border-black/25"
        }`}
      />

      <div className="flex gap-3">
        <textarea
          rows={8}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Deine Nachricht..."
          aria-invalid={messageInvalid}
          className={`min-h-48 flex-1 rounded-xl border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-black/45 focus:border-black ${
            messageInvalid ? "border-red-500" : "border-black/25"
          }`}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/30 text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Nachricht senden"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-900">{errorMessage}</p>
      ) : null}

      {successMessage ? (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</p>
      ) : null}
    </form>
  );
}
