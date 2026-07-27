/**
 * Geteiltes Hilfsmodul `geocoding` fuer die Anwendungslogik.
 * Stellt wiederverwendbare Funktionen fuer Domainregeln, Datenzugriff oder Infrastrukturdetails bereit, damit diese zentral gepflegt werden koennen.
 */
// Nominatim API - OpenStreetMap Geocoding
export interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
}

export interface CitySuggestion {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocode a city name using OpenStreetMap Nominatim API
 * Returns the most relevant result
 */
export async function geocodeCity(cityName: string): Promise<GeoLocation | null> {
  if (!cityName || cityName.trim().length === 0) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "TheweddingstageApp/1.0"
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Search for city suggestions using OpenStreetMap Nominatim API
 */
export async function searchCitySuggestions(cityName: string, limit = 5): Promise<CitySuggestion[]> {
  if (!cityName || cityName.trim().length === 0) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=${limit}&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TheweddingstageApp/1.0",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    return data
      .map((result) => ({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
      }))
      .filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lng));
  } catch (error) {
    console.error("City suggestion error:", error);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Convert radius string to numeric value
 * e.g. "< 50 km" -> 50
 */
export function radiusStringToNumber(radiusStr: string): number | null {
  if (!radiusStr || radiusStr.trim().length === 0) {
    return null;
  }

  const match = radiusStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Check if distance is within radius
 */
export function isWithinRadius(distance: number, radiusStr: string): boolean {
  const radiusKm = radiusStringToNumber(radiusStr);
  if (!radiusKm) {
    return false;
  }

  if (radiusStr.includes("mehr als")) {
    return distance > radiusKm;
  }

  return distance <= radiusKm;
}
