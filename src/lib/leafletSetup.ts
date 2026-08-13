import L from 'leaflet';

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <path filter="url(#shadow)" fill="#2563eb" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
  <circle cx="16" cy="16" r="4" fill="#2563eb"/>
</svg>`;

export function createPropertyIcon(color = '#2563eb') {
  const svg = PIN_SVG.replace(/#2563eb/g, color);
  return L.divIcon({
    html: svg,
    className: 'property-map-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

export const defaultPropertyIcon = createPropertyIcon();

const OFFICE_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="40" height="52">
  <defs>
    <linearGradient id="officePinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <filter id="officeShadow" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#2563eb" flood-opacity="0.35"/>
    </filter>
  </defs>
  <ellipse cx="20" cy="48" rx="8" ry="3" fill="#2563eb" opacity="0.18"/>
  <path filter="url(#officeShadow)" fill="url(#officePinGrad)" d="M20 0C9 0 0 9 0 20c0 15 20 32 20 32s20-17 20-32C40 9 31 0 20 0z"/>
  <circle cx="20" cy="19" r="10" fill="#ffffff"/>
  <path fill="#2563eb" d="M14 22v-6.5c0-.8.7-1.5 1.5-1.5h9c.8 0 1.5.7 1.5 1.5V22h-3v-2h-2v2h-2v-3h-2v3h-2zm1.5-8c-.3 0-.5.2-.5.5V16h11v-1.5c0-.3-.2-.5-.5-.5h-10z"/>
</svg>`;

export function createOfficeIcon() {
  return L.divIcon({
    html: `<div class="office-pin-wrap">${OFFICE_PIN_SVG}</div>`,
    className: 'office-map-marker',
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
  });
}

export const officeIcon = createOfficeIcon();
