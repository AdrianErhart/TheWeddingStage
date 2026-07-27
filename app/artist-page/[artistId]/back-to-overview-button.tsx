/**
 * Baustein der Kuenstlerdetailseite.
 * Diese Datei unterstuetzt die Darstellung von Profilinformationen, Medien und nutzerbezogenen Aktionen innerhalb der Artist-Detailansicht.
 */
"use client";

import { useRouter } from "next/navigation";

const SAVED_QUERY_KEY = "browse-artists:last-query";

export function BackToOverviewButton() {
  const router = useRouter();

  const handleClick = () => {
    // Prefer history back so browser restores list state/scroll naturally.
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    const savedQuery = window.sessionStorage.getItem(SAVED_QUERY_KEY);
    if (savedQuery && savedQuery.trim().length > 0) {
      router.push(`/browse-artists?${savedQuery}`, { scroll: false });
      return;
    }

    router.push("/browse-artists", { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/20 bg-white px-5 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
    >
      <span aria-hidden="true">←</span>
      <span>Zurück zur Übersicht</span>
    </button>
  );
}
