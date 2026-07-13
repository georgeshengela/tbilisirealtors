import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { createPropertyIcon } from '../lib/leafletSetup';
import { searchAddress, reverseGeocode, type GeocodingResult } from '../lib/geocoding';

export interface LocationValue {
  lat: number;
  lng: number;
  address: string;
  city: string;
  district: string;
}

interface LocationPickerMapProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  height?: number | string;
}

const TBILISI_CENTER = { lat: 41.7151, lng: 44.8271 };

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapViewController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function LocationPickerMap({ value, onChange, height = 420 }: LocationPickerMapProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coords = value.lat && value.lng ? value : { ...value, ...TBILISI_CENTER };
  const markerIcon = createPropertyIcon('#497cff');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearchInput(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchAddress(text);
        setResults(found);
        setShowResults(found.length > 0);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function applyResult(result: GeocodingResult) {
    onChange({
      lat: result.lat,
      lng: result.lng,
      address: result.address || result.displayName.split(',')[0] || '',
      city: result.city || 'თბილისი',
      district: result.district || '',
    });
    setQuery(result.displayName.split(',').slice(0, 2).join(', '));
    setShowResults(false);
  }

  async function handleMapPick(lat: number, lng: number) {
    setReverseLoading(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        applyResult(result);
      } else {
        onChange({ ...value, lat, lng });
      }
    } finally {
      setReverseLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearchInput(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="მოძებნეთ მისამართი — მაგ: ვაკე, ჭანტურია 12, თბილისი"
            className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {(searching || reverseLoading) && (
            <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
          )}
          {!searching && query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setShowResults(false); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute z-[1000] w-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            {results.map((r, i) => (
              <button
                key={`${r.lat}-${r.lng}-${i}`}
                type="button"
                onClick={() => applyResult(r)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.displayName.split(',')[0]}</p>
                  <p className="text-xs text-slate-500 truncate">{r.displayName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner" style={{ height }}>
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={14}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={handleMapPick} />
          <MapViewController lat={coords.lat} lng={coords.lng} />
          <Marker
            position={[coords.lat, coords.lng]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                handleMapPick(lat, lng);
              },
            }}
          />
        </MapContainer>

        <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm text-xs font-medium text-slate-600 shadow-lg border border-slate-100">
            <MapPin size={13} className="text-blue-500" />
            დააწკაპუნეთ რუკაზე ან გადაიტანეთ მარკერი
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'მისამართი', val: value.address || '—' },
          { label: 'რაიონი', val: value.district || '—' },
          { label: 'ქალაქი', val: value.city || '—' },
        ].map(item => (
          <div key={item.label} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
