/**
 * Feature-Modul fuer die Kuenstlersuche und -liste.
 * Enthaelt Logik fuer Filter, URL-/Local-Storage-Synchronisation und die Darstellung von Ergebnissen inklusive Interaktionen.
 */
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const FILTER_KEYS = new Set(["genre", "bandSize", "instrument", "accompaniment", "searchLocation", "weddingDate"]);
const JUST_RESTORED_SCROLL_KEY = "browse-artists:just-restored-scroll";
const SUPPRESS_AUTOSCROLL_URL_KEY = "browse-artists:suppress-autoscroll-url";

export function BrowseArtistsAutoScroll() {
  const searchParams = useSearchParams();
  const currentUrl = `/browse-artists${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const hasActiveFilters = Array.from(searchParams.entries()).some(([key, value]) => {
    return FILTER_KEYS.has(key) && Boolean(value);
  });

  useEffect(() => {
    if (!hasActiveFilters) {
      return;
    }

    const justRestored = window.sessionStorage.getItem(JUST_RESTORED_SCROLL_KEY) === "1";
    if (justRestored) {
      window.sessionStorage.removeItem(JUST_RESTORED_SCROLL_KEY);
      return;
    }

    const suppressedUrl = window.sessionStorage.getItem(SUPPRESS_AUTOSCROLL_URL_KEY);
    if (suppressedUrl === currentUrl) {
      return;
    }

    try {
      const rawSnapshot = window.sessionStorage.getItem("browse-artists:last-scroll");
      if (rawSnapshot) {
        const snapshot = JSON.parse(rawSnapshot) as { url?: string };
        if (snapshot?.url === currentUrl) {
          return;
        }
      }
    } catch {
      // Ignore broken session data and continue with default behavior.
    }

    const target = document.getElementById("browse-filters");
    if (!target) {
      return;
    }

    const offset = 96;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: "smooth" });
    });
  }, [currentUrl, hasActiveFilters]);

  return null;
}
