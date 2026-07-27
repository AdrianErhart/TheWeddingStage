/**
 * Route-Handler für den Endpoint `/login`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSession } from "@/lib/session";
import { buildArtistPath } from "@/lib/artist-url";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const normalizedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json({ ok: false, message: "E-Mail und Passwort sind erforderlich" }, { status: 400 });
    }

    // Login wird über die User-Collection aufgelöst; die E-Mail wird vorher normalisiert.
    const db = await getDb();
    const user = await db.collection("users").findOne({ email: normalizedEmail });

    if (!user || typeof user.password !== "string") {
      return NextResponse.json({ ok: false, message: "Ungültige E-Mail oder ungültiges Passwort" }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json({ ok: false, message: "Ungültige E-Mail oder ungültiges Passwort" }, { status: 401 });
    }

    // Bestehende Alt-Datensätze ohne Feld gelten als verifiziert, explizit false blockiert den Login.
    const isEmailVerified = user.emailVerified !== false;
    if (!isEmailVerified) {
      return NextResponse.json(
        {
          ok: false,
          message: "Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe dafür dein Postfach.",
        },
        { status: 403 }
      );
    }

    const artist = user.role === "artist"
      ? await db.collection("artists").findOne({ userId: user._id.toString() })
      : null;
    // Das Welcome-Popup soll nur einmal erscheinen; null markiert „noch nicht gesehen“.
    const shouldShowWelcomePopup = Object.prototype.hasOwnProperty.call(user, "welcomePopupSeenAt")
      && user.welcomePopupSeenAt === null;

    if (shouldShowWelcomePopup) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(user._id) },
        {
          $set: {
            welcomePopupSeenAt: new Date(),
          },
        }
      );
    }

    // Serverseitige Session erzeugen und nur den Token im HttpOnly-Cookie ausliefern.
    const sessionToken = await createSession(db, user._id.toString());

    const response = NextResponse.json(
      {
        ok: true,
        id: user._id.toString(),
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        artistId: artist?._id.toString() ?? null,
        artistName: typeof artist?.artistName === "string" ? artist.artistName : null,
        showWelcomePopup: shouldShowWelcomePopup,
        welcomeProfileHref:
          user.role === "artist" && artist
            ? `${buildArtistPath(artist._id.toString(), typeof artist.artistName === "string" ? artist.artistName : "")}?edit=true`
            : "/profile",
      },
      { status: 200 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}