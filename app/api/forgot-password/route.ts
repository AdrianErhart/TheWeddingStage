/**
 * Route-Handler für den Endpoint `/forgot-password`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

import { getDb } from "@/lib/mongodb";
import { getSiteOrigin } from "@/lib/site-url";

type ForgotPasswordBody = {
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

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

  // Ohne separaten Absender wird die SMTP-Benutzeradresse als sichtbarer Mail-Absender genutzt.
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

function generatePassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let generated = "";

  for (let index = 0; index < length; index += 1) {
    generated += PASSWORD_CHARS[bytes[index] % PASSWORD_CHARS.length];
  }

  return generated;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotPasswordBody;
    const normalizedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json(
        { ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." },
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
    const user = await db.collection("users").findOne({ email: normalizedEmail });

    if (!user || typeof user.password !== "string") {
      // Die gleiche Erfolgsantwort wird bewusst immer zurückgegeben, damit kein Konto-Existenz-Check nach außen sichtbar wird.
      return NextResponse.json(
        {
          ok: true,
          message:
            "Wenn ein Konto mit dieser E-Mail existiert, wurde ein neues Passwort verschickt. Schaue auch in deinem Spam-Ordner nach.",
        },
        { status: 200 }
      );
    }

    // Das neue Passwort wird serverseitig erzeugt und nur einmal per Mail ausgeliefert.
    const nextPassword = generatePassword(12);
    const nextPasswordHash = await bcrypt.hash(nextPassword, 10);
    const previousPasswordHash = user.password;

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { password: nextPasswordHash, updatedAt: new Date() } }
    );

    try {
      const transporter = nodemailer.createTransport({
        host: mailConfig.host,
        port: mailConfig.port,
        secure: mailConfig.secure,
        auth: mailConfig.auth,
      });

      // Der Login-Link nutzt die aktuelle Origin, damit lokale und produktive Umgebungen korrekt funktionieren.
      const websiteOrigin = getSiteOrigin(request);
      const loginHref = `${websiteOrigin}/login`;

      await transporter.sendMail({
        from: mailConfig.from,
        to: normalizedEmail,
        subject: "TheWeddingStage - Dein neues Passwort",
        text: [
          "Hallo,",
          "",
          "dein Passwort wurde zurückgesetzt.",
          "",
          `Neues Passwort: ${nextPassword}`,
          "",
          "Bitte melde dich damit an und ändere es danach in deinem Profil.",
          `Login: ${loginHref}`,
          "",
          "Viele Grüße",
          "TheWeddingStage",
        ].join("\n"),
        html: `<div style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,Helvetica,sans-serif;color:#111111;"><div style="max-width:640px;margin:0 auto;padding:32px 16px;"><div style="background:#111111;border-radius:28px;padding:28px 28px 24px;color:#ffffff;box-shadow:0 18px 40px rgba(0,0,0,0.14);"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);">TheWeddingStage</p><h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;">Dein neues Passwort</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">Für deinen Account wurde ein neues Passwort generiert.</p></div><div style="margin-top:18px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:28px;padding:24px 28px;"><p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Neues Passwort</p><p style="margin:0;font-size:26px;line-height:1.4;font-weight:700;color:#111111;word-break:break-word;">${nextPassword}</p><p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#333333;">Bitte melde dich mit diesem Passwort an und ändere es danach in deinem Profil.</p></div><div style="margin-top:18px;text-align:center;"><a href="${loginHref}" style="display:inline-block;padding:12px 20px;border-radius:999px;border:1px solid #111111;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Zum Login</a></div><p style="margin:16px 4px 0;font-size:12px;line-height:1.6;color:#8a8a8a;">Falls du diese Anfrage nicht gestellt hast, kontaktiere bitte den Support.</p></div></div>`,
      });
    } catch (error) {
      // Schlägt der Versand fehl, wird das alte Passwort wiederhergestellt.
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { password: previousPasswordHash, updatedAt: new Date() } }
      );

      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          "Wenn ein Konto mit dieser E-Mail existiert, wurde ein neues Passwort verschickt. Schaue auch in deinem Spam-Ordner nach.",
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
