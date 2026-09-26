/**
 * Raster basemap shared by every Leaflet map.
 *
 * CARTO's public CDN (`basemaps.cartocdn.com`) now watermarks
 * "API KEY REQUIRED" for anonymous traffic. OSM tiles do not need a key.
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
