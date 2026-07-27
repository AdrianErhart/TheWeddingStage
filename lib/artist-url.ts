/**
 * Geteiltes Hilfsmodul `artist-url` fuer die Anwendungslogik.
 * Stellt wiederverwendbare Funktionen fuer Domainregeln, Datenzugriff oder Infrastrukturdetails bereit, damit diese zentral gepflegt werden koennen.
 */
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function slugifyArtistName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractArtistIdFromParam(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (OBJECT_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const segments = trimmed.split("-");
  const maybeId = segments[segments.length - 1] ?? "";

  return OBJECT_ID_PATTERN.test(maybeId) ? maybeId : null;
}

export function buildArtistPath(artistId: string, artistName?: string | null) {
  const slug = artistName ? slugifyArtistName(artistName) : "";
  return `/artist-page/${slug ? `${slug}-${artistId}` : artistId}`;
}
