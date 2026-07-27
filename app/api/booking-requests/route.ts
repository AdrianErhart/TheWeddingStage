/**
 * Route-Handler für den Endpoint `/booking-requests`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { getDb } from "@/lib/mongodb";
import { getSiteOrigin } from "@/lib/site-url";
import { SESSION_COOKIE_NAME, findSessionByToken } from "@/lib/session";

type BookingRequestBody = {
  artistId?: string;
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
  };
  event?: {
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
  };
  additionalInfo?: string;
  modules?: string[];
  saveToProfile?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\s/-]{6,25}$/;
const BUDGET_PATTERN = /^\d{1,7}([.,]\d{1,2})?(\s?(€|EUR))?$/i;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeModuleList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0)
    )
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const fromName = process.env.SMTP_FROM_NAME;

  if (!host || !portValue || !user || !pass) {
    return null;
  }

  const port = Number.parseInt(portValue, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  const fromAddress = from?.trim() || user;
  const displayName = fromName?.trim() || "TheWeddingStage";
  const formattedFrom = fromAddress.includes("<")
    ? fromAddress
    : `${displayName} <${fromAddress}>`;

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from: formattedFrom,
  };
}

function withEmailShell({
  websiteOrigin,
  innerHtml,
  ctaHref,
  ctaLabel,
}: {
  websiteOrigin: string;
  innerHtml: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return `<div style="margin:0;padding:0;background:#efede9;font-family:Arial,Helvetica,sans-serif;color:#111111;"><div style="max-width:760px;margin:0 auto;padding:24px 16px 34px;">${innerHtml}<div style="margin-top:18px;text-align:center;"><a href="${ctaHref}" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #111111;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${ctaLabel}</a></div></div></div>`;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
    }

    // Vor jeder weiteren Prüfung wird die Session gegen die Datenbank validiert.
    const db = await getDb();
    const session = await findSessionByToken(db, token);

    if (!session || !ObjectId.isValid(session.userId)) {
      return NextResponse.json({ ok: false, message: "Session ungültig." }, { status: 401 });
    }

    const customerUser = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });

    if (!customerUser || customerUser.role !== "customer") {
      return NextResponse.json({ ok: false, message: "Nur Kunden können Anfragen senden." }, { status: 403 });
    }

    const accountEmail = typeof customerUser.email === "string" ? customerUser.email.trim().toLowerCase() : "";

    if (!EMAIL_PATTERN.test(accountEmail)) {
      return NextResponse.json({ ok: false, message: "Account-E-Mail ungültig." }, { status: 400 });
    }

    const body = (await request.json()) as BookingRequestBody;
    const artistId = normalizeOptionalString(body.artistId);

    if (!ObjectId.isValid(artistId)) {
      return NextResponse.json({ ok: false, message: "Ungültiger Künstler." }, { status: 400 });
    }

    const artist = await db.collection("artists").findOne({ _id: new ObjectId(artistId) });

    if (!artist || typeof artist.userId !== "string" || !ObjectId.isValid(artist.userId)) {
      return NextResponse.json({ ok: false, message: "Künstler nicht gefunden." }, { status: 404 });
    }

    const artistUser = await db.collection("users").findOne({ _id: new ObjectId(artist.userId) });

    if (!artistUser || typeof artistUser.email !== "string" || !EMAIL_PATTERN.test(artistUser.email)) {
      return NextResponse.json({ ok: false, message: "Künstler-E-Mail nicht verfügbar." }, { status: 500 });
    }

    const contact = {
      firstName: normalizeOptionalString(body.contact?.firstName),
      lastName: normalizeOptionalString(body.contact?.lastName),
      email: accountEmail,
      phone: normalizeOptionalString(body.contact?.phone),
      street: normalizeOptionalString(body.contact?.street),
      zip: normalizeOptionalString(body.contact?.zip),
      city: normalizeOptionalString(body.contact?.city),
    };

    const event = {
      startDate: normalizeOptionalString(body.event?.startDate),
      startTime: normalizeOptionalString(body.event?.startTime),
      endDate: normalizeOptionalString(body.event?.endDate),
      endTime: normalizeOptionalString(body.event?.endTime),
      locationName: normalizeOptionalString(body.event?.locationName),
      locationStreet: normalizeOptionalString(body.event?.locationStreet),
      locationZip: normalizeOptionalString(body.event?.locationZip),
      locationCity: normalizeOptionalString(body.event?.locationCity),
      plannerEmail: normalizeOptionalString(body.event?.plannerEmail),
      venueEmail: normalizeOptionalString(body.event?.venueEmail),
      estimatedBudget: normalizeOptionalString(body.event?.estimatedBudget),
    };

    const additionalInfo = normalizeOptionalString(body.additionalInfo);
    const modules = normalizeModuleList(body.modules);
    const saveToProfile = Boolean(body.saveToProfile);

    if (contact.phone && !PHONE_PATTERN.test(contact.phone)) {
      return NextResponse.json({ ok: false, message: "Bitte gib eine gültige Telefonnummer ein." }, { status: 400 });
    }

    if (event.estimatedBudget && !BUDGET_PATTERN.test(event.estimatedBudget)) {
      return NextResponse.json(
        { ok: false, message: "Bitte gib ein gültiges Budget ein (z. B. 1500 oder 1500 EUR)." },
        { status: 400 }
      );
    }

    if (!contact.firstName || !contact.lastName || !EMAIL_PATTERN.test(contact.email)) {
      return NextResponse.json({ ok: false, message: "Bitte gib gültige Kontaktdaten an." }, { status: 400 });
    }

    if (!event.startDate || !event.startTime || !event.endDate || !event.endTime) {
      return NextResponse.json({ ok: false, message: "Bitte gib Start- und Endzeit vollständig an." }, { status: 400 });
    }

    if (modules.length === 0) {
      return NextResponse.json({ ok: false, message: "Bitte wähle mindestens ein Modul aus." }, { status: 400 });
    }

    const createdAt = new Date();

    const insertResult = await db.collection("bookingRequests").insertOne({
      artistId,
      customerId: customerUser._id.toString(),
      customerUserId: customerUser._id.toString(),
      artistUserId: artist.userId,
      contact,
      event,
      additionalInfo,
      modules,
      accepted: null,
      decidedAt: null,
      createdAt,
      updatedAt: createdAt,
    });

    if (saveToProfile) {
      // Gespeicherte Kontaktdaten sollen spätere Anfragen vereinfachen und werden deshalb optional ins Profil übernommen.
      await db.collection("users").updateOne(
        { _id: customerUser._id },
        {
          $set: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            updatedAt: new Date(),
          },
        }
      );

      await db.collection("customers").updateOne(
        { userId: customerUser._id.toString() },
        {
          $set: {
            phone: contact.phone,
            address: {
              street: contact.street,
              zip: contact.zip,
              city: contact.city,
            },
            bookingDefaults: {
              startDate: event.startDate,
              startTime: event.startTime,
              endDate: event.endDate,
              endTime: event.endTime,
              locationName: event.locationName,
              locationStreet: event.locationStreet,
              locationZip: event.locationZip,
              locationCity: event.locationCity,
              plannerEmail: event.plannerEmail,
              venueEmail: event.venueEmail,
              estimatedBudget: event.estimatedBudget,
              additionalInfo,
            },
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const mailConfig = getMailerConfig();

    if (mailConfig) {
      const moduleListHtml = modules
        .map((moduleLabel) => `<li style=\"margin:0 0 6px;\">${escapeHtml(moduleLabel)}</li>`)
        .join("");
      const contactName = `${contact.firstName} ${contact.lastName}`.trim();
      const artistDisplayName =
        typeof artist.artistName === "string" && artist.artistName.trim().length > 0
          ? artist.artistName.trim()
          : "Künstler";

      const safeContactName = escapeHtml(contactName);
      const safeArtistName = escapeHtml(artistDisplayName);
      const safeContactEmail = escapeHtml(contact.email);
      const safeContactStreet = escapeHtml(contact.street);
      const safeContactZip = escapeHtml(contact.zip);
      const safeContactCity = escapeHtml(contact.city);
      const safeStartDate = escapeHtml(event.startDate);
      const safeStartTime = escapeHtml(event.startTime);
      const safeEndDate = escapeHtml(event.endDate);
      const safeEndTime = escapeHtml(event.endTime);
      const safeLocationStreet = escapeHtml(event.locationStreet);
      const safeLocationZip = escapeHtml(event.locationZip);
      const safeLocationCity = escapeHtml(event.locationCity);
      const safePlannerEmail = event.plannerEmail ? escapeHtml(event.plannerEmail) : "-";
      const safeVenueEmail = event.venueEmail ? escapeHtml(event.venueEmail) : "-";
      const safeAdditionalInfo = additionalInfo
        ? escapeHtml(additionalInfo).replace(/\n/g, "<br>")
        : "-";

      const artistIntroText = `Neue Anfrage von ${contact.firstName} ${contact.lastName}`;
      const customerIntroText = `Anfrage an ${artistDisplayName} gesendet`;
      const artistIntroHtml = `Du hast eine neue Anfrage von <strong>${safeContactName}</strong> erhalten.`;
      const customerIntroHtml = `Du hast eine Anfrage an <strong>${safeArtistName}</strong> gesendet.`;
      const websiteOrigin = getSiteOrigin(request);
      const requestsHref = `${websiteOrigin}/my-requests`;
      const browseHref = `${websiteOrigin}/browse-artists`;

      const mailText = [
        artistIntroText,
        "Logge dich ein, um die Anfrage anzunehmen oder abzulehnen.",
        `Anfragen verwalten: ${requestsHref}`,
        "",
        `Name: ${contact.firstName} ${contact.lastName}`,
        `E-Mail: ${contact.email}`,
        `Adresse: ${contact.street}, ${contact.zip} ${contact.city}`,
        "",
        `Start: ${event.startDate} ${event.startTime}`,
        `Ende: ${event.endDate} ${event.endTime}`,
        `Location: ${event.locationStreet}, ${event.locationZip} ${event.locationCity}`,
        `Planer-Mail: ${event.plannerEmail || "-"}`,
        `Location-Mail: ${event.venueEmail || "-"}`,
        "",
        `Module: ${modules.join(", ")}`,
        "",
        "Zusatzinformationen:",
        additionalInfo || "-",
      ].join("\n");

      const mailHtml = `<div style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,Helvetica,sans-serif;color:#111111;"><div style="max-width:680px;margin:0 auto;padding:32px 16px;"><div style="background:#111111;border-radius:28px;padding:28px 28px 24px;color:#ffffff;box-shadow:0 18px 40px rgba(0,0,0,0.14);"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);">TheWeddingStage</p><h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">Neue Anfrage erhalten</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">${artistIntroHtml}</p></div><div style="margin-top:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:28px;padding:24px 28px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Kontaktdaten</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">${safeContactName}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">${safeContactEmail}</p><p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#222;">${safeContactStreet}, ${safeContactZip} ${safeContactCity}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Veranstaltung</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Start: ${safeStartDate} ${safeStartTime}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Ende: ${safeEndDate} ${safeEndTime}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Location: ${safeLocationStreet}, ${safeLocationZip} ${safeLocationCity}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Hochzeitsplaner: ${safePlannerEmail}</p><p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#222;">Location-Mail: ${safeVenueEmail}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Gewählte Module</p><ul style="margin:0 0 14px;padding-left:18px;font-size:16px;line-height:1.6;color:#222;">${moduleListHtml}</ul><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Zusatzinformationen</p><div style="font-size:16px;line-height:1.8;color:#222;white-space:pre-wrap;word-break:break-word;">${safeAdditionalInfo}</div></div></div></div>`;

      const transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port,
        secure: mailConfig.secure,
        auth: mailConfig.auth,
      });

      await transporter.sendMail({
        from: mailConfig.from,
        to: artistUser.email,
        replyTo: contact.email,
        subject: "TheWeddingStage - Neue Anfrage erhalten",
        text: mailText,
        html: `<div style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,Helvetica,sans-serif;color:#111111;"><div style="max-width:680px;margin:0 auto;padding:32px 16px;"><div style="background:#111111;border-radius:28px;padding:28px 28px 24px;color:#ffffff;box-shadow:0 18px 40px rgba(0,0,0,0.14);"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);">TheWeddingStage</p><h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">Neue Anfrage erhalten</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">${artistIntroHtml}</p></div><div style="margin-top:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:28px;padding:24px 28px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Kontaktdaten</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">${safeContactName}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">${safeContactEmail}</p><p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#222;">${safeContactStreet}, ${safeContactZip} ${safeContactCity}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Veranstaltung</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Start: ${safeStartDate} ${safeStartTime}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Ende: ${safeEndDate} ${safeEndTime}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Location: ${safeLocationStreet}, ${safeLocationZip} ${safeLocationCity}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Hochzeitsplaner: ${safePlannerEmail}</p><p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#222;">Location-Mail: ${safeVenueEmail}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Module</p><ul style="margin:0 0 14px 18px;padding:0;font-size:16px;line-height:1.7;color:#222;">${moduleListHtml}</ul><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Zusatzinformationen</p><p style="margin:0;font-size:16px;line-height:1.7;color:#222;white-space:pre-line;">${safeAdditionalInfo}</p></div><div style="margin-top:18px;text-align:center;"><a href="${requestsHref}" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #111111;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Jetzt einloggen und Anfrage bearbeiten</a></div></div></div>`,
      });

      await transporter.sendMail({
        from: mailConfig.from,
        to: contact.email,
        replyTo: artistUser.email,
        subject: "TheWeddingStage - Anfrage gesendet",
        text: mailText
          .replace(artistIntroText, customerIntroText)
          .replace("Logge dich ein, um die Anfrage anzunehmen oder abzulehnen.", "Finde jetzt weitere Künstler für deine Hochzeit.")
          .replace(`Anfragen verwalten: ${requestsHref}`, `Weitere Künstler: ${browseHref}`),
        html: `<div style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,Helvetica,sans-serif;color:#111111;"><div style="max-width:680px;margin:0 auto;padding:32px 16px;"><div style="background:#111111;border-radius:28px;padding:28px 28px 24px;color:#ffffff;box-shadow:0 18px 40px rgba(0,0,0,0.14);"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);">TheWeddingStage</p><h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">Anfrage gesendet</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">${customerIntroHtml}</p></div><div style="margin-top:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:28px;padding:24px 28px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Kontaktdaten</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">${safeContactName}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">${safeContactEmail}</p><p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#222;">${safeContactStreet}, ${safeContactZip} ${safeContactCity}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Veranstaltung</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Start: ${safeStartDate} ${safeStartTime}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Ende: ${safeEndDate} ${safeEndTime}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Location: ${safeLocationStreet}, ${safeLocationZip} ${safeLocationCity}</p><p style="margin:0 0 4px;font-size:16px;line-height:1.7;color:#222;">Hochzeitsplaner: ${safePlannerEmail}</p><p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#222;">Location-Mail: ${safeVenueEmail}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Module</p><ul style="margin:0 0 14px 18px;padding:0;font-size:16px;line-height:1.7;color:#222;">${moduleListHtml}</ul><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Zusatzinformationen</p><p style="margin:0;font-size:16px;line-height:1.7;color:#222;white-space:pre-line;">${safeAdditionalInfo}</p></div><div style="margin-top:18px;text-align:center;"><a href="${browseHref}" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #111111;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Nach weiteren Künstlern suchen</a></div></div></div>`,
      });
    }

    return NextResponse.json({ ok: true, id: insertResult.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
