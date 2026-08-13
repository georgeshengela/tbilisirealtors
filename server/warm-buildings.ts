/**
 * Pre-fetches OpenStreetMap building footprints around every listing so the map
 * paints buildings instantly instead of waiting on a live Overpass query.
 *
 * Run with: npm run warm:buildings   (the API server must be running)
 */

const API = process.env.WARM_API ?? 'http://localhost:3001';
const PAD = 0.006;

interface Listing {
  address?: string;
  coordinates?: { lat?: number; lng?: number };
}

async function main() {
  const res = await fetch(`${API}/api/properties`);
  if (!res.ok) throw new Error(`could not load listings: ${res.status}`);

  const payload = (await res.json()) as Listing[] | { data?: Listing[] };
  const listings = Array.isArray(payload) ? payload : payload.data ?? [];

  // One request per distinct area — nearby listings share the same grid tiles.
  const seen = new Set<string>();
  const areas: { label: string; bbox: string }[] = [];

  for (const listing of listings) {
    const lat = listing.coordinates?.lat;
    const lng = listing.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;

    const key = `${Math.round(lat / 0.01)}_${Math.round(lng / 0.01)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    areas.push({
      label: listing.address || `${lat},${lng}`,
      bbox: [lat - PAD, lng - PAD, lat + PAD, lng + PAD].map(n => n.toFixed(4)).join(','),
    });
  }

  console.log(`Warming ${areas.length} areas from ${listings.length} listings…`);

  const total = areas.length;
  let pending = areas;
  let ready = 0;

  // When every Overpass mirror is busy the server backs off for a minute, so we
  // wait it out and retry instead of leaving those areas uncached.
  for (let round = 1; round <= 4 && pending.length; round += 1) {
    if (round > 1) {
      console.log(`Round ${round}: retrying ${pending.length} areas after the mirror cooldown…`);
      await new Promise(resolve => setTimeout(resolve, 65_000));
    }

    const retry: typeof pending = [];
    for (const [index, area] of pending.entries()) {
      const started = Date.now();
      try {
        const response = await fetch(`${API}/api/geo/buildings?bbox=${area.bbox}`);
        const json = (await response.json()) as { buildings?: unknown[]; reason?: string };
        const count = json.buildings?.length ?? 0;
        const incomplete = json.reason === 'upstream-busy' || json.reason === 'partial';

        if (incomplete) retry.push(area);
        else ready += 1;

        console.log(
          `${index + 1}/${pending.length} ${area.label} — ${count} buildings` +
            `${json.reason ? ` (${json.reason})` : ''} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
        );
      } catch (error) {
        retry.push(area);
        console.warn(`${index + 1}/${pending.length} ${area.label} — failed:`, (error as Error).message);
      }
    }

    pending = retry;
  }

  console.log(`Done. ${ready}/${total} areas cached${pending.length ? `, ${pending.length} still incomplete` : ''}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
