/**
 * Route-Handler für den Endpoint `/artists/update`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";

type UpdateArtistBody = {
  artistId?: string;
  userId?: string;
  artistName?: string;
  description?: string;
  profilePicture?: string;
  galleryImages?: string[];
  genre?: string[];
  instruments?: string[];
  musicAccompaniment?: string[];
  bandSize?: string;
  location?: string;
  radius?: string;
  latitude?: number;
  longitude?: number;
  soundcloudUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  technicalInfo?: string;
  songs?: string[];
  unavailableDates?: string[];
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function normalizeDateArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => {
      if (typeof entry !== "string") {
        return "";
      }

      const trimmed = entry.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }

      const parsed = new Date(trimmed);

      if (Number.isNaN(parsed.getTime())) {
        return "";
      }

      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    })
    .filter((entry) => entry.length > 0);

  return Array.from(new Set(normalized)).sort();
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateArtistBody;
    const normalizedArtistId = typeof body.artistId === "string" ? body.artistId.trim() : "";
    const normalizedUserId = typeof body.userId === "string" ? body.userId.trim() : "";

    const filter = normalizedArtistId && ObjectId.isValid(normalizedArtistId)
      ? { _id: new ObjectId(normalizedArtistId) }
      : normalizedUserId
        ? { userId: normalizedUserId }
        : null;

    if (!filter) {
      return NextResponse.json(
        { ok: false, message: "Fehlende Künstler-ID und Nutzer-ID" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.artistName === "string" && body.artistName.trim()) {
      update.artistName = body.artistName.trim();
    }

    if (typeof body.description === "string" && body.description.trim()) {
      update.description = body.description.trim();
    }

    if (typeof body.profilePicture === "string" && body.profilePicture.trim()) {
      update.profilePicture = body.profilePicture.trim();
    }

    const galleryImages = normalizeStringArray(body.galleryImages);
    if (galleryImages.length > 0) {
      update.galleryImages = galleryImages;
    }

    const genre = normalizeStringArray(body.genre);
    if (genre.length > 0) {
      update.genre = genre;
    }

    const instruments = normalizeStringArray(body.instruments);
    if (instruments.length > 0) {
      update.instruments = instruments;
    }

    const musicAccompaniment = normalizeStringArray(body.musicAccompaniment);
    if (musicAccompaniment.length > 0) {
      update.musicAccompaniment = musicAccompaniment;
    }

    if (typeof body.bandSize === "string" && body.bandSize.trim()) {
      update.bandSize = body.bandSize.trim();
    }

    if (typeof body.location === "string" && body.location.trim()) {
      update.location = body.location.trim();
    }

    if (typeof body.radius === "string" && body.radius.trim()) {
      update.radius = body.radius.trim();
    }

    if (typeof body.latitude === "number" && typeof body.longitude === "number") {
      update.latitude = body.latitude;
      update.longitude = body.longitude;
    }

    if (typeof body.soundcloudUrl === "string" && body.soundcloudUrl.trim()) {
      update.soundcloudUrl = body.soundcloudUrl.trim();
    }

    if (typeof body.spotifyUrl === "string" && body.spotifyUrl.trim()) {
      update.spotifyUrl = body.spotifyUrl.trim();
    }

    if (typeof body.youtubeUrl === "string" && body.youtubeUrl.trim()) {
      update.youtubeUrl = body.youtubeUrl.trim();
    }

    if (typeof body.technicalInfo === "string" && body.technicalInfo.trim()) {
      update.technicalInfo = body.technicalInfo.trim();
    }

    const songs = normalizeStringArray(body.songs);
    if (songs.length > 0) {
      update.songs = songs;
    }

    if (body.unavailableDates !== undefined) {
      update.unavailableDates = normalizeDateArray(body.unavailableDates);
    }

    const db = await getDb();
    const result = await db.collection("artists").updateOne(filter, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, message: "Künstler nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: normalizedArtistId || normalizedUserId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}