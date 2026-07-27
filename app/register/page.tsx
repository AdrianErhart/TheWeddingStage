/**
 * Seitenkomponente fuer die Route Register.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";

function UserIcon() {
  return (
    <div className="mx-auto relative h-16 w-16">
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-black" />
      <div className="absolute bottom-0 left-1/2 h-8 w-14 -translate-x-1/2 rounded-t-full bg-black" />
    </div>
  );
}

function RadioPill({ selected, label }: { selected?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-lg text-black/40">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
          selected ? "border-black bg-black text-white" : "border-black bg-white"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
      <span>{label}</span>
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = [
  { label: "Mind. 8 Zeichen", test: (value: string) => value.length >= 8 },
  { label: "Mind. 1 Kleinbuchstabe", test: (value: string) => /[a-z]/.test(value) },
  { label: "Mind. 1 Großbuchstabe", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Mind. 1 Zahl", test: (value: string) => /\d/.test(value) },
  { label: "Mind. 1 Sonderzeichen", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function RegistrierungPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"customer" | "artist">(
    "customer"
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);
  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    label: rule.label,
    valid: rule.test(password),
  }));
  const isPasswordValid = passwordChecks.every((rule) => rule.valid);
  const passwordsMatch = password.length > 0 && password === repeatPassword;
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (selectedRole === "customer" || artistName.trim().length > 0) &&
    isEmailValid &&
    isPasswordValid &&
    passwordsMatch &&
    !isSubmitting;

  const handleRoleSelect = (role: "customer" | "artist") => {
    setSelectedRole(role);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("Bitte Vorname und Nachname eingeben.");
      return;
    }

    if (selectedRole === "artist" && !artistName.trim()) {
      setErrorMessage("Bitte einen Künstlernamen eingeben.");
      return;
    }

    if (!isEmailValid) {
      setErrorMessage("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage("Das Passwort erfüllt die Mindestanforderungen noch nicht.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
          role: selectedRole,
          artistName: selectedRole === "artist" ? artistName.trim() : undefined,
        }),
      });

      const payload = (await response.json()) as { ok: boolean; id?: string; message?: string };

      if (!response.ok || !payload.ok || !payload.id) {
        setErrorMessage(payload.message ?? "Die Registrierung konnte nicht abgeschlossen werden.");
        return;
      }

      router.push("/check-mail");
    } catch {
      setErrorMessage("Die Registrierung konnte nicht gespeichert werden.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordRequirementState = passwordChecks;

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader activeHref="/login" />

      <section className={`flex min-h-[calc(100vh-176px)] flex-col items-center py-16 ${PAGE_FRAME}`}>
        <div
          className="w-full max-w-140 text-center"
        >
          <UserIcon />
          <h1 className="mt-4 text-2xl font-medium sm:text-[1.55rem]">
            {selectedRole === "artist" ? "Künstleraccount erstellen" : "Kundenaccount erstellen"}
          </h1>

          <p className="mt-6 text-lg text-black/40">Ich bin:</p>
          <div className="mt-4 flex items-center justify-center gap-10">
            <button
              type="button"
              onClick={() => handleRoleSelect("customer")}
              aria-label="Kunde registrieren"
              className="transition hover:opacity-100"
            >
              <RadioPill selected={selectedRole === "customer"} label="Kunde" />
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("artist")}
              aria-label="Künstler registrieren"
              className="transition hover:opacity-100"
            >
              <RadioPill selected={selectedRole === "artist"} label="Künstler" />
            </button>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Vorname"
                className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />

              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Nachname"
                className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
            </div>

            {selectedRole === "artist" ? (
              <input
                type="text"
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
                placeholder="Künstlername"
                className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="deine@email.de"
              className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
            />

            <div className="space-y-3 rounded-[1.75rem] border border-black/10 bg-black/5 px-6 py-5 text-left">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Passwort"
                className="h-14 w-full rounded-full border border-black/45 bg-transparent px-6 text-lg outline-none placeholder:text-black/35 focus:border-black"
              />

              <div className="space-y-2 text-sm text-black/60">
                {passwordRequirementState.map((rule) => (
                  <div key={rule.label} className={rule.valid ? "text-black" : "text-black/50"}>
                    {rule.valid ? "✓" : "•"} {rule.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <input
                type="password"
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
                placeholder="Passwort wiederholen"
                className="h-12 min-w-0 flex-1 rounded-full border border-black/45 bg-transparent px-4 text-base outline-none placeholder:text-black/35 focus:border-black sm:h-14 sm:px-6 sm:text-lg"
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black text-2xl leading-none transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit sm:h-14 sm:w-14 sm:text-3xl"
                aria-label="Registrierung abschließen"
              >
                →
              </button>
            </div>

            {errorMessage ? (
              <p className="text-sm text-red-600">{errorMessage}</p>
            ) : repeatPassword.length > 0 && !passwordsMatch ? (
              <p className="text-sm text-red-600">Die Passwörter stimmen nicht überein.</p>
            ) : null}

            <div className="flex items-center justify-center gap-10 text-sm text-black/60 underline underline-offset-2">
              <Link href="/login" className="transition hover:text-black">
                Zum Login
              </Link>
            </div>
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}