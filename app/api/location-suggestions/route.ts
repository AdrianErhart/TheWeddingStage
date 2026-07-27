/**
 * Route-Handler für den Endpoint `/location-suggestions`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextRequest, NextResponse } from "next/server";

import { searchCitySuggestions } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!query) {
      // Ohne Suchbegriff werden bewusst keine Vorschläge geladen.
      return NextResponse.json({ ok: true, suggestions: [] }, { status: 200 });
    }

    // Maximal fünf Vorschläge halten die Antwort klein und die UI ruhig.
    const suggestions = await searchCitySuggestions(query, 5);

    return NextResponse.json({ ok: true, suggestions }, { status: 200 });
  } catch (error) {
    console.error("Location suggestions error:", error);
    return NextResponse.json(
      { ok: false, message: "Vorschläge konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}