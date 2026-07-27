/**
 * Zentrales Hilfsmodul fuer die oeffentliche Website-URL.
 * Erlaubt einen expliziten Produktionswert per Umgebungsvariable und faellt sonst auf die aktuelle Request-URL zurueck.
 */
export function getSiteOrigin(request?: Request) {
  const configuredUrl = process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      return configuredUrl.replace(/\/+$/, "");
    }
  }

  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

    if (forwardedProto && forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    try {
      return new URL(request.url).origin;
    } catch {
      return "http://localhost:3000";
    }
  }

  return "http://localhost:3000";
}