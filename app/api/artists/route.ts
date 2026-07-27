/**
 * Route-Handler für den Endpoint `/artists`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isArtistPubliclyVisible } from "@/lib/artist-completeness";
import { geocodeCity, calculateDistance, isWithinRadius } from "@/lib/geocoding";

function parsePaginationParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseStringListParam(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeDateKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function isArtistAvailableOnDate(artist: Record<string, unknown>, weddingDate: string) {
  const unavailableDatesRaw = Array.isArray(artist.unavailableDates) ? artist.unavailableDates : [];

  if (unavailableDatesRaw.length === 0) {
    // Ohne Sperrdaten gilt der Künstler als verfügbar.
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

type CreateArtistBody = {
  userId: string;
  artistName: string;
  description?: string;
  profilePicture?: string;
  galleryImages?: string[];
  youtubeUrl?: string;
  technicalInfo?: string;
  songs?: string[];
  genre?: string[];
  instruments?: string[];
  musicAccompaniment?: string[];
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function normalizeArtistList(artists: unknown[]) {
  return artists.map((artist) => ({
    id: artist && typeof artist === "object" && "_id" in artist && artist._id ? String((artist as { _id: unknown })._id) : "",
    artistName: artist && typeof artist === "object" && typeof (artist as { artistName?: unknown }).artistName === "string"
      ? (artist as { artistName: string }).artistName
      : "Unbekannter Künstler",
    profilePicture: artist && typeof artist === "object" && typeof (artist as { profilePicture?: unknown }).profilePicture === "string"
      ? (artist as { profilePicture: string }).profilePicture
      : "",
    genre: Array.isArray(artist && typeof artist === "object" ? (artist as { genre?: unknown }).genre : [])
      ? (artist as { genre?: unknown[] }).genre!.filter((entry): entry is string => typeof entry === "string")
      : [],
    bandSize: artist && typeof artist === "object" && typeof (artist as { bandSize?: unknown }).bandSize === "string"
      ? (artist as { bandSize: string }).bandSize
      : "",
    musicAccompaniment: Array.isArray(artist && typeof artist === "object" ? (artist as { musicAccompaniment?: unknown }).musicAccompaniment : [])
      ? (artist as { musicAccompaniment?: unknown[] }).musicAccompaniment!.filter((entry): entry is string => typeof entry === "string")
      : [],
    instruments: Array.isArray(artist && typeof artist === "object" ? (artist as { instruments?: unknown }).instruments : [])
      ? (artist as { instruments?: unknown[] }).instruments!.filter((entry): entry is string => typeof entry === "string")
      : [],
    location: artist && typeof artist === "object" && typeof (artist as { location?: unknown }).location === "string"
      ? (artist as { location: string }).location
      : "",
    radius: artist && typeof artist === "object" && typeof (artist as { radius?: unknown }).radius === "string"
      ? (artist as { radius: string }).radius
      : "",
    averageRating: artist && typeof artist === "object" && typeof (artist as { averageRating?: unknown }).averageRating === "number"
      ? (artist as { averageRating: number }).averageRating
      : null,
    reviewCount: artist && typeof artist === "object" && typeof (artist as { reviewCount?: unknown }).reviewCount === "number"
      ? (artist as { reviewCount: number }).reviewCount
      : 0,
  }));
}

async function addReviewStats(db: Awaited<ReturnType<typeof getDb>>, artists: Record<string, unknown>[]) {
  const artistIds = artists
    .map((artist) => (artist._id ? String(artist._id) : ""))
    .filter((artistId) => artistId.length > 0);

  if (artistIds.length === 0) {
    return artists;
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

  return artists.map((artist) => {
    const artistId = artist._id ? String(artist._id) : "";
    const stats = statsMap.get(artistId);

    if (!stats || stats.count === 0) {
      return {
        ...artist,
        averageRating: null,
        reviewCount: 0,
      };
    }

    return {
      ...artist,
      averageRating: Number((stats.sum / stats.count).toFixed(1)),
      reviewCount: stats.count,
    };
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parsePaginationParam(url.searchParams.get("limit"), 20);
    const skip = parsePaginationParam(url.searchParams.get("skip"), 0);
    const selectedGenres = parseStringListParam(url.searchParams.get("genre"));
    const selectedBandSize = parseStringListParam(url.searchParams.get("bandSize"));
    const selectedInstruments = parseStringListParam(url.searchParams.get("instrument"));
    const selectedAccompaniment = parseStringListParam(url.searchParams.get("accompaniment"));
    const searchLocation = url.searchParams.get("searchLocation")?.trim() ?? "";
    const weddingDate = normalizeDateKey(url.searchParams.get("weddingDate"));

    const filter: Record<string, unknown> = {};

    if (selectedGenres.length > 0) {
      filter.genre = { $in: selectedGenres };
    }

    if (selectedBandSize.length > 0) {
      filter.bandSize = { $in: selectedBandSize };
    }

    if (selectedInstruments.length > 0) {
      filter.instruments = { $all: selectedInstruments };
    }

    if (selectedAccompaniment.length > 0) {
      filter.musicAccompaniment = { $all: selectedAccompaniment };
    }

    const db = await getDb();
    const needsPostFiltering = Boolean(searchLocation || weddingDate);
    let total = 0;
    let artists: Record<string, unknown>[] = [];

    if (!needsPostFiltering) {
      // Wenn weder Ort noch Datum gefiltert werden, kann direkt auf der Datenbankebene paginiert werden.
      const allArtists = await db
        .collection("artists")
        .find(filter)
        .sort({ artistName: 1, createdAt: -1 })
        .toArray();
      const visibleArtists = allArtists.filter((artist) => isArtistPubliclyVisible(artist));

      total = visibleArtists.length;
      artists = visibleArtists.slice(skip, skip + limit);
    } else {
      // Orts- oder Datumsfilter benötigen eine zusätzliche Prüfung nach dem Laden.
      const geoLocation = searchLocation ? await geocodeCity(searchLocation) : null;

      if (searchLocation && !geoLocation) {
        return NextResponse.json({ ok: true, total: 0, artists: [] }, { status: 200 });
      }

      const allArtists = await db
        .collection("artists")
        .find(filter)
        .sort({ artistName: 1, createdAt: -1 })
        .toArray();
      const visibleArtists = allArtists.filter((artist) => isArtistPubliclyVisible(artist));
      const matchingArtists = visibleArtists.filter((artist) => {
        if (selectedInstruments.length > 0) {
          // Bei Instrumenten muss ein Künstler alle gewünschten Instrumente abdecken.
          const artistInstruments = normalizeStringArray(artist.instruments);
          const hasAllInstruments = selectedInstruments.every((instrument) =>
            artistInstruments.includes(instrument)
          );
          if (!hasAllInstruments) {
            return false;
          }
        }

        if (geoLocation) {
          // Entfernung und Radius werden nur geprüft, wenn eine Ortsauflösung vorliegt.
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
          // Sperrtermine schließen Künstler an diesem Datum aus.
          return false;
        }

        return true;
      });

      total = matchingArtists.length;
      artists = matchingArtists.slice(skip, skip + limit);
    }

    const artistsWithStats = await addReviewStats(db, artists);

    return NextResponse.json(
      {
        ok: true,
        total,
        artists: normalizeArtistList(artistsWithStats),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      artistName,
      description = "",
      profilePicture = "",
      galleryImages = [],
      youtubeUrl = "",
      technicalInfo = "",
      songs = [],
      genre = [],
      instruments = [],
      musicAccompaniment = [],
    } = body as CreateArtistBody;

    // Nur bereinigte Werte werden gespeichert, damit die Sammlung konsistent bleibt.
    const normalizedArtistName = typeof artistName === "string" ? artistName.trim() : "";
    const normalizedDescription = typeof description === "string" ? description.trim() : "";
    const normalizedProfilePicture = typeof profilePicture === "string" ? profilePicture.trim() : "";
    const normalizedYoutubeUrl = typeof youtubeUrl === "string" ? youtubeUrl.trim() : "";
    const normalizedTechnicalInfo = typeof technicalInfo === "string" ? technicalInfo.trim() : "";
    const normalizedGalleryImages = normalizeStringArray(galleryImages);
    const normalizedSongs = normalizeStringArray(songs);
    const normalizedGenres = normalizeStringArray(genre);
    const normalizedInstruments = normalizeStringArray(instruments);
    const normalizedMusicAccompaniment = normalizeStringArray(musicAccompaniment);

    if (!userId || !normalizedArtistName) {
      return NextResponse.json({ ok: false, message: "Nutzer-ID und Künstlername sind erforderlich" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("artists").insertOne({
      userId,
      artistName: normalizedArtistName,
      description: normalizedDescription,
      profilePicture: normalizedProfilePicture,
      galleryImages: normalizedGalleryImages,
      youtubeUrl: normalizedYoutubeUrl,
      technicalInfo: normalizedTechnicalInfo,
      songs: normalizedSongs,
      genre: normalizedGenres,
      instruments: normalizedInstruments,
      musicAccompaniment: normalizedMusicAccompaniment,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
