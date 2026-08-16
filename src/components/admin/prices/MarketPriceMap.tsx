import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { DistrictPriceRow, MapMode } from './types';

const CITY_CENTERS: Record<string, [number, number]> = {
  'თბილისი': [41.7151, 44.8271],
  'ბათუმი': [41.6168, 41.6367],
  'ქუთაისი': [42.2679, 42.6946],
  'მცხეთა': [41.8451, 44.7208],
  'სიღნაღი': [41.6224, 45.9219],
  'გორი': [41.9842, 44.1158],
};

const DISTRICT_CENTERS: Record<string, [number, number]> = {
  'ვაკე': [41.707, 44.772],
  'საბურთალო': [41.722, 44.743],
  'მთაწმინდა': [41.694, 44.801],
  'ისანი': [41.689, 44.835],
  'სამგორი': [41.668, 44.872],
  'ნაძალადევი': [41.734, 44.797],
  'დიდუბე': [41.751, 44.776],
  'კრწანისი': [41.672, 44.893],
  'ჩუღურეთი': [41.712, 44.812],
  'გლდანი': [41.778, 44.814],
  'ვარკეთილი': [41.739, 44.870],
  'ვაზისუბანი': [41.708, 44.858],
  'თემქა': [41.762, 44.828],
  'მუხიანი': [41.789, 44.828],
  'ძველი თბილისი': [41.689, 44.810],
  'ავლაბარი': [41.695, 44.816],
  'სოლოლაკი': [41.690, 44.803],
  'ვერა': [41.706, 44.788],
  'ბაგები': [41.716, 44.727],
  'ვაშლიჯვარი': [41.735, 44.755],
  'ნუცუბიძე': [41.727, 44.746],
  'ლისი': [41.751, 44.735],
  'დიდი დიღომი': [41.777, 44.756],
  'დიღმის მასივი': [41.766, 44.769],
  'ორთაჭალა': [41.679, 44.818],
  'ფონიჭალა': [41.641, 44.845],
  'ძველი ბათუმი': [41.652, 41.636],
  'რუსთაველი': [41.648, 41.640],
  'ხიმშიაშვილი': [41.629, 41.615],
  'აღმაშენებელი': [41.640, 41.626],
  'ცენტრი': [41.652, 41.636],
};

export function resolveCoords(row: DistrictPriceRow): [number, number] | null {
  if (row.lat != null && row.lng != null && Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
    return [row.lat, row.lng];
  }
  const d = DISTRICT_CENTERS[row.district.trim()];
  if (d) return d;
  const c = CITY_CENTERS[row.city.trim()];
  return c ?? null;
}

const PRICE_RAMP = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a'];

function rampColor(value: number, min: number, max: number): string {
  if (max <= min) return PRICE_RAMP[3];
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return PRICE_RAMP[Math.min(PRICE_RAMP.length - 1, Math.floor(t * PRICE_RAMP.length))];
}

function trendColor(trend: number): string {
  if (trend > 6) return '#047857';
  if (trend > 1.5) return '#10b981';
  if (trend < -6) return '#b91c1c';
  if (trend < -1.5) return '#ef4444';
  return '#94a3b8';
}

function MapFit({ districts, mode }: { districts: DistrictPriceRow[]; mode: MapMode }) {
  const map = useMap();

  useEffect(() => {
    const coords = districts.map(resolveCoords).filter(Boolean) as [number, number][];
    if (coords.length === 0) {
      map.setView([41.7151, 44.8271], 11);
      return;
    }
    if (coords.length === 1) {
      map.setView(coords[0], 13);
    } else {
      map.fitBounds(coords, { padding: [50, 50], maxZoom: 12.5 });
    }
    const timer = window.setTimeout(() => map.invalidateSize(), 140);
    return () => window.clearTimeout(timer);
  }, [districts, map, mode]);

  return null;
}

interface MarketPriceMapProps {
  districts: DistrictPriceRow[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  mode: MapMode;
  showLabels: boolean;
  height?: number;
}

export default function MarketPriceMap({
  districts,
  selectedKey,
  onSelect,
  mode,
  showLabels,
  height = 440,
}: MarketPriceMapProps) {
  const mapped = districts
    .map(row => ({ row, coords: resolveCoords(row) }))
    .filter((x): x is { row: DistrictPriceRow; coords: [number, number] } => x.coords != null);

  const metric = (row: DistrictPriceRow) =>
    mode === 'volume' ? row.count : mode === 'trend' ? row.trend30d : row.avgPricePerSqm;

  const values = mapped.map(m => metric(m.row));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  const maxCount = Math.max(...mapped.map(m => m.row.count), 1);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ height, border: '1px solid #e2e8f0', background: '#eef2f7' }}
    >
      <MapContainer
        center={[41.7151, 44.8271]}
        zoom={11}
        scrollWheelZoom
        preferCanvas
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &middot; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapFit districts={districts} mode={mode} />

        {mapped.map(({ row, coords }) => {
          const active = selectedKey === row.key;
          const value = metric(row);
          const color = mode === 'trend' ? trendColor(row.trend30d) : rampColor(value, min, max);
          const weight = Math.sqrt(row.count / maxCount);
          const radius = (mode === 'volume' ? 8 + weight * 22 : 9 + weight * 13) + (active ? 6 : 0);

          return (
            <CircleMarker
              key={row.key}
              center={coords}
              radius={radius}
              pathOptions={{
                color: active ? '#0f172a' : '#ffffff',
                fillColor: color,
                fillOpacity: active ? 0.95 : 0.78,
                weight: active ? 3 : 1.6,
              }}
              eventHandlers={{ click: () => onSelect(active ? null : row.key) }}
            >
              {showLabels ? (
                <Tooltip permanent direction="center" className="price-map-label">
                  {mode === 'volume'
                    ? row.count
                    : mode === 'trend'
                      ? `${row.trend30d > 0 ? '+' : ''}${row.trend30d}%`
                      : `${Math.round(row.avgPricePerSqm / 100) / 10}k`}
                </Tooltip>
              ) : (
                <Tooltip direction="top" offset={[0, -6]} opacity={1} className="price-map-hover">
                  <span className="font-bold">{row.district}</span>
                  {' · '}
                  {row.avgPricePerSqm.toLocaleString('ka-GE')} ₾/მ²
                </Tooltip>
              )}

              <Popup minWidth={220}>
                <div className="text-sm">
                  <p className="font-extrabold text-slate-900 leading-tight">{row.district}</p>
                  <p className="text-[11px] text-slate-500 mb-2">{row.city}</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                    <span className="text-slate-500">საშ. ₾/მ²</span>
                    <span className="font-bold text-blue-600 text-right">
                      {row.avgPricePerSqm.toLocaleString('ka-GE')}
                    </span>
                    <span className="text-slate-500">მედიანა</span>
                    <span className="text-right tabular-nums">
                      {row.medianPricePerSqm.toLocaleString('ka-GE')}
                    </span>
                    <span className="text-slate-500">განცხადება</span>
                    <span className="text-right tabular-nums">{row.count}</span>
                    <span className="text-slate-500">იყიდება / ქირა</span>
                    <span className="text-right tabular-nums">{row.forSale} / {row.forRent}</span>
                    <span className="text-slate-500">30 დღე</span>
                    <span
                      className={`text-right font-bold ${row.trend30d > 0 ? 'text-emerald-600' : row.trend30d < 0 ? 'text-red-500' : 'text-slate-400'}`}
                    >
                      {row.trend30d > 0 ? '+' : ''}{row.trend30d}%
                    </span>
                    {row.benchmarkPricePerSqm != null && (
                      <>
                        <span className="text-slate-500">Geostat</span>
                        <span className="text-right tabular-nums">
                          {row.benchmarkPricePerSqm.toLocaleString('ka-GE')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 z-[500] rounded-xl px-3 py-2 text-[10px] text-slate-600"
        style={{
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p className="font-bold text-slate-800 mb-1.5">
          {mode === 'price' ? '₾/მ² საშუალო' : mode === 'trend' ? '30 დღის ცვლილება' : 'განცხადებების რაოდენობა'}
        </p>
        {mode === 'trend' ? (
          <div className="flex items-center gap-2">
            {[
              { c: '#b91c1c', l: '-6%' },
              { c: '#ef4444', l: '-2%' },
              { c: '#94a3b8', l: '0' },
              { c: '#10b981', l: '+2%' },
              { c: '#047857', l: '+6%' },
            ].map(s => (
              <span key={s.l} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.c }} />
                {s.l}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="tabular-nums">{Math.round(min).toLocaleString('ka-GE')}</span>
            <span
              className="w-24 h-2 rounded-full"
              style={{ background: `linear-gradient(90deg, ${PRICE_RAMP.join(',')})` }}
            />
            <span className="tabular-nums">{Math.round(max).toLocaleString('ka-GE')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
