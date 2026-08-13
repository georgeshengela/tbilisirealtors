/**
 * Checks that every city and district in the dictionary still resolves to a real
 * outline, and reports how many listings fall inside each one.
 *
 *   npm run verify:areas   (needs the API running)
 */
import { CITY_AREAS } from '../src/data/districts';
import { pointInRings } from '../src/lib/geoMath';

const API = 'http://localhost:3001';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Listing {
  city?: string;
  district?: string;
  coordinates?: { lat: number; lng: number };
}

const payload = await fetch(`${API}/api/properties`).then(r => r.json());
const listings: Listing[] = Array.isArray(payload) ? payload : payload.data ?? [];

let failures = 0;

for (const city of CITY_AREAS) {
  const areas = [
    { label: `${city.ka} (city)`, osm: city.osm, districtName: null as string | null },
    ...city.districts.map(d => ({ label: `  ${d.ka} / ${d.en}`, osm: d.osm, districtName: d.ka })),
  ];

  for (const area of areas) {
    if (!area.osm) {
      console.log(`${area.label.padEnd(34)} no OSM id — falls back to the city outline`);
      continue;
    }

    const res = await fetch(`${API}/api/geo/boundary?osm=${area.osm}`);
    const boundary = await res.json();

    if (!boundary?.rings?.length) {
      failures += 1;
      console.log(`${area.label.padEnd(34)} FAILED (${area.osm}) — no polygon`);
      await sleep(1100);
      continue;
    }

    const [south, west, north, east] = boundary.bbox;
    const km = (north - south) * 111;
    const inside = listings.filter(
      l => l.city === city.ka && l.coordinates && pointInRings(boundary.rings, l.coordinates.lat, l.coordinates.lng),
    ).length;

    const sane = km > 0.15 && km < 80;
    if (!sane) failures += 1;

    console.log(
      `${area.label.padEnd(34)} ${sane ? 'ok  ' : 'SIZE'} ${area.osm.padEnd(11)} ` +
        `${km.toFixed(1)}km  rings=${String(boundary.rings.length).padEnd(3)} listings=${inside}`,
    );
    await sleep(1100);
  }
}

console.log(failures ? `\n${failures} problem(s)` : '\nAll areas resolved cleanly.');
