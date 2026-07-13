import L from 'leaflet';

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <path filter="url(#shadow)" fill="#497cff" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
  <circle cx="16" cy="16" r="4" fill="#497cff"/>
</svg>`;

export function createPropertyIcon(color = '#497cff') {
  const svg = PIN_SVG.replace(/#497cff/g, color);
  return L.divIcon({
    html: svg,
    className: 'property-map-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

export const defaultPropertyIcon = createPropertyIcon();
