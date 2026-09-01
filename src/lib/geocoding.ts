export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address?: string;
  city?: string;
  district?: string;
}

export interface StreetSuggestion {
  street: string;
  streetNumber: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  label: string;
  sublabel: string;
}

export async function searchAddress(query: string, city?: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({ q: query.trim() });
  if (city) params.set('city', city);
  const res = await fetch(`/api/geo/address-search?${params.toString()}`);
  if (!res.ok) return [];
  return (await res.json()) as GeocodingResult[];
}

export async function suggestStreets(query: string, city?: string): Promise<StreetSuggestion[]> {
  if (query.trim().length < 2) return [];
  const params = new URLSearchParams({ q: query.trim() });
  if (city) params.set('city', city);
  const res = await fetch(`/api/geo/street-suggest?${params.toString()}`);
  if (!res.ok) return [];
  return (await res.json()) as StreetSuggestion[];
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const res = await fetch(`/api/geo/address-reverse?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as GeocodingResult | null;
}
