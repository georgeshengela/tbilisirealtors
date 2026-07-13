export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address?: string;
  city?: string;
  district?: string;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

function parseAddress(addr?: NominatimAddress) {
  if (!addr) return { address: '', city: '', district: '' };

  const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
  const city = addr.city || addr.town || addr.village || 'თბილისი';
  const district = addr.suburb || addr.neighbourhood || addr.state || '';

  return { address: street, city, district };
}

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'ge');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'ka,en' },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResult[];

  return data.map(item => {
    const parsed = parseAddress(item.address);
    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      ...parsed,
    };
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'Accept-Language': 'ka,en' },
  });

  if (!res.ok) return null;

  const item = (await res.json()) as NominatimResult;
  const parsed = parseAddress(item.address);

  return {
    lat,
    lng,
    displayName: item.display_name,
    ...parsed,
  };
}
