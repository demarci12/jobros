import "server-only";

export type GeoResult = { lat: number; lng: number };

export async function geocodeAddress(address: string, city?: string, zip?: string): Promise<GeoResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const query = [address, zip, city].filter(Boolean).join(", ");
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&country=HU`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.center as [number, number];
    return { lat, lng };
  } catch {
    return null;
  }
}
