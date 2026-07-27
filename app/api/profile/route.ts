/**
 * Route-Handler für den Endpoint `/profile`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/mongodb";
import { SESSION_COOKIE_NAME, findSessionByToken } from "@/lib/session";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PHONE_REGEX = /^[0-9+()\s/-]{6,25}$/;
const BUDGET_REGEX = /^\d{1,7}([.,]\d{1,2})?(\s?(€|EUR))?$/i;

type ProfilePatchBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: "artist" | "customer";
  artistName?: string;
  description?: string;
  profilePicture?: string;
  galleryImages?: string[] | string;
  genre?: string[] | string;
  instruments?: string[] | string;
  musicAccompaniment?: string[] | string;
  bandSize?: string;
  location?: string;
  radius?: string;
  latitude?: number;
  longitude?: number;
  soundcloudUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  youtubeUrl2?: string;
  technicalInfo?: string;
  songs?: string[] | string;
  unavailableDates?: string[] | string;
  address?: {
    street?: string;
    zip?: string;
    city?: string;
  };
  bookingDefaults?: {
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    locationName?: string;
    locationStreet?: string;
    locationZip?: string;
    locationCity?: string;
    plannerEmail?: string;
    venueEmail?: string;
    estimatedBudget?: string;
    additionalInfo?: string;
  };
};

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDateArray(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/)
      : [];

  const normalized = rawValues
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

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const db = await getDb();
  const session = await findSessionByToken(db, token);

  if (!session || !ObjectId.isValid(session.userId)) {
    return null;
  }

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });

  if (!user) {
    return null;
  }

  return { db, user, session };
}

export async function GET(request: NextRequest) {
  try {
    const authenticated = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }

    const { db, user } = authenticated;

    // Künstler- und Kundendaten werden getrennt geladen, weil sie in unterschiedlichen Collections liegen.
    const artist = await db.collection("artists").findOne({ userId: user._id.toString() });
    const customer = await db.collection("customers").findOne({ userId: user._id.toString() });

    return NextResponse.json(
      {
        ok: true,
        authenticated: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        artist: artist
          ? {
              id: artist._id.toString(),
              artistName: artist.artistName ?? "",
              description: artist.description ?? "",
              profilePicture: artist.profilePicture ?? "",
              galleryImages: Array.isArray(artist.galleryImages) ? artist.galleryImages : [],
              genre: Array.isArray(artist.genre) ? artist.genre : [],
              instruments: Array.isArray(artist.instruments) ? artist.instruments : [],
              musicAccompaniment: Array.isArray(artist.musicAccompaniment) ? artist.musicAccompaniment : [],
              bandSize: artist.bandSize ?? "",
              location: artist.location ?? "",
              radius: artist.radius ?? "",
              soundcloudUrl: artist.soundcloudUrl ?? "",
              spotifyUrl: artist.spotifyUrl ?? "",
              youtubeUrl: artist.youtubeUrl ?? "",
              youtubeUrl2: artist.youtubeUrl2 ?? "",
              technicalInfo: artist.technicalInfo ?? "",
              songs: Array.isArray(artist.songs) ? artist.songs : [],
              unavailableDates: Array.isArray(artist.unavailableDates) ? normalizeDateArray(artist.unavailableDates) : [],
            }
          : null,
        customer: customer
          ? {
              id: customer._id.toString(),
              phone: customer.phone ?? "",
              address: customer.address ?? { street: "", zip: "", city: "" },
              bookingDefaults: customer.bookingDefaults ?? {
                startDate: "",
                startTime: "",
                endDate: "",
                endTime: "",
                locationName: "",
                locationStreet: "",
                locationZip: "",
                locationCity: "",
                plannerEmail: "",
                venueEmail: "",
                estimatedBudget: "",
                additionalInfo: "",
              },
            }
          : null,
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

export async function PATCH(request: NextRequest) {
  try {
    const authenticated = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ ok: false, message: "Nicht angemeldet" }, { status: 401 });
    }

    const { db, user } = authenticated;
    const body = (await request.json()) as ProfilePatchBody;

    const updateUser: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const normalizedFirstName = normalizeOptionalString(body.firstName);
    const normalizedLastName = normalizeOptionalString(body.lastName);
    const normalizedEmail = normalizeOptionalString(body.email)?.toLowerCase();
    const currentEmail = typeof user.email === "string" ? user.email.toLowerCase() : "";

    // Die E-Mail-Adresse ist bewusst nicht editierbar, weil sie die Login-Identität darstellt.
    if (normalizedEmail && normalizedEmail !== currentEmail) {
      return NextResponse.json({ ok: false, message: "Die E-Mail-Adresse kann nicht geändert werden." }, { status: 400 });
    }

    if (
      (typeof body.firstName === "string" && body.firstName.trim().length === 0) ||
      (typeof body.lastName === "string" && body.lastName.trim().length === 0)
    ) {
      return NextResponse.json({ ok: false, message: "Vorname und Nachname dürfen nicht leer sein." }, { status: 400 });
    }

    if (user.role === "artist" && typeof body.artistName === "string" && body.artistName.trim().length === 0) {
      return NextResponse.json({ ok: false, message: "Der Künstlername ist ein Pflichtfeld und darf nicht leer sein." }, { status: 400 });
    }

    if (user.role === "artist" && typeof body.location === "string" && body.location.trim().length > 0) {
      if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
        return NextResponse.json(
          { ok: false, message: "Bitte wähle eine Stadt aus den OpenStreetMap-Vorschlägen aus." },
          { status: 400 }
        );
      }
    }

    if (typeof body.phone === "string" && body.phone.trim().length > 0 && !PHONE_REGEX.test(body.phone.trim())) {
      return NextResponse.json({ ok: false, message: "Bitte gib eine gültige Telefonnummer ein." }, { status: 400 });
    }

    if (
      typeof body.bookingDefaults?.estimatedBudget === "string" &&
      body.bookingDefaults.estimatedBudget.trim().length > 0 &&
      !BUDGET_REGEX.test(body.bookingDefaults.estimatedBudget.trim())
    ) {
      return NextResponse.json(
        { ok: false, message: "Bitte gib ein gültiges Budget ein (z. B. 1500 oder 1500 EUR)." },
        { status: 400 }
      );
    }

    if (normalizedFirstName) {
      updateUser.firstName = normalizedFirstName;
    }

    if (normalizedLastName) {
      updateUser.lastName = normalizedLastName;
    }

    if (typeof body.password === "string" && body.password.trim()) {
      if (!PASSWORD_REGEX.test(body.password)) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Das Passwort muss mindestens 8 Zeichen lang sein und 1 Kleinbuchstaben, 1 Großbuchstaben, 1 Zahl sowie 1 Sonderzeichen enthalten.",
          },
          { status: 400 }
        );
      }

      if (typeof user.password === "string" && bcrypt.compareSync(body.password, user.password)) {
        return NextResponse.json(
          {
            ok: false,
            message: "Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.",
          },
          { status: 400 }
        );
      }

      updateUser.password = bcrypt.hashSync(body.password, 10);
    }

    await db.collection("users").updateOne({ _id: user._id }, { $set: updateUser });

    if (user.role === "artist") {
      const updateArtist: Record<string, unknown> = { updatedAt: new Date() };
      const unsetArtist: Record<string, ""> = {};

      const normalizedArtistName = normalizeOptionalString(body.artistName);
      const normalizedDescription = normalizeOptionalString(body.description);
      const normalizedProfilePicture = normalizeOptionalString(body.profilePicture);
      const normalizedBandSize = normalizeOptionalString(body.bandSize);
      const normalizedMusicAccompaniment = normalizeStringArray(body.musicAccompaniment);
      const normalizedLocation = normalizeOptionalString(body.location);
      const normalizedRadius = normalizeOptionalString(body.radius);
      const normalizedSoundcloudUrl = normalizeOptionalString(body.soundcloudUrl);
      const normalizedSpotifyUrl = normalizeOptionalString(body.spotifyUrl);
      const normalizedYoutubeUrl = normalizeOptionalString(body.youtubeUrl);
      const normalizedYoutubeUrl2 = normalizeOptionalString(body.youtubeUrl2);
      const normalizedTechnicalInfo = normalizeOptionalString(body.technicalInfo);
      const normalizedGalleryImages = normalizeStringArray(body.galleryImages);
      const normalizedGenre = normalizeStringArray(body.genre);
      const normalizedInstruments = normalizeStringArray(body.instruments);
      const normalizedSongs = normalizeStringArray(body.songs);
      const normalizedUnavailableDates = normalizeDateArray(body.unavailableDates);

      if (normalizedArtistName) updateArtist.artistName = normalizedArtistName;
      if (body.description !== undefined) updateArtist.description = normalizedDescription ?? "";
      if (body.profilePicture !== undefined) updateArtist.profilePicture = normalizedProfilePicture ?? "";
      if (body.bandSize !== undefined) updateArtist.bandSize = normalizedBandSize ?? "";
      if (body.musicAccompaniment !== undefined) updateArtist.musicAccompaniment = normalizedMusicAccompaniment;
      if (body.location !== undefined) {
        // Die Koordinaten werden nur gesetzt, wenn tatsächlich ein Ort vorliegt.
        const nextLocation = typeof body.location === "string" ? body.location.trim() : "";
        updateArtist.location = nextLocation;

        if (nextLocation.length === 0) {
          unsetArtist.latitude = "";
          unsetArtist.longitude = "";
        } else if (typeof body.latitude === "number" && typeof body.longitude === "number") {
          updateArtist.latitude = body.latitude;
          updateArtist.longitude = body.longitude;
        }
      }

      if (body.radius !== undefined) updateArtist.radius = normalizedRadius ?? "";
      if (body.soundcloudUrl !== undefined) updateArtist.soundcloudUrl = normalizedSoundcloudUrl ?? "";
      if (body.spotifyUrl !== undefined) updateArtist.spotifyUrl = normalizedSpotifyUrl ?? "";
      if (body.youtubeUrl !== undefined) updateArtist.youtubeUrl = normalizedYoutubeUrl ?? "";
      if (body.youtubeUrl2 !== undefined) updateArtist.youtubeUrl2 = normalizedYoutubeUrl2 ?? "";
      if (body.technicalInfo !== undefined) updateArtist.technicalInfo = normalizedTechnicalInfo ?? "";
      if (body.galleryImages !== undefined) updateArtist.galleryImages = normalizedGalleryImages;
      if (body.genre !== undefined) updateArtist.genre = normalizedGenre;
      if (body.instruments !== undefined) updateArtist.instruments = normalizedInstruments;
      if (body.songs !== undefined) updateArtist.songs = normalizedSongs;
      if (body.unavailableDates !== undefined) updateArtist.unavailableDates = normalizedUnavailableDates;

      await db.collection("artists").updateOne(
        { userId: user._id.toString() },
        {
          $set: updateArtist,
          ...(Object.keys(unsetArtist).length > 0 ? { $unset: unsetArtist } : {}),
        }
      );
    }

    if (user.role === "customer" && (body.address || body.bookingDefaults || body.phone !== undefined)) {
      // Kundenprofile speichern Kontakt- und Standardwerte separat, damit spätere Buchungen vorausgefüllt werden können.
      const phone = normalizeOptionalString(body.phone) ?? "";
      const address = {
        street: normalizeOptionalString(body.address?.street) ?? "",
        zip: normalizeOptionalString(body.address?.zip) ?? "",
        city: normalizeOptionalString(body.address?.city) ?? "",
      };

      const bookingDefaults = {
        startDate: normalizeOptionalString(body.bookingDefaults?.startDate) ?? "",
        startTime: normalizeOptionalString(body.bookingDefaults?.startTime) ?? "",
        endDate: normalizeOptionalString(body.bookingDefaults?.endDate) ?? "",
        endTime: normalizeOptionalString(body.bookingDefaults?.endTime) ?? "",
        locationName: normalizeOptionalString(body.bookingDefaults?.locationName) ?? "",
        locationStreet: normalizeOptionalString(body.bookingDefaults?.locationStreet) ?? "",
        locationZip: normalizeOptionalString(body.bookingDefaults?.locationZip) ?? "",
        locationCity: normalizeOptionalString(body.bookingDefaults?.locationCity) ?? "",
        plannerEmail: normalizeOptionalString(body.bookingDefaults?.plannerEmail) ?? "",
        venueEmail: normalizeOptionalString(body.bookingDefaults?.venueEmail) ?? "",
        estimatedBudget: normalizeOptionalString(body.bookingDefaults?.estimatedBudget) ?? "",
        additionalInfo: normalizeOptionalString(body.bookingDefaults?.additionalInfo) ?? "",
      };

      await db.collection("customers").updateOne(
        { userId: user._id.toString() },
        {
          $set: {
            phone,
            address,
            bookingDefaults,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}