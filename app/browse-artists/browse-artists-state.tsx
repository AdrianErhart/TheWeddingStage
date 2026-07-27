/**
 * Feature-Modul fuer die Kuenstlersuche und -liste.
 * Enthaelt Logik fuer Filter, URL-/Local-Storage-Synchronisation und die Darstellung von Ergebnissen inklusive Interaktionen.
 */
"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildBrowseArtistsStorageKeys } from "./browse-artists-storage";

const FILTER_KEYS = ["genre", "bandSize", "instrument", "accompaniment", "searchLocation", "weddingDate"];
const SCROLL_STORAGE_KEY = "browse-artists:last-scroll";
const JUST_RESTORED_SCROLL_KEY = "browse-artists:just-restored-scroll";
const SUPPRESS_AUTOSCROLL_URL_KEY = "browse-artists:suppress-autoscroll-url";

type BrowseArtistsStatePersistenceProps = {
  storageScope: string;
};

type ScrollSnapshot = {
  url: string;
  scrollY: number;
};

function hasActiveFilters(searchParams: URLSearchParams) {
  return FILTER_KEYS.some((key) => {
    const value = searchParams.get(key);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function readScrollSnapshot(): ScrollSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ScrollSnapshot>;
    if (typeof parsed.url !== "string" || typeof parsed.scrollY !== "number") {
      return null;
    }

    return { url: parsed.url, scrollY: parsed.scrollY };
  } catch {
    return null;
  }
}

function saveScrollSnapshot(url: string) {
  const snapshot: ScrollSnapshot = {
    url,
    scrollY: Math.max(0, Math.round(window.scrollY)),
  };

  window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(snapshot));
}

export function BrowseArtistsStatePersistence({ storageScope }: BrowseArtistsStatePersistenceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;
  const { queryStorageKey, clearQueryFlagKey } = buildBrowseArtistsStorageKeys(storageScope);

  useLayoutEffect(() => {
    if (pathname !== "/browse-artists") {
      return;
    }

    const hasAnyQuery = queryString.length > 0;
    if (hasAnyQuery) {
      return;
    }

    const shouldSkipRestore = window.sessionStorage.getItem(clearQueryFlagKey) === "1";
    if (shouldSkipRestore) {
      window.sessionStorage.removeItem(queryStorageKey);
      window.sessionStorage.removeItem(clearQueryFlagKey);
      return;
    }

    const savedQuery = window.sessionStorage.getItem(queryStorageKey);
    if (!savedQuery) {
      return;
    }

    router.replace(`/browse-artists?${savedQuery}`, { scroll: false });
  }, [pathname, queryString, queryStorageKey, router]);

  useEffect(() => {
    if (pathname !== "/browse-artists") {
      return;
    }

    if (hasActiveFilters(searchParams)) {
      window.sessionStorage.setItem(queryStorageKey, queryString);
      window.sessionStorage.removeItem(clearQueryFlagKey);
    } else {
      const shouldClearSavedQuery = window.sessionStorage.getItem(clearQueryFlagKey) === "1";
      if (shouldClearSavedQuery) {
        window.sessionStorage.removeItem(queryStorageKey);
        window.sessionStorage.removeItem(clearQueryFlagKey);
      }
    }
  }, [clearQueryFlagKey, pathname, queryString, queryStorageKey, searchParams]);

  useLayoutEffect(() => {
    if (pathname !== "/browse-artists") {
      return;
    }

    const restoreSnapshot = readScrollSnapshot();
    if (!restoreSnapshot || restoreSnapshot.url !== currentUrl) {
      return;
    }

    window.sessionStorage.setItem(JUST_RESTORED_SCROLL_KEY, "1");
    window.sessionStorage.setItem(SUPPRESS_AUTOSCROLL_URL_KEY, currentUrl);

    // Run immediately before paint and once more on next frame for late layout shifts.
    window.scrollTo({ top: restoreSnapshot.scrollY, behavior: "auto" });
    const first = window.requestAnimationFrame(() => {
      window.scrollTo({ top: restoreSnapshot.scrollY, behavior: "auto" });
    });

    window.sessionStorage.removeItem(SCROLL_STORAGE_KEY);

    return () => {
      window.cancelAnimationFrame(first);
    };
  }, [currentUrl, pathname]);

  useEffect(() => {
    if (pathname !== "/browse-artists") {
      return;
    }

    const handlePageHide = () => {
      saveScrollSnapshot(currentUrl);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [currentUrl, pathname]);

  return null;
}