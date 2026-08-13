import { useEffect, useRef, type RefObject } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { ExternalLink, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { officeIcon } from '../lib/leafletSetup';
import { CONTACT } from '../data/contactInfo';
import { useTranslation } from '../i18n/LocaleContext';

interface OfficeMapProps {
  height?: number | string;
  className?: string;
}

function MapReady({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: false });
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [lat, lng, zoom, map]);

  return null;
}

function OpenOfficePopup({ markerRef }: { markerRef: RefObject<LeafletMarker | null> }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [map, markerRef]);

  return null;
}

export default function OfficeMap({ height = 420, className = '' }: OfficeMapProps) {
  const { t } = useTranslation();
  const { lat, lng } = CONTACT.coordinates;
  const cityPrefix = t('contactAddress.cityPrefix');
  const markerRef = useRef<LeafletMarker | null>(null);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height, background: '#eef1f5' }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        dragging
        zoomControl
        doubleClickZoom
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; <a href="https://leafletjs.com/">Leaflet</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapReady lat={lat} lng={lng} zoom={16} />
        <OpenOfficePopup markerRef={markerRef} />
        <Marker ref={markerRef} position={[lat, lng]} icon={officeIcon}>
          <Popup className="office-map-popup" minWidth={220} maxWidth={280}>
            <div className="py-0.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                {t('footer.office')}
              </p>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {cityPrefix ? `${cityPrefix} ` : ''}{CONTACT.city}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">{CONTACT.street}</p>
              <a
                href={CONTACT.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={12} />
                {t('contact.mapCta')}
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <div
        className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 z-[400] pointer-events-none"
        aria-hidden
      >
        <div
          className="pointer-events-auto rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(230,232,234,0.95)',
            boxShadow: '0 12px 32px rgba(15,23,42,0.10)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.10)', color: '#2563eb' }}
          >
            <MapPin size={18} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{t('footer.office')}</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
              {CONTACT.street}
            </p>
            <p className="text-xs text-slate-500">{CONTACT.city}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
