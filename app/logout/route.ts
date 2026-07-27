/**
 * Route zum sicheren Ausloggen aus der Anwendung.
 * Der Handler beendet die aktive Sitzung, entfernt Session-Cookies und leitet die Nutzerin bzw. den Nutzer in den Login-Flow zurueck.
 */
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { SESSION_COOKIE_NAME, deleteSessionByToken } from "@/lib/session";
import { getSiteOrigin } from "@/lib/site-url";

function buildLogoutRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?logged_out=1", getSiteOrigin(request)));
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const db = await getDb();
      await deleteSessionByToken(db, token);
    }

    const response = buildLogoutRedirect(request);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return response;
  } catch {
    const response = buildLogoutRedirect(request);
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return response;
  }
}