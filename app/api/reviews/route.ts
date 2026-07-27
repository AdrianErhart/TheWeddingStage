/**
 * Route-Handler für den Endpoint `/reviews`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";

const MAX_REVIEW_TITLE_LENGTH = 120;
const MAX_REVIEW_DESCRIPTION_LENGTH = 1200;

type CreateReviewBody = {
  customerId: string;
  customerName?: string;
  artistId: string;
  title?: string;
  description?: string;
  stars: number;
  date?: string;
};

type ReviewMutationBody = {
  customerId: string;
  artistId: string;
  title?: string;
  description?: string;
  stars?: number;
};

async function getAuthenticatedCustomer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const db = await getDb();
  const session = await findSessionByToken(db, token);

  if (!session || !ObjectId.isValid(session.userId)) {
    return null;
  }

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });

  if (!user || user.role !== "customer") {
    return null;
  }

  return { db, user };
}

async function hasAcceptedBookingRequest(db: Awaited<ReturnType<typeof getDb>>, customerUserId: string, artistId: string) {
  // Rezensionen sind nur erlaubt, wenn vorher mindestens eine Anfrage akzeptiert wurde.
  const acceptedRequest = await db.collection("bookingRequests").findOne({
    customerUserId,
    artistId,
    accepted: true,
  });

  return Boolean(acceptedRequest);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, customerName = "", artistId, title = "", description = "", stars, date } = body as CreateReviewBody;
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    const auth = await getAuthenticatedCustomer();

    if (!auth) {
      return NextResponse.json({ ok: false, message: "Bitte melde dich als Kunde an." }, { status: 401 });
    }

    if (customerId && customerId !== auth.user._id.toString()) {
      return NextResponse.json({ ok: false, message: "Du kannst nur deine eigene Rezension speichern." }, { status: 403 });
    }

    if (!customerId || !artistId || typeof stars !== "number" || !normalizedTitle || !normalizedDescription) {
      return NextResponse.json(
        { ok: false, message: "customerId, artistId, title, description und stars sind Pflichtfelder" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ ok: false, message: "Die Sternebewertung muss zwischen 1 und 5 liegen." }, { status: 400 });
    }

    if (normalizedTitle.length > MAX_REVIEW_TITLE_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Der Titel darf maximal ${MAX_REVIEW_TITLE_LENGTH} Zeichen haben.` },
        { status: 400 }
      );
    }

    if (normalizedDescription.length > MAX_REVIEW_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Die Rezension darf maximal ${MAX_REVIEW_DESCRIPTION_LENGTH} Zeichen haben.` },
        { status: 400 }
      );
    }

    const db = auth.db;
    const customerKey = auth.user._id.toString();

    if (!(await hasAcceptedBookingRequest(db, customerKey, artistId))) {
      return NextResponse.json(
        { ok: false, message: "Du kannst erst nach einer angenommenen Anfrage eine Rezension schreiben." },
        { status: 403 }
      );
    }

    const existingReview = await db.collection("reviews").findOne({ customerId: customerKey, artistId });

    if (existingReview) {
      // Doppeltes Anlegen wird verhindert, damit jeder Kunde pro Künstler genau eine Rezension hat.
      return NextResponse.json(
        { ok: false, message: "Du hast für diesen Künstler bereits eine Rezension geschrieben." },
        { status: 409 }
      );
    }

    const result = await db.collection("reviews").insertOne({
      customerId: customerKey,
      customerName:
        typeof auth.user.firstName === "string" || typeof auth.user.lastName === "string"
          ? [
              typeof auth.user.firstName === "string" ? auth.user.firstName.trim() : "",
              typeof auth.user.lastName === "string" ? auth.user.lastName.trim() : "",
            ]
              .filter((entry) => entry.length > 0)
              .join(" ") || customerName
          : customerName,
      artistId,
      title: normalizedTitle,
      description: normalizedDescription,
      stars,
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { customerId, artistId, title = "", description = "", stars } = body as ReviewMutationBody;
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    const auth = await getAuthenticatedCustomer();

    if (!auth) {
      return NextResponse.json({ ok: false, message: "Bitte melde dich als Kunde an." }, { status: 401 });
    }

    if (!customerId || customerId !== auth.user._id.toString()) {
      return NextResponse.json({ ok: false, message: "Du kannst nur deine eigene Rezension bearbeiten." }, { status: 403 });
    }

    if (!artistId || typeof stars !== "number" || !normalizedTitle || !normalizedDescription) {
      return NextResponse.json(
        { ok: false, message: "customerId, artistId, title, description und stars sind Pflichtfelder" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ ok: false, message: "Die Sternebewertung muss zwischen 1 und 5 liegen." }, { status: 400 });
    }

    if (normalizedTitle.length > MAX_REVIEW_TITLE_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Der Titel darf maximal ${MAX_REVIEW_TITLE_LENGTH} Zeichen haben.` },
        { status: 400 }
      );
    }

    if (normalizedDescription.length > MAX_REVIEW_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { ok: false, message: `Die Rezension darf maximal ${MAX_REVIEW_DESCRIPTION_LENGTH} Zeichen haben.` },
        { status: 400 }
      );
    }

    const db = auth.db;
    const customerKey = auth.user._id.toString();

    if (!(await hasAcceptedBookingRequest(db, customerKey, artistId))) {
      return NextResponse.json(
        { ok: false, message: "Du kannst erst nach einer angenommenen Anfrage eine Rezension bearbeiten." },
        { status: 403 }
      );
    }

    const review = await db.collection("reviews").findOne({ customerId: customerKey, artistId });

    if (!review) {
      return NextResponse.json({ ok: false, message: "Die Rezension wurde nicht gefunden." }, { status: 404 });
    }

    await db.collection("reviews").updateOne(
      { _id: review._id },
      {
        $set: {
          title: normalizedTitle,
          description: normalizedDescription,
          stars,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { customerId, artistId } = body as ReviewMutationBody;

    const auth = await getAuthenticatedCustomer();

    if (!auth) {
      return NextResponse.json({ ok: false, message: "Bitte melde dich als Kunde an." }, { status: 401 });
    }

    if (!customerId || customerId !== auth.user._id.toString()) {
      return NextResponse.json({ ok: false, message: "Du kannst nur deine eigene Rezension löschen." }, { status: 403 });
    }

    if (!artistId) {
      return NextResponse.json({ ok: false, message: "Künstler-ID ist ein Pflichtfeld" }, { status: 400 });
    }

    const db = auth.db;
    const customerKey = auth.user._id.toString();

    if (!(await hasAcceptedBookingRequest(db, customerKey, artistId))) {
      return NextResponse.json(
        { ok: false, message: "Du kannst nur Rezensionen zu angenommenen Anfragen löschen." },
        { status: 403 }
      );
    }

    const review = await db.collection("reviews").findOne({ customerId: customerKey, artistId });

    if (!review) {
      // Nur vorhandene Rezensionen können gelöscht werden.
      return NextResponse.json({ ok: false, message: "Die Rezension wurde nicht gefunden." }, { status: 404 });
    }

    await db.collection("reviews").deleteOne({ _id: review._id });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
