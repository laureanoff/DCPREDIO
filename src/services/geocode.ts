import "server-only";

export type GeoPoint = { lat: number; lng: number };

/**
 * Convierte una dirección en coordenadas con Nominatim (OpenStreetMap, gratuito, sin clave).
 * Se usa solo al guardar la dirección en el panel (muy pocas veces), respetando su política de uso.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DCPredio/1.0 (reservas de canchas)", "Accept-Language": "es" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const lat = Number(data[0]?.lat);
    const lng = Number(data[0]?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch (e) {
    console.error("[geocode]", e instanceof Error ? e.message : e);
    return null;
  }
}
