export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address?: string;
  city?: string;
  district?: string;
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({ q: query.trim() });
  const res = await fetch(`/api/geo/address-search?${params.toString()}`);
  if (!res.ok) return [];
  return (await res.json()) as GeocodingResult[];
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const res = await fetch(`/api/geo/address-reverse?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as GeocodingResult | null;
}
