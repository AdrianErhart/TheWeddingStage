/**
 * Seitenkomponente fuer die Route Login.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";
import { WELCOME_POPUP_STORAGE_KEY, type WelcomePopupPayload } from "@/lib/welcome-popup";
import { buildArtistPath } from "@/lib/artist-url";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UserIcon() {
  return (
    <div className="mx-auto relative h-16 w-16">
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute bottom-0 left-1/2 h-8 w-14 -translate-x-1/2 rounded-t-full bg-black" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white text-black" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccessMessage = searchParams.get("registered") === "1";
  const showLoggedOutMessage = searchParams.get("logged_out") === "1";
  const emailVerificationState = searchParams.get("verified");
  const showVerificationSuccessMessage = emailVerificationState === "1";
  const showVerificationErrorMessage = emailVerificationState === "0";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);
  const canSubmit = isEmailValid && password.trim().length > 0 && !isSubmitting;

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const payload = (await response.json()) as { ok: boolean; authenticated?: boolean };

        if (isMounted && response.ok && payload.ok && payload.authenticated) {
          router.replace("/");
        }
      } catch {
        // Ignore session check failures and keep the login form available.
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isEmailValid) {
      setErrorMessage("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }

    if (password.trim().length === 0) {
      setErrorMessage("Bitte ein Passwort eingeben.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "Die Anmeldung ist fehlgeschlagen.");
        return;
      }

      const typedPayload = payload as {
        ok: boolean;
        message?: string;
        showWelcomePopup?: boolean;
        welcomeProfileHref?: string;
        artistId?: string | null;
        artistName?: string | null;
        role?: "artist" | "customer";
      };

      if (typedPayload.showWelcomePopup) {
        const profileHref =
          typeof typedPayload.welcomeProfileHref === "string" && typedPayload.welcomeProfileHref.length > 0
            ? typedPayload.welcomeProfileHref
            : typedPayload.role === "artist" && typedPayload.artistId
              ? `${buildArtistPath(typedPayload.artistId, typedPayload.artistName ?? "")}?edit=true`
              : "/profile";

        const welcomePayload: WelcomePopupPayload = { profileHref };
        window.sessionStorage.setItem(WELCOME_POPUP_STORAGE_KEY, JSON.stringify(welcomePayload));
      }

      router.replace("/");
    } catch {
      setErrorMessage("Die Anmeldung ist fehlgeschlagen.");
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
          <h1 className="mt-4 text-2xl font-medium sm:text-[1.55rem]">
            Bei deinem Account anmelden
          </h1>

          {showSuccessMessage ? (
            <p className="mt-4 rounded-full border border-emerald-500/20 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
              Registrierung erfolgreich. Du kannst dich jetzt anmelden.
            </p>
          ) : null}

          {showLoggedOutMessage ? (
            <p className="mt-4 rounded-full border border-emerald-500/20 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
              Du hast dich erfolgreich abgemeldet.
            </p>
          ) : null}

          {showVerificationSuccessMessage ? (
            <p className="mt-4 rounded-full border border-emerald-500/20 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
              Deine E-Mail wurde bestätigt. Du kannst dich jetzt anmelden.
            </p>
          ) : null}

          {showVerificationErrorMessage ? (
            <p className="mt-4 rounded-full border border-red-500/20 bg-red-50 px-5 py-3 text-sm text-red-700">
              Der Bestätigungslink ist ungültig oder abgelaufen. Registriere dich bitte erneut.
            </p>
          ) : null}

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
            />

            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-full border border-black/45 bg-transparent px-4 text-base outline-none placeholder:text-black/35 focus:border-black sm:h-14 sm:px-6 sm:text-lg"
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black text-2xl leading-none transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black sm:h-14 sm:w-14 sm:text-3xl"
                aria-label="Anmelden"
              >
                →
              </button>
            </div>

            {errorMessage ? (
              <p className="text-sm text-red-600">{errorMessage}</p>
            ) : null}

            <div className="flex justify-center gap-14 text-sm text-black/60 underline underline-offset-2">
              <Link href="/forgot-password" className="transition hover:text-black">
                Passwort vergessen?
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
