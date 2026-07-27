/**
 * Seitenkomponente fuer die Route Forgot Password.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UserIcon() {
  return (
    <div className="relative mx-auto h-16 w-16">
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute bottom-0 left-1/2 h-8 w-14 -translate-x-1/2 rounded-t-full bg-black" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Passwort konnte nicht zurückgesetzt werden.");
        return;
      }

      setSuccessMessage(
        "Wenn ein Konto mit dieser E-Mail existiert, wurde ein neues Passwort per Mail verschickt. Schaue auch in deinem Spam-Ordner nach."
      );
      setEmail("");
    } catch {
      setErrorMessage("Passwort konnte nicht zurückgesetzt werden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader activeHref="/login" />

      <section className={`flex min-h-[calc(100vh-176px)] flex-col items-center justify-center py-16 ${PAGE_FRAME}`}>
        <div className="w-full max-w-[560px] text-center">
          <UserIcon />
          <h1 className="mt-4 text-2xl font-medium sm:text-[1.55rem]">Passwort vergessen</h1>

          <p className="mt-4 text-sm leading-6 text-black/60">
            Gib deine E-Mail-Adresse ein. Wir generieren automatisch ein neues Passwort und senden es dir zu.
          </p>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full cursor-pointer rounded-full border border-black bg-black px-6 text-base font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white"
            >
              {isSubmitting ? "Sende neues Passwort..." : "Neues Passwort anfordern"}
            </button>

            {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
            {successMessage ? <p className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</p> : null}

            <div className="flex justify-center gap-10 text-sm text-black/60 underline underline-offset-2">
              <Link href="/login" className="transition hover:text-black">
                Zurück zum Login
              </Link>
               <Link href="/register" className="transition hover:text-black">
                Account erstellen
              </Link>
            </div>
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
