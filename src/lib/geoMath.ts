import type { Ring } from './geoApi';

/** Ray casting on [lat, lng] pairs. */
export function pointInRing(ring: Ring, lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    if (latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Even-odd rule across every ring of an area, so islands count as inside and
 * holes count as outside.
 */
export function pointInRings(rings: Ring[], lat: number, lng: number): boolean {
  let inside = false;
  for (const ring of rings) {
    if (pointInRing(ring, lat, lng)) inside = !inside;
  }
  return inside;
}

/** Bounding box of an area as [south, west, north, east]. */
export function ringsBbox(rings: Ring[]): [number, number, number, number] {
  let south = 90;
  let west = 180;
  let north = -90;
  let east = -180;

  for (const ring of rings) {
    for (const [lat, lng] of ring) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
    }
  }

  return [south, west, north, east];
}
