/**
 * Route-Handler für den Endpoint `/users`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getDb } from "@/lib/mongodb";
import { getSiteOrigin } from "@/lib/site-url";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type CreateUserBody = {
  email: string;
  password: string;
  role: "artist" | "customer";
  firstName?: string;
  lastName?: string;
  artistName?: string;
};

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

  // Fallback: Falls keine explizite Absenderadresse gesetzt ist, wird die SMTP-User-Adresse genutzt.
  const fromAddress = from?.trim() || user;
  const displayName = fromName?.trim() || "TheWeddingStage";
  const formattedFrom = fromAddress.includes("<")
    ? fromAddress
    : `${displayName} <${fromAddress}>`;

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from: formattedFrom,
  };
}

function hashToken(token: string) {
  // Es wird nur der Hash gespeichert, damit geleakte Datenbankeinträge keine gültigen Verifikationslinks enthalten.
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role, firstName = "", lastName = "", artistName = "" } = body as CreateUserBody;

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedFirstName = typeof firstName === "string" ? firstName.trim() : "";
    const normalizedLastName = typeof lastName === "string" ? lastName.trim() : "";
    const normalizedArtistName = typeof artistName === "string" ? artistName.trim() : "";

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password || !role) {
      return NextResponse.json(
        { ok: false, message: "Vorname, Nachname, E-Mail, Passwort und Rolle sind erforderlich" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ ok: false, message: "Ungültige E-Mail-Adresse" }, { status: 400 });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Das Passwort muss mindestens 8 Zeichen lang sein und 1 Kleinbuchstaben, 1 Großbuchstaben, 1 Zahl und 1 Sonderzeichen enthalten",
        },
        { status: 400 }
      );
    }

    if (role === "artist" && !normalizedArtistName) {
      return NextResponse.json(
        { ok: false, message: "Für einen Künstleraccount ist ein Künstlername erforderlich." },
        { status: 400 }
      );
    }

    const mailConfig = getMailerConfig();

    if (!mailConfig) {
      return NextResponse.json(
        {
          ok: false,
          message: "E-Mail-Versand ist noch nicht konfiguriert (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).",
        },
        { status: 500 }
      );
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ ok: false, message: "Benutzer existiert bereits" }, { status: 409 });
    }

    // Passwort wird bewusst vor dem Speichern gehasht; Klartext landet nie in der Datenbank.
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenHash = hashToken(emailVerificationToken);

    const result = await db.collection("users").insertOne({
      email: normalizedEmail,
      password: hash,
      role,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      createdAt: new Date(),
      updatedAt: new Date(),
      welcomePopupSeenAt: null,
      emailVerified: false,
      emailVerificationTokenHash,
      emailVerifiedAt: null,
    });

    try {
      if (role === "artist") {
        await db.collection("artists").insertOne({
          userId: result.insertedId.toString(),
          artistName: normalizedArtistName,
          description: "",
          profilePicture: "",
          galleryImages: [],
          youtubeUrl: "",
          technicalInfo: "",
          songs: [],
          genre: [],
          instruments: [],
          musicAccompaniment: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch {
      await db.collection("users").deleteOne({ _id: result.insertedId });
      return NextResponse.json(
        {
          ok: false,
          message: "Der Künstleraccount konnte nicht gespeichert werden. Bitte versuche es erneut.",
        },
        { status: 500 }
      );
    }

    try {
      const transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port,
        secure: mailConfig.secure,
        auth: mailConfig.auth,
      });

      // Der Verifikationslink wird dynamisch auf Basis der aktuellen Origin erzeugt.
      const websiteOrigin = getSiteOrigin(request);
      const verifyHref = `${websiteOrigin}/api/verify-email?token=${emailVerificationToken}`;

      await transporter.sendMail({
        from: mailConfig.from,
        to: normalizedEmail,
        subject: "TheWeddingStage - Bitte bestätige deine E-Mail-Adresse",
        text: [
          `Hallo ${normalizedFirstName},`,
          "",
          "bitte bestätige deine E-Mail-Adresse, um deinen Account bei TheWeddingStage zu aktivieren.",
          "",
          `Bestätigungslink: ${verifyHref}`,
          "",
          "Viele Grüße",
          "TheWeddingStage",
        ].join("\n"),
        html: `<div style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,Helvetica,sans-serif;color:#111111;"><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:#111111;border-radius:28px;padding:28px 28px 24px;color:#ffffff;box-shadow:0 18px 40px rgba(0,0,0,0.14);"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);">TheWeddingStage</p><h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">E-Mail-Adresse bestätigen</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">Bitte bestätige deine E-Mail-Adresse, damit wir deinen Account freischalten können.</p></div><div style="margin-top:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:28px;padding:24px 28px;"><p style="margin:0;font-size:15px;line-height:1.75;color:#222222;">Hallo ${normalizedFirstName},</p><p style="margin:12px 0 0;font-size:15px;line-height:1.75;color:#222222;">dein Account wurde erstellt. Bitte bestätige jetzt deine E-Mail-Adresse über den Button unten.</p></div><div style="margin-top:18px;text-align:center;"><a href="${verifyHref}" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #111111;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">E-Mail-Adresse bestätigen</a></div></div></div>`,
      });
    } catch {
      // Falls der E-Mail-Versand scheitert, wird der frisch angelegte Nutzer wieder entfernt,
      // damit kein nicht aktivierbarer „halbfertiger“ Account zurückbleibt.
      await db.collection("artists").deleteMany({ userId: result.insertedId.toString() });
      await db.collection("users").deleteOne({ _id: result.insertedId });
      return NextResponse.json(
        {
          ok: false,
          message: "Bestätigungs-E-Mail konnte nicht versendet werden. Bitte versuche es erneut.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
