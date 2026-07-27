/**
 * Wiederverwendbare UI-Komponente `welcome-popup`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { WELCOME_POPUP_STORAGE_KEY, type WelcomePopupPayload } from "@/lib/welcome-popup";

type WelcomePopupState = {
  profileHref: string;
};

function readWelcomePopupState() {
  try {
    const raw = window.sessionStorage.getItem(WELCOME_POPUP_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<WelcomePopupPayload>;
    if (typeof parsed.profileHref !== "string" || parsed.profileHref.trim().length === 0) {
      return null;
    }

    return { profileHref: parsed.profileHref } satisfies WelcomePopupState;
  } catch {
    return null;
  }
}

export function WelcomePopup() {
  const [popupState] = useState<WelcomePopupState | null>(() => {
    const storedState = typeof window === "undefined" ? null : readWelcomePopupState();

    if (storedState) {
      window.sessionStorage.removeItem(WELCOME_POPUP_STORAGE_KEY);
    }

    return storedState;
  });

  if (!popupState) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-black/10 bg-[#f4f2ef] p-6 text-black shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-8">

        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Herzlich willkommen bei The Wedding Stage.
        </h2>
        <p className="mt-4 max-w-lg text-base leading-7 text-black/75 sm:text-lg">
          Vervollständige am besten zuerst dein Profil, damit du direkt durchstarten kannst.
          Danach kannst du dich entspannt selbst umsehen.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/browse-artists"
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/15 bg-white px-6 text-sm font-semibold text-black transition hover:border-black hover:bg-black hover:text-white"
          >
            Erstmal umsehen
          </Link>
          <Link
            href={popupState.profileHref}
            className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-black/85"
          >
            Profil vervollständigen
          </Link>
        </div>
      </div>
    </div>
  );
}