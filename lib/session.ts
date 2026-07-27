/**
 * Geteiltes Hilfsmodul `session` fuer die Anwendungslogik.
 * Stellt wiederverwendbare Funktionen fuer Domainregeln, Datenzugriff oder Infrastrukturdetails bereit, damit diese zentral gepflegt werden koennen.
 */
import crypto from "node:crypto";

import type { Db } from "mongodb";

export const SESSION_COOKIE_NAME = "theweddingstage_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionRecord = {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
};

export function hashSessionToken(token: string): string {
  // In der Datenbank wird nur der Hash des Session-Tokens gespeichert.
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  // Serverseitiger Sessioneintrag mit Ablaufzeit fuer spaeteres Pruefen und Aufraeumen.
  await db.collection<SessionRecord>("sessions").insertOne({
    tokenHash,
    userId,
    createdAt: new Date(),
    expiresAt,
  });

  return token;
}

export async function findSessionByToken(db: Db, token: string): Promise<SessionRecord | null> {
  const tokenHash = hashSessionToken(token);

  return db.collection<SessionRecord>("sessions").findOne({
    // Nur nicht abgelaufene Sessions sind gueltig.
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
}

export async function deleteSessionByToken(db: Db, token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);

  await db.collection("sessions").deleteOne({ tokenHash });
}