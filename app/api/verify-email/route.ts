/**
 * Route-Handler für den Endpoint `/verify-email`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

import { getDb } from "@/lib/mongodb";

function hashToken(token: string) {
  // Sicherheitsprinzip: Token niemals im Klartext vergleichen oder speichern.
  return crypto.createHash("sha256").update(token).digest("hex");
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return redirectTo(request, "/login?verified=0");
    }

    const db = await getDb();
    const tokenHash = hashToken(token);
    const now = new Date();

    const user = await db.collection("users").findOne({ emailVerificationTokenHash: tokenHash });

    if (!user) {
      return redirectTo(request, "/login?verified=0");
    }

    // Idempotentes Verhalten: Bereits bestätigte Nutzer werden sauber auf Erfolg umgeleitet.
    if (user.emailVerified === true) {
      return redirectTo(request, "/login?verified=1");
    }

    // Nach erfolgreicher Bestätigung werden alte Tokenfelder entfernt, um Replay zu verhindern.
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: now,
          updatedAt: now,
        },
        $unset: {
          emailVerificationTokenHash: "",
          emailVerificationExpiresAt: "",
        },
      }
    );

    return redirectTo(request, "/login?verified=1");
  } catch {
    return redirectTo(request, "/login?verified=0");
  }
}
