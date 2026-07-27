/**
 * Seitenkomponente fuer die Route My Requests.
 * Die Datei setzt die sichtbare UI fuer diese Seite zusammen und verbindet Darstellung mit den benoetigten Daten- und Interaktionsfluesen.
 */
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildArtistPath } from "@/lib/artist-url";
import { getDb } from "@/lib/mongodb";
import { findSessionByToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { PAGE_FRAME, SiteFooter, SiteHeader } from "../components/site-shell";
import { RequestsView } from "./requests-view";

type RequestStatus = "pending" | "accepted" | "declined";

type RequestListItem = {
  id: string;
  counterpartName: string;
  counterpartLabel: string;
  status: RequestStatus;
  artistId: string;
  reviewHref: string;
  canWriteReview: boolean;
  reviewWritten: boolean;
  createdAtLabel: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    street: string;
    zip: string;
    city: string;
  };
  event: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    locationName: string;
    locationStreet: string;
    locationZip: string;
    locationCity: string;
    plannerEmail: string;
    venueEmail: string;
    estimatedBudget: string;
  };
  modules: string[];
  additionalInfo: string;
};

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function formatDate(value: unknown) {
  if (!(value instanceof Date)) {
    return "Unbekannt";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function resolveStatus(bookingRequest: Record<string, unknown>): RequestStatus {
  const accepted = bookingRequest.accepted;
  const hasDecisionTimestamp = bookingRequest.decidedAt instanceof Date;

  if (accepted === true) {
    return "accepted";
  }

  if (accepted === false && hasDecisionTimestamp) {
    return "declined";
  }

  return "pending";
}

function mapRequest(
  bookingRequest: Record<string, unknown>,
  counterpartName: string,
  counterpartLabel: string,
  options?: {
    artistId?: string;
    reviewHref?: string;
    canWriteReview?: boolean;
    reviewWritten?: boolean;
  }
): RequestListItem {
  const contactRaw =
    bookingRequest.contact && typeof bookingRequest.contact === "object"
      ? (bookingRequest.contact as Record<string, unknown>)
      : {};
  const eventRaw =
    bookingRequest.event && typeof bookingRequest.event === "object"
      ? (bookingRequest.event as Record<string, unknown>)
      : {};

  const contactName = [normalizeOptionalString(contactRaw.firstName), normalizeOptionalString(contactRaw.lastName)]
    .filter((entry) => entry.length > 0)
    .join(" ");

  return {
    id: bookingRequest._id instanceof ObjectId ? bookingRequest._id.toString() : "",
    counterpartName,
    counterpartLabel,
    status: resolveStatus(bookingRequest),
    artistId: options?.artistId ?? "",
    reviewHref: options?.reviewHref ?? "",
    canWriteReview: Boolean(options?.canWriteReview),
    reviewWritten: Boolean(options?.reviewWritten),
    createdAtLabel: formatDate(bookingRequest.createdAt),
    contact: {
      name: contactName || "Unbekannt",
      email: normalizeOptionalString(contactRaw.email) || "-",
      phone: normalizeOptionalString(contactRaw.phone) || "-",
      street: normalizeOptionalString(contactRaw.street) || "-",
      zip: normalizeOptionalString(contactRaw.zip) || "-",
      city: normalizeOptionalString(contactRaw.city) || "-",
    },
    event: {
      startDate: normalizeOptionalString(eventRaw.startDate) || "-",
      startTime: normalizeOptionalString(eventRaw.startTime) || "-",
      endDate: normalizeOptionalString(eventRaw.endDate) || "-",
      endTime: normalizeOptionalString(eventRaw.endTime) || "-",
      locationName: normalizeOptionalString(eventRaw.locationName) || "-",
      locationStreet: normalizeOptionalString(eventRaw.locationStreet) || "-",
      locationZip: normalizeOptionalString(eventRaw.locationZip) || "-",
      locationCity: normalizeOptionalString(eventRaw.locationCity) || "-",
      plannerEmail: normalizeOptionalString(eventRaw.plannerEmail),
      venueEmail: normalizeOptionalString(eventRaw.venueEmail),
      estimatedBudget: normalizeOptionalString(eventRaw.estimatedBudget) || "-",
    },
    modules: normalizeStringList(bookingRequest.modules),
    additionalInfo: normalizeOptionalString(bookingRequest.additionalInfo),
  };
}

export default async function MyRequestsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const db = await getDb();
  const session = await findSessionByToken(db, token);

  if (!session || !ObjectId.isValid(session.userId)) {
    redirect("/login");
  }

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });

  if (!user || (user.role !== "artist" && user.role !== "customer")) {
    redirect("/login");
  }

  const isArtist = user.role === "artist";

  const bookingRequests = await db
    .collection("bookingRequests")
    .find(isArtist ? { artistUserId: user._id.toString() } : { customerUserId: user._id.toString() })
    .sort({ createdAt: -1 })
    .toArray();

  const artistIds = Array.from(
    new Set(
      bookingRequests
        .map((request) => (typeof request.artistId === "string" ? request.artistId : ""))
        .filter((artistId) => ObjectId.isValid(artistId))
    )
  );

  const artists = artistIds.length
    ? await db
        .collection("artists")
        .find({ _id: { $in: artistIds.map((artistId) => new ObjectId(artistId)) } })
        .project({ artistName: 1 })
        .toArray()
    : [];

  const artistNames = new Map(
    artists.map((artist) => {
      const artistName = typeof artist.artistName === "string" ? artist.artistName.trim() : "";
      return [artist._id.toString(), artistName || "Unbekannter Künstler"] as const;
    })
  );

  const customerReviewArtistIds = !isArtist
    ? Array.from(
        new Set(
          bookingRequests
            .filter((request) => request.accepted === true)
            .map((request) => (typeof request.artistId === "string" ? request.artistId : ""))
            .filter((artistId) => artistId.length > 0)
        )
      )
    : [];

  const existingReviews = !isArtist && customerReviewArtistIds.length > 0
    ? await db
        .collection("reviews")
        .find({
          customerId: user._id.toString(),
          artistId: { $in: customerReviewArtistIds },
        })
        .project({ artistId: 1 })
        .toArray()
    : [];

  const reviewedArtistIds = new Set(
    existingReviews
      .map((review) => (typeof review.artistId === "string" ? review.artistId : ""))
      .filter((artistId) => artistId.length > 0)
  );

  const requestItems: RequestListItem[] = bookingRequests
    .map((request) => {
      const artistName = artistNames.get(typeof request.artistId === "string" ? request.artistId : "") || "Unbekannter Künstler";
      const contactRaw =
        request.contact && typeof request.contact === "object"
          ? (request.contact as Record<string, unknown>)
          : {};
      const customerName = [normalizeOptionalString(contactRaw.firstName), normalizeOptionalString(contactRaw.lastName)]
        .filter((entry) => entry.length > 0)
        .join(" ");

      const counterpartName = isArtist ? customerName || "Unbekannter Kunde" : artistName;
      const counterpartLabel = isArtist ? "Kunde" : "Künstler";
      const requestArtistId = typeof request.artistId === "string" ? request.artistId : "";
      const isAcceptedForCustomer = !isArtist && request.accepted === true;
      const reviewWritten = !isArtist && requestArtistId.length > 0 && reviewedArtistIds.has(requestArtistId);
      const reviewHref = !isArtist && requestArtistId.length > 0
        ? `${buildArtistPath(requestArtistId, artistName)}/rezension-schreiben`
        : "";

      return mapRequest(request as Record<string, unknown>, counterpartName, counterpartLabel, {
        artistId: requestArtistId,
        reviewHref,
        canWriteReview: isAcceptedForCustomer && !reviewWritten,
        reviewWritten,
      });
    })
    .filter((item) => item.id.length > 0);

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f5f5] text-black">
      <SiteHeader activeHref={null} />

      <section className={`flex-1 py-16 ${PAGE_FRAME}`}>
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Meine Anfragen</h1>
          <p className="mt-4 text-base leading-7 text-black/60 sm:text-lg sm:leading-8">
            {isArtist
              ? "Hier findest du alle eingegangenen Anfragen und kannst sie annehmen oder ablehnen."
              : "Hier findest du alle von dir gesendeten Anfragen und ihren aktuellen Status."}
          </p>

          {isArtist ? (
            <p className="mt-3 rounded-[18px] border border-black/10 bg-black/[0.04] px-4 py-3 text-sm text-black/65">
              Schon gewusst? Erst wenn du eine Anfrage angenommen hast, kann dir der Kunde auch eine Rezension hinterlassen.
            </p>
          ) : null}

          <RequestsView role={isArtist ? "artist" : "customer"} initialRequests={requestItems} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
