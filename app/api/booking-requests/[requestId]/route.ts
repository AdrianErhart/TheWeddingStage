/**
 * Route-Handler für den Endpoint `/booking-requests/[requestId]`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";

type UpdateBookingRequestBody = {
  decision?: "accepted" | "declined";
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    const db = await getDb();
    const session = await findSessionByToken(db, token);

    if (!session || !ObjectId.isValid(session.userId)) {
      return NextResponse.json({ ok: false, message: "Session ungültig." }, { status: 401 });
    }

    const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });

    if (!user || user.role !== "artist") {
      return NextResponse.json({ ok: false, message: "Nur Künstler können Anfragen bearbeiten." }, { status: 403 });
    }

    const { requestId } = await params;
    if (!ObjectId.isValid(requestId)) {
      return NextResponse.json({ ok: false, message: "Ungültige Anfrage-ID." }, { status: 400 });
    }

    const body = (await request.json()) as UpdateBookingRequestBody;

    if (body.decision !== "accepted" && body.decision !== "declined") {
      return NextResponse.json({ ok: false, message: "Ungültige Entscheidung." }, { status: 400 });
    }

    const bookingRequest = await db.collection("bookingRequests").findOne({ _id: new ObjectId(requestId) });

    if (!bookingRequest) {
      return NextResponse.json({ ok: false, message: "Anfrage nicht gefunden." }, { status: 404 });
    }

    if (bookingRequest.artistUserId !== user._id.toString()) {
      // Ein Künstler darf nur die eigenen Anfragen annehmen oder ablehnen.
      return NextResponse.json({ ok: false, message: "Keine Berechtigung für diese Anfrage." }, { status: 403 });
    }

    const accepted = body.decision === "accepted";

    // Entscheidung und Zeitstempel werden gemeinsam gespeichert, damit der Status eindeutig nachvollziehbar bleibt.
    await db.collection("bookingRequests").updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          accepted,
          decidedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      {
        ok: true,
        requestId,
        decision: body.decision,
        accepted,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
