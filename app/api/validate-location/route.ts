/**
 * Route-Handler für den Endpoint `/validate-location`.
 * Diese Datei validiert eingehende Requests, führt die fachliche Logik aus und erzeugt konsistente JSON- oder Redirect-Responses inklusive Fehlerbehandlung.
 */
import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/geocoding";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { city: string };

    if (!body.city || typeof body.city !== "string") {
      // Ohne Stadtname kann keine Geocoding-Prüfung stattfinden.
      return NextResponse.json(
        { ok: false, message: "Stadtname ist erforderlich" },
        { status: 400 }
      );
    }

    // Geprüft wird gegen die Geocoding-Hilfsfunktion, nicht gegen lokale Platzhalter.
    const geoLocation = await geocodeCity(body.city.trim());

    if (!geoLocation) {
      return NextResponse.json(
        {
          ok: false,
          valid: false,
          message: "Stadt nicht gefunden. Bitte überprüfe die Schreibweise.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        valid: true,
        city: geoLocation.displayName,
        lat: geoLocation.lat,
        lng: geoLocation.lng,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Location validation error:", error);
    return NextResponse.json(
      { ok: false, message: "Validierung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
