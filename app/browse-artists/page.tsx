/**
 * Seitenkomponente fuer die Route Browse Artists.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { ObjectId } from "mongodb";
import Image from "next/image";
import { cookies } from "next/headers";

import { getDb } from "@/lib/mongodb";
import { isArtistPubliclyVisible } from "@/lib/artist-completeness";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";
import { ArtistGrid } from "./artist-grid";
import { ArtistFilters } from "./artist-filters";
import { BrowseArtistsAutoScroll } from "./browse-artists-autoscroll";
import { BrowseArtistsStatePersistence } from "./browse-artists-state";
import { geocodeCity, calculateDistance, isWithinRadius } from "@/lib/geocoding";

type ArtistCardData = {
  id: string;
  artistName: string;
  profilePicture: string;
  genre: string[];
  bandSize: string;
  musicAccompaniment: string[];
  instruments: string[];
  location: string;
  radius: string;
  averageRating: number | null;
  reviewCount: number;
};

function toArtistId(value: unknown) {
  if (value instanceof ObjectId) {
    return value.toString();
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

async function getReviewStatsByArtistId(db: Awaited<ReturnType<typeof getDb>>, artists: Record<string, unknown>[]) {
  const artistIds = artists.map((artist) => toArtistId(artist._id)).filter((artistId) => artistId.length > 0);

  if (artistIds.length === 0) {
    return new Map<string, { averageRating: number | null; reviewCount: number }>();
  }

  const reviews = await db
    .collection("reviews")
    .find({ artistId: { $in: artistIds } })
    .project({ artistId: 1, stars: 1 })
    .toArray();

  const statsMap = new Map<string, { sum: number; count: number }>();

  for (const review of reviews) {
    const artistId = typeof review.artistId === "string" ? review.artistId : "";
    const stars = typeof review.stars === "number" ? review.stars : null;

    if (!artistId || stars === null) {
      continue;
    }

    const current = statsMap.get(artistId) ?? { sum: 0, count: 0 };
    current.sum += stars;
    current.count += 1;
    statsMap.set(artistId, current);
  }

  const result = new Map<string, { averageRating: number | null; reviewCount: number }>();

  for (const artistId of artistIds) {
    const stats = statsMap.get(artistId);

    if (!stats || stats.count === 0) {
      result.set(artistId, { averageRating: null, reviewCount: 0 });
      continue;
    }

    result.set(artistId, {
      averageRating: Number((stats.sum / stats.count).toFixed(1)),
      reviewCount: stats.count,
    });
  }

  return result;
}

type BrowseArtistsSearchParams = {
  genre?: string | string[];
  bandSize?: string | string[];
  instrument?: string | string[];
  accompaniment?: string | string[];
  searchLocation?: string;
  weddingDate?: string;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseList(value?: string | string[]) {
  const raw = firstValue(value);

  if (!raw) {
    return [] as string[];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeDateKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return "";
}

function isArtistAvailableOnDate(artist: Record<string, unknown>, weddingDate: string) {
  const unavailableDatesRaw = Array.isArray(artist.unavailableDates) ? artist.unavailableDates : [];

  if (unavailableDatesRaw.length === 0) {
    return true;
  }

  const unavailableDates = new Set(
    unavailableDatesRaw
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => normalizeDateKey(entry))
      .filter((entry) => entry.length > 0)
  );

  if (unavailableDates.size === 0) {
    return true;
  }

  return !unavailableDates.has(weddingDate);
}

type BrowseArtistsPageProps = {
  searchParams?: Promise<BrowseArtistsSearchParams> | BrowseArtistsSearchParams;
};

export default async function BrowseArtistsPage({ searchParams }: BrowseArtistsPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const selectedGenres = parseList(resolvedSearchParams.genre);
  const selectedBandSizeList = parseList(resolvedSearchParams.bandSize);
  const selectedInstruments = parseList(resolvedSearchParams.instrument);
  const selectedAccompaniment = parseList(resolvedSearchParams.accompaniment);
  const searchLocation = typeof resolvedSearchParams.searchLocation === "string" ? resolvedSearchParams.searchLocation.trim() : "";
  const weddingDate = normalizeDateKey(resolvedSearchParams.weddingDate);

  const db = await getDb();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const storageScope = token ? (await findSessionByToken(db, token))?.userId ?? "guest" : "guest";
  const filter: Record<string, unknown> = {};

  if (selectedGenres.length > 0) {
    filter.genre = { $in: selectedGenres };
  }

  if (selectedBandSizeList.length > 0) {
    filter.bandSize = { $in: selectedBandSizeList };
  }

  if (selectedInstruments.length > 0) {
    filter.instruments = { $all: selectedInstruments };
  }

  if (selectedAccompaniment.length > 0) {
    filter.musicAccompaniment = { $all: selectedAccompaniment };
  }

  const allArtists = await db.collection("artists").find(filter).sort({ artistName: 1, createdAt: -1 }).toArray();
  const visibleArtists = allArtists.filter((artist) => isArtistPubliclyVisible(artist));
  const needsPostFiltering = Boolean(searchLocation || weddingDate);
  let totalArtists = 0;
  let artists: Record<string, unknown>[] = [];

  if (!needsPostFiltering) {
    totalArtists = visibleArtists.length;
    artists = visibleArtists.slice(0, 20);
  } else {
    const geoLocation = searchLocation ? await geocodeCity(searchLocation) : null;

    if (searchLocation && !geoLocation) {
      artists = [];
      totalArtists = 0;
    } else {
      const filteredArtists = visibleArtists.filter((artist) => {
        if (geoLocation) {
          const artistLat = typeof artist.latitude === "number" ? artist.latitude : null;
          const artistLng = typeof artist.longitude === "number" ? artist.longitude : null;
          const artistRadius = typeof artist.radius === "string" ? artist.radius.trim() : "";

          if (artistLat === null || artistLng === null || !artistRadius) {
            return false;
          }

          const distance = calculateDistance(geoLocation.lat, geoLocation.lng, artistLat, artistLng);

          if (!isWithinRadius(distance, artistRadius)) {
            return false;
          }
        }

        if (weddingDate && !isArtistAvailableOnDate(artist, weddingDate)) {
          return false;
        }

        return true;
      });

      totalArtists = filteredArtists.length;
      artists = filteredArtists.slice(0, 20);
    }
  }

  const reviewStatsByArtistId = await getReviewStatsByArtistId(db, artists);

  const artistCards: ArtistCardData[] = artists.map((artist) => ({
    id: toArtistId(artist._id),
    artistName: typeof artist.artistName === "string" ? artist.artistName : "Unbekannter Künstler",
    profilePicture: typeof artist.profilePicture === "string" ? artist.profilePicture : "",
    genre: Array.isArray(artist.genre)
      ? artist.genre.filter((entry): entry is string => typeof entry === "string")
      : [],
    bandSize: typeof artist.bandSize === "string" ? artist.bandSize : "",
    musicAccompaniment: Array.isArray(artist.musicAccompaniment)
      ? artist.musicAccompaniment.filter((entry): entry is string => typeof entry === "string")
      : [],
    instruments: Array.isArray(artist.instruments)
      ? artist.instruments.filter((entry): entry is string => typeof entry === "string")
      : [],
    location: typeof artist.location === "string" ? artist.location : "",
    radius: typeof artist.radius === "string" ? artist.radius : "",
    averageRating: reviewStatsByArtistId.get(toArtistId(artist._id))?.averageRating ?? null,
    reviewCount: reviewStatsByArtistId.get(toArtistId(artist._id))?.reviewCount ?? 0,
  }));

  return (
    <main className="min-h-screen bg-white text-black">
      <SiteHeader theme="dark" activeHref="/browse-artists" />

      <section className="relative min-h-117.5 overflow-hidden bg-black">
        <Image
          src="/Header_Couple.png"
          alt="Brautpaar tanzt auf einer Bühne"
          fill
          priority
          className="object-cover object-[78%_top] md:object-top lg:object-[center_14%] opacity-85"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-black/5" />

        <div className={`relative flex min-h-117.5 items-start pt-20 text-white ${PAGE_FRAME}`}>
          <div className="max-w-140">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">Finde deinen Künstler.</h1>
            <p className="mt-5 text-xl font-light text-white/92">Künstler durchsuchen.</p>
          </div>
        </div>
      </section>

      <section className="bg-white pb-24 pt-16">
        <BrowseArtistsStatePersistence storageScope={storageScope} />
        <BrowseArtistsAutoScroll />

        <div className={PAGE_FRAME}>
          <h2 id="browse-filters" className="scroll-mt-24 text-[3.5rem] font-extrabold tracking-tight text-black sm:text-[4.25rem]">
            Filter
          </h2>

          <ArtistFilters
            initialFilters={{
              genre: selectedGenres,
              bandSize: selectedBandSizeList,
              instrument: selectedInstruments,
              accompaniment: selectedAccompaniment,
              searchLocation,
              weddingDate,
            }}
            storageScope={storageScope}
          />

          <div className="mt-24">
            {artistCards.length > 0 ? (
              <ArtistGrid
                key={`${selectedGenres.join("|")}:${selectedBandSizeList.join("|")}:${selectedInstruments.join("|")}:${selectedAccompaniment.join("|")}:${searchLocation}:${weddingDate}`}
                initialArtists={artistCards}
                totalArtists={totalArtists}
                pageSize={20}
                filters={{
                  genre: selectedGenres,
                  bandSize: selectedBandSizeList,
                  instrument: selectedInstruments,
                  accompaniment: selectedAccompaniment,
                  searchLocation,
                  weddingDate,
                }}
              />
            ) : (
              <div className="rounded-[28px] border border-black/10 bg-white p-8 text-sm text-black/55 sm:col-span-2 xl:col-span-4">
                Noch keine Artists in der Datenbank vorhanden.
              </div>
            )}
          </div>

        </div>
      </section>

      <SiteFooter />
    </main>
  );
}