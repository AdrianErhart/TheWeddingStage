/**
 * Geteiltes Hilfsmodul `artist-completeness` fuer die Anwendungslogik.
 * Stellt wiederverwendbare Funktionen fuer Domainregeln, Datenzugriff oder Infrastrukturdetails bereit, damit diese zentral gepflegt werden koennen.
 */
type ArtistRecord = Record<string, unknown>;

function hasNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasNonEmptyStringEntry(values: unknown) {
  return Array.isArray(values) && values.some((entry) => hasNonEmptyString(entry));
}

export function hasMissingArtistMinimumFields(artist: ArtistRecord) {
  return !(
    hasNonEmptyString(artist.artistName)
    && hasNonEmptyString(artist.description)
    && hasNonEmptyString(artist.bandSize)
    && hasNonEmptyStringEntry(artist.genre)
    && hasNonEmptyStringEntry(artist.instruments)
    && hasNonEmptyStringEntry(artist.musicAccompaniment)
    && hasNonEmptyString(artist.location)
    && hasNonEmptyString(artist.radius)
  );
}

export function isArtistPubliclyVisible(artist: ArtistRecord) {
  return !hasMissingArtistMinimumFields(artist);
}