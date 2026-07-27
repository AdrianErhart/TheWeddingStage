/**
 * Route-Handler für den Endpoint `/init-db`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextResponse } from "next/server";

import { ensureAppDatabase, ensureAppCollections } from "@/lib/mongodb";

export async function GET() {
  try {
    // Dieser Endpoint legt die Grundstruktur der Datenbank gezielt an und ist nur für Setup- und Testzwecke gedacht.
    const result = await ensureAppDatabase();
    const collections = await ensureAppCollections();

    return NextResponse.json({ ok: true, message: "Database and collections initialized.", ...result, collections });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown database error.",
      },
      { status: 500 }
    );
  }
}