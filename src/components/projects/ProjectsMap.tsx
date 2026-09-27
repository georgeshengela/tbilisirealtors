import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ConstructionProject } from '../../types/project';
import { OSM_TILE_ATTR, OSM_TILE_URL } from '../../lib/mapTiles';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useTranslation } from '../../i18n/LocaleContext';

function pinFor(label: string, status: string): L.DivIcon {
  const el = document.createElement('span');
  el.className = `pmap-pin pmap-pin--${status}`;
  el.textContent = label;
  return L.divIcon({ className: 'lp-pin-anchor', html: el.outerHTML, iconSize: [0, 0], iconAnchor: [0, 0] });
}

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export default function ProjectsMap({ projects }: { projects: ConstructionProject[] }) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const placed = useMemo(
    () => projects.filter(p => p.coordinates && Number.isFinite(p.coordinates.lat) && (p.coordinates.lat || p.coordinates.lng)),
    [projects],
  );
  const points = useMemo(() => placed.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]), [placed]);

  if (!placed.length) return null;

  return (
    <MapContainer center={points[0]} zoom={12} scrollWheelZoom={false} className="pmap" attributionControl={false}>
      <TileLayer url={OSM_TILE_URL} attribution={OSM_TILE_ATTR} maxZoom={19} />
      <FitAll points={points} />
      {placed.map(p => (
        <Marker key={p.id} position={[p.coordinates.lat, p.coordinates.lng]} icon={pinFor(p.name, p.status)}>
          <Popup className="listing-map-leaflet-popup" closeButton={false} offset={[0, -30]}>
            <Link to={`/project/${p.slug}`} className="pmap-card">
              <img src={p.image} alt="" />
              <span className="pmap-card__body">
                <strong>{p.name}</strong>
                <small>{p.developer} · {p.district}</small>
                <em>{t('home.showcase.priceFrom')} {formatMoney(p.priceFrom)}</em>
              </span>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
