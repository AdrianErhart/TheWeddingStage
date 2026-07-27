/**
 * Feature-Modul fuer die Kuenstlersuche und -liste.
 * Enthaelt Logik fuer Filter, URL-/Local-Storage-Synchronisation und die Darstellung von Ergebnissen inklusive Interaktionen.
 */
const QUERY_STORAGE_KEY_PREFIX = "browse-artists:last-query";
const CLEAR_QUERY_FLAG_KEY_PREFIX = "browse-artists:clear-query";

export function buildBrowseArtistsStorageKeys(storageScope: string) {
  const scope = storageScope.trim() || "guest";

  return {
    queryStorageKey: `${QUERY_STORAGE_KEY_PREFIX}:${scope}`,
    clearQueryFlagKey: `${CLEAR_QUERY_FLAG_KEY_PREFIX}:${scope}`,
  };
}