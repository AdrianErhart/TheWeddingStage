/**
 * Route-Handler für den Endpoint `/contact`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

import { getSiteOrigin } from "@/lib/site-url";

type ContactBody = {
  email?: string;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NON_DELIVERABLE_EMAIL_DOMAIN_SUFFIXES = [".local", ".localhost", ".invalid", ".test"];

function hasNonDeliverableEmailDomain(email: string) {
  const atIndex = email.lastIndexOf("@");

  if (atIndex < 0 || atIndex === email.length - 1) {
    return true;
  }

  const domain = email.slice(atIndex + 1).toLowerCase();
  return NON_DELIVERABLE_EMAIL_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix));
}

function getAdminEmail() {
  const value = process.env.CONTACT_ADMIN_EMAIL?.trim();
  return value && EMAIL_PATTERN.test(value) && !hasNonDeliverableEmailDomain(value) ? value : null;
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

  // Wenn kein expliziter Absender konfiguriert ist, wird die SMTP-Benutzeradresse verwendet.
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
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
    const body = (await request.json()) as ContactBody;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!EMAIL_PATTERN.test(email) || hasNonDeliverableEmailDomain(email) || message.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Bitte gib eine gültige, zustellbare E-Mail-Adresse und eine Nachricht ein." },
        { status: 400 }
      );
    }

    const config = getMailerConfig();

    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          message: "E-Mail-Versand ist noch nicht konfiguriert (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).",
        },
        { status: 500 }
      );
    }

    const adminEmail = getAdminEmail();

    if (!adminEmail) {
      return NextResponse.json(
        {
          ok: false,
          message: "Empfänger-Adresse fehlt oder ist ungültig (CONTACT_ADMIN_EMAIL).",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    // Die Origin wird aus der aktuellen Request-URL abgeleitet, damit Links in Mail und UI zusammenpassen.
    const websiteOrigin = getSiteOrigin(request);
    const browseArtistsHref = `${websiteOrigin}/browse-artists`;
    const escapedMessage = escapeHtml(message);

    const adminHtml = withEmailShell({
      websiteOrigin,
      ctaHref: browseArtistsHref,
      ctaLabel: "Nach weiteren Künstlern suchen",
      innerHtml: `<div style="background:#111111;border-radius:24px;padding:24px;color:#ffffff;"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);">TheWeddingStage</p><h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;">Neue Anfrage über das Kontaktformular</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.9);">Es wurde gerade eine neue Nachricht über deine Website gesendet.</p></div><div style="margin-top:14px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:24px;padding:22px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Absender</p><p style="margin:0 0 14px;font-size:17px;line-height:1.5;font-weight:600;color:#111111;word-break:break-word;">${email}</p><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Nachricht</p><div style="font-size:15px;line-height:1.75;color:#222222;white-space:pre-wrap;word-break:break-word;">${escapedMessage}</div><p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8a8a;">Diese Nachricht wurde automatisch über das Kontaktformular von TheWeddingStage versendet.</p></div>`,
    });

    // Die Anfrage an den Admin und die Bestätigung an den Absender werden getrennt versendet,
    // damit beide Seiten jeweils den passenden Inhalt erhalten.
    await transporter.sendMail({
      from: config.from,
      to: adminEmail,
      replyTo: email,
      subject: "TheWeddingStage - Neue Anfrage über Kontaktformular",
      text: [
        "Neue Nachricht vom Kontaktformular:",
        "",
        `Absender: ${email}`,
        "",
        "Nachricht:",
        message,
        "",
        `CTA: ${browseArtistsHref}`,
      ].join("\n"),
      html: adminHtml,
    });

    const confirmationHtml = withEmailShell({
      websiteOrigin,
      ctaHref: browseArtistsHref,
      ctaLabel: "Künstler entdecken",
      innerHtml: `<div style="background:#111111;border-radius:24px;padding:24px;color:#ffffff;"><p style="margin:0 0 10px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.72);">TheWeddingStage</p><h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;">Danke für deine Nachricht!</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.9);">Wir haben deine Anfrage erhalten und melden uns so schnell wie möglich bei dir.</p></div><div style="margin-top:14px;background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:24px;padding:22px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7a7a7a;">Deine Nachricht</p><div style="font-size:15px;line-height:1.75;color:#222222;white-space:pre-wrap;word-break:break-word;">${escapedMessage}</div><p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8a8a;">Diese E-Mail bestätigt nur den Eingang deiner Nachricht.</p></div>`,
    });

    try {
      await transporter.sendMail({
        from: config.from,
        to: email,
        replyTo: adminEmail,
        subject: "TheWeddingStage - Wir haben deine Nachricht erhalten",
        text: [
          "Danke für deine Nachricht an TheWeddingStage.",
          "",
          "Wir haben deine Anfrage erhalten und melden uns so schnell wie möglich.",
          "",
          "Deine Nachricht:",
          message,
          "",
          `Künstler entdecken: ${browseArtistsHref}`,
        ].join("\n"),
        html: confirmationHtml,
      });
    } catch {
      // Die Admin-Mail ist bereits erfolgreich versendet.
      // Ein Fehler bei der optionalen Bestätigung an den Absender blockiert den Kontaktprozess nicht.
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
