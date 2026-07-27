/**
 * Route-Handler für den Endpoint `/artists/[artistId]`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";

type UpdateArtistBody = {
  userId?: string;
  artistName?: string;
  description?: string;
  profilePicture?: string;
  galleryImages?: string[];
  youtubeUrl?: string;
  technicalInfo?: string;
  songs?: string[];
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const { artistId } = await params;

    if (!ObjectId.isValid(artistId)) {
      return NextResponse.json({ ok: false, message: "Ungültige Künstler-ID" }, { status: 400 });
    }

    const db = await getDb();
    // Für die Detailansicht genügt ein kleines Projection-Set statt des kompletten Dokuments.
    const artist = await db.collection("artists").findOne(
      { _id: new ObjectId(artistId) },
      { projection: { artistName: 1, musicAccompaniment: 1 } }
    );

    if (!artist) {
      return NextResponse.json({ ok: false, message: "Künstler nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        artist: {
          id: artist._id.toString(),
          artistName: typeof artist.artistName === "string" ? artist.artistName : "",
          musicAccompaniment: normalizeStringArray(artist.musicAccompaniment),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const { artistId } = await params;
    const body = (await request.json()) as UpdateArtistBody;
    const normalizedUserId = typeof body.userId === "string" ? body.userId.trim() : "";

    // Wenn keine echte ObjectId vorliegt, wird auf den zugehörigen userId-Fallback ausgewichen.
    const filter = ObjectId.isValid(artistId)
      ? { _id: new ObjectId(artistId) }
      : normalizedUserId
        ? { userId: normalizedUserId }
        : null;

    if (!filter) {
      return NextResponse.json(
        { ok: false, message: "Ungültige Künstler-ID und fehlende Nutzer-ID" },
        { status: 400 }
      );
    }

    // Nur tatsächlich gelieferte Felder werden übernommen; ungesendete Werte bleiben unverändert.
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

    if (typeof body.youtubeUrl === "string" && body.youtubeUrl.trim()) {
      update.youtubeUrl = body.youtubeUrl.trim();
    }

    if (typeof body.technicalInfo === "string" && body.technicalInfo.trim()) {
      update.technicalInfo = body.technicalInfo.trim();
    }

    const galleryImages = normalizeStringArray(body.galleryImages);
    if (galleryImages.length > 0) {
      update.galleryImages = galleryImages;
    }

    const songs = normalizeStringArray(body.songs);
    if (songs.length > 0) {
      update.songs = songs;
    }

    const db = await getDb();
    const result = await db.collection("artists").updateOne(filter, { $set: update });

    if (result.matchedCount === 0) {
      // Wenn kein Datensatz gefunden wurde, bekommt die UI eine saubere 404-Antwort.
      return NextResponse.json({ ok: false, message: "Künstler nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: artistId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}