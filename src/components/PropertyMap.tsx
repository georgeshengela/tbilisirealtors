import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultPropertyIcon } from '../lib/leafletSetup';

interface PropertyMapProps {
  lat: number;
  lng: number;
  address?: string;
  district?: string;
  city?: string;
  height?: number | string;
  zoom?: number;
  interactive?: boolean;
}

function MapViewController({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);

  return null;
}

export default function PropertyMap({
  lat,
  lng,
  address,
  district,
  city,
  height = 280,
  zoom = 15,
  interactive = true,
}: PropertyMapProps) {
  const locationLabel = [address, district, city].filter(Boolean).join(', ');

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height, border: '1px solid #dce0e8' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewController lat={lat} lng={lng} zoom={zoom} />
        <Marker position={[lat, lng]} icon={defaultPropertyIcon}>
          {locationLabel && (
            <Popup>
              <div className="text-sm font-semibold text-slate-800">{locationLabel}</div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
