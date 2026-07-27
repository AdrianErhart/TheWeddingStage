/**
 * Route-Handler für den Endpoint `/session`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";
import { SESSION_COOKIE_NAME, findSessionByToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      // Ohne Session-Cookie gibt es keinen angemeldeten Nutzer.
      return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
    }

    const db = await getDb();
    const session = await findSessionByToken(db, token);

    if (!session || !ObjectId.isValid(session.userId)) {
      return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
    }

    const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
    const artist = user?.role === "artist"
      ? await db.collection("artists").findOne({ userId: user._id.toString() })
      : null;
    // Künstler sehen offene Buchungsanfragen, Kunden sehen offene Rezensionshinweise.
    const pendingRequestsCount = user?.role === "artist"
      ? await db.collection("bookingRequests").countDocuments({
          artistUserId: user._id.toString(),
          accepted: { $ne: true },
          decidedAt: null,
        })
      : 0;
    const pendingReviewsCount = user?.role === "customer"
      ? await db.collection("bookingRequests").aggregate([
          {
            $match: {
              customerUserId: user._id.toString(),
              accepted: true,
            },
          },
          {
            $lookup: {
              from: "reviews",
              let: { artistId: "$artistId", customerId: "$customerUserId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$artistId", "$$artistId"] },
                        { $eq: ["$customerId", "$$customerId"] },
                      ],
                    },
                  },
                },
              ],
              as: "existingReview",
            },
          },
          {
            $match: {
              existingReview: { $size: 0 },
            },
          },
          {
            $group: {
              _id: "$artistId",
            },
          },
          {
            $count: "count",
          },
        ]).toArray().then((rows) => rows[0]?.count ?? 0)
      : 0;
    const pendingNotificationsCount = user?.role === "artist" ? pendingRequestsCount : pendingReviewsCount;

    if (!user) {
      // Ungültige oder abgelaufene Sessions werden wie nicht angemeldet behandelt.
      return NextResponse.json({ ok: true, authenticated: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        ok: true,
        authenticated: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        artistId: artist?._id.toString() ?? null,
        artistName: typeof artist?.artistName === "string" ? artist.artistName : null,
        profilePicture: typeof artist?.profilePicture === "string" ? artist.profilePicture : null,
        pendingRequestsCount,
        pendingReviewsCount,
        pendingNotificationsCount,
        expiresAt: session.expiresAt.toISOString(),
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