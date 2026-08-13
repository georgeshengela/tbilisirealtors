import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bed, Building2, MapPin, Maximize2, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import type { Property } from '../types/listing';
import { fetchBuildingFootprints, type AreaBoundary, type Ring } from '../lib/geoApi';
import { pointInRing } from '../lib/geoMath';
import { useTranslation } from '../i18n/LocaleContext';

interface ListingsMapProps {
  properties: Property[];
  /** Listings outside the selected area, drawn faded so the map keeps its context. */
  contextProperties?: Property[];
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  boundary: AreaBoundary | null;
  /** Changes whenever the filters change, which is when the map should re-frame. */
  fitKey: string;
  areaSearch: boolean;
  onAreaSearchChange: (enabled: boolean) => void;
  /** Hand-drawn search area, or null when the geo filter comes from a city/district. */
  drawnArea: Ring | null;
  onDrawnAreaChange: (ring: Ring | null) => void;
  formatPrice: (property: Property) => string;
  formatPricePerSqm: (property: Property) => string;
}

const DEFAULT_CENTER: [number, number] = [41.7151, 44.8271];
const WORLD_RING: Ring = [[-89.9, -179.9], [89.9, -179.9], [89.9, 179.9], [-89.9, 179.9]];
const BUILDINGS_MIN_ZOOM = 16;

/** Korter keeps the viewport in the URL as `#zoom/lat/lng` — so do we. */
function readHashView(): { center: [number, number]; zoom: number } | null {
  const match = window.location.hash.match(
    /^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/,
  );
  if (!match) return null;
  const [, zoom, lat, lng] = match;
  return { zoom: Number(zoom), center: [Number(lat), Number(lng)] };
}

function HashSync() {
  const map = useMap();

  useEffect(() => {
    const write = () => {
      const { lat, lng } = map.getCenter();
      const hash = `#${map.getZoom().toFixed(2)}/${lat.toFixed(6)}/${lng.toFixed(6)}`;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    };

    map.on('moveend', write);
    return () => { map.off('moveend', write); };
  }, [map]);

  return null;
}

/** Korter shows small dots that grow as you zoom in. */
function dotRadius(zoom: number, active: boolean, premium: boolean) {
  let r = 4;
  if (zoom >= 17) r = 8;
  else if (zoom >= 15) r = 7;
  else if (zoom >= 13) r = 6;
  else if (zoom >= 11) r = 5;
  if (premium) r += 1;
  if (active) r += 3;
  return r;
}

function MapStateBridge({
  onZoom,
  onBounds,
}: {
  onZoom: (zoom: number) => void;
  onBounds: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onZoom(map.getZoom());
    onBounds(map.getBounds());
  }, [map, onZoom, onBounds]);

  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    moveend: () => onBounds(map.getBounds()),
  });

  return null;
}

function FitToArea({
  properties,
  boundary,
  fitKey,
  skipFirstFit,
}: {
  properties: Property[];
  boundary: AreaBoundary | null;
  fitKey: string;
  skipFirstFit: boolean;
}) {
  const map = useMap();
  const initialFitKey = useRef(fitKey);

  useEffect(() => {
    // A viewport restored from the URL wins until the filters actually change,
    // so a shared link keeps its zoom even when a district outline loads after it.
    if (skipFirstFit && fitKey === initialFitKey.current) return;

    if (boundary) {
      const [south, west, north, east] = boundary.bbox;
      const bounds = L.latLngBounds([south, west], [north, east]);
      // Keep matches that sit just outside the outline in view as well.
      for (const p of properties) bounds.extend([p.coordinates.lat, p.coordinates.lng]);
      map.fitBounds(bounds, { padding: [40, 40], animate: true });
      return;
    }

    if (properties.length === 0) {
      map.setView(DEFAULT_CENTER, 12, { animate: true });
      return;
    }

    if (properties.length === 1) {
      const p = properties[0];
      map.setView([p.coordinates.lat, p.coordinates.lng], 15, { animate: true });
      return;
    }

    map.fitBounds(
      L.latLngBounds(properties.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number])),
      { padding: [56, 56], maxZoom: 15, animate: true },
    );
    // Re-frame when the filters change or results arrive, never while panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, boundary, properties.length, map]);

  return null;
}

/** Ignore pointer wobble below this, so a stray click cannot become an area. */
const MIN_LASSO_SIZE_PX = 24;
/** Sampling distance along the drag, dense enough to look smooth. */
const LASSO_SAMPLE_PX = 6;

/**
 * Freehand area selection: press and drag across the map to outline a region,
 * release to apply it. Points are kept as coordinates, so the shape stays put
 * if the map is zoomed afterwards.
 */
function AreaLasso({
  active,
  onFinish,
  onCancel,
}: {
  active: boolean;
  onFinish: (ring: Ring) => void;
  onCancel: () => void;
}) {
  const map = useMap();
  const [trace, setTrace] = useState<Ring>([]);

  useEffect(() => {
    if (!active) return;

    const container = map.getContainer();
    const points: Ring = [];
    let drawing = false;

    container.classList.add('is-drawing');
    // The lasso owns the pointer while it is active.
    map.closePopup();
    map.dragging.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();

    const reset = () => {
      drawing = false;
      points.length = 0;
      setTrace([]);
    };

    const toLatLng = (event: PointerEvent): [number, number] => {
      const rect = container.getBoundingClientRect();
      const { lat, lng } = map.containerPointToLatLng(
        L.point(event.clientX - rect.left, event.clientY - rect.top),
      );
      return [lat, lng];
    };

    /** Pixel span of the trace, used to reject accidental taps. */
    const spanPx = () => {
      const projected = points.map(([lat, lng]) => map.latLngToContainerPoint([lat, lng]));
      const xs = projected.map(p => p.x);
      const ys = projected.map(p => p.y);
      return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // The zoom buttons live inside the map, and they keep working.
      if ((event.target as HTMLElement | null)?.closest('.leaflet-control-container')) return;
      drawing = true;
      container.setPointerCapture?.(event.pointerId);
      points.length = 0;
      points.push(toLatLng(event));
      setTrace([...points]);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drawing) return;
      const next = toLatLng(event);
      const last = points[points.length - 1];

      if (last) {
        const from = map.latLngToContainerPoint(last);
        const to = map.latLngToContainerPoint(next);
        if (from.distanceTo(to) < LASSO_SAMPLE_PX) return;
      }

      points.push(next);
      setTrace([...points]);
      event.preventDefault();
    };

    const onPointerUp = () => {
      if (!drawing) return;
      const ring = [...points];
      const usable = ring.length >= 3 && spanPx() >= MIN_LASSO_SIZE_PX;
      reset();
      // A stray tap is not an area, so stay armed instead of applying a sliver.
      if (usable) onFinish(ring);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      reset();
      onCancel();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);

      container.classList.remove('is-drawing');
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      setTrace([]);
    };
  }, [active, map, onFinish, onCancel]);

  if (!active || trace.length < 2) return null;

  return (
    <Polygon
      positions={trace}
      pathOptions={{
        color: '#4f46e5',
        weight: 2,
        dashArray: '6 5',
        fillColor: '#6366f1',
        fillOpacity: 0.12,
        interactive: false,
        className: 'listings-lasso',
      }}
    />
  );
}

/** Dims everything outside the selected city/district, like Korter's geo filter. */
function BoundaryHighlight({ boundary }: { boundary: AreaBoundary | null }) {
  if (!boundary) return null;

  return (
    <>
      <Polygon
        positions={[WORLD_RING, ...boundary.rings]}
        pathOptions={{
          stroke: false,
          fillColor: '#64748b',
          fillOpacity: 0.34,
          fillRule: 'evenodd',
          interactive: false,
          className: 'listings-map-mask',
        }}
      />
      <Polygon
        positions={boundary.rings}
        pathOptions={{
          color: '#ffffff',
          weight: 4,
          opacity: 0.95,
          fill: false,
          interactive: false,
        }}
      />
      <Polygon
        positions={boundary.rings}
        pathOptions={{
          color: '#4f46e5',
          weight: 1.75,
          opacity: 0.85,
          dashArray: '7 6',
          fill: false,
          interactive: false,
        }}
      />
    </>
  );
}

interface Footprint {
  ring: Ring;
  bbox: [number, number, number, number];
}

function ringBbox(ring: Ring): [number, number, number, number] {
  let south = 90, west = 180, north = -90, east = -180;
  for (const [lat, lng] of ring) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }
  return [south, west, north, east];
}

/** Metres from the origin to the segment a→b, in a local flat projection. */
function distanceToSegment(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy);
}

/** Distance from a point to the closest wall of a footprint, in metres. */
function distanceToRing(ring: Ring, lat: number, lng: number): number {
  const metresPerLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  let closest = Infinity;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = (ring[j][1] - lng) * metresPerLng;
    const ay = (ring[j][0] - lat) * 111_320;
    const bx = (ring[i][1] - lng) * metresPerLng;
    const by = (ring[i][0] - lat) * 111_320;
    closest = Math.min(closest, distanceToSegment(ax, ay, bx, by));
  }

  return closest;
}

/**
 * The footprint a listing sits in. Coordinates that landed on the pavement snap
 * to the closest building, since listing addresses are rarely pinpoint accurate.
 */
const SNAP_RADIUS_M = 60;

function findFootprint(footprints: Footprint[], lat: number, lng: number): Ring | null {
  const pad = SNAP_RADIUS_M / 111_320 + 0.0002;
  let nearest: { ring: Ring; distance: number } | null = null;

  for (const { ring, bbox } of footprints) {
    const [south, west, north, east] = bbox;
    if (lat < south - pad || lat > north + pad || lng < west - pad || lng > east + pad) continue;

    if (pointInRing(ring, lat, lng)) return ring;

    const distance = distanceToRing(ring, lat, lng);
    if (!nearest || distance < nearest.distance) nearest = { ring, distance };
  }

  return nearest && nearest.distance <= SNAP_RADIUS_M ? nearest.ring : null;
}

/**
 * Once zoomed in, a listing stops being a dot and its whole building is filled
 * instead — the way Korter shows an address.
 */
function BuildingHighlights({
  properties,
  activeId,
  zoom,
  onActiveChange,
  onMatchedChange,
  onLoadingChange,
  formatPrice,
  formatPricePerSqm,
}: {
  properties: Property[];
  activeId: string | null;
  zoom: number;
  onActiveChange: (id: string | null) => void;
  onMatchedChange: (ids: Set<string>) => void;
  onLoadingChange: (loading: boolean) => void;
  formatPrice: (p: Property) => string;
  formatPricePerSqm: (p: Property) => string;
}) {
  const map = useMap();
  const [bboxKey, setBboxKey] = useState<string | null>(null);
  const [footprints, setFootprints] = useState<Footprint[]>([]);

  useEffect(() => {
    if (zoom < BUILDINGS_MIN_ZOOM) {
      setBboxKey(null);
      return;
    }

    const update = () => {
      const b = map.getBounds().pad(0.12);
      setBboxKey([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(n => n.toFixed(4)).join(','));
    };

    const timer = window.setTimeout(update, 350);
    map.on('moveend', update);
    return () => {
      window.clearTimeout(timer);
      map.off('moveend', update);
    };
  }, [map, zoom]);

  useEffect(() => {
    if (!bboxKey) {
      setFootprints([]);
      onLoadingChange(false);
      return;
    }

    const controller = new AbortController();
    const bbox = bboxKey.split(',').map(Number) as [number, number, number, number];
    onLoadingChange(true);

    fetchBuildingFootprints(bbox, controller.signal)
      .then(rings => {
        if (controller.signal.aborted) return;
        setFootprints(rings.map(ring => ({ ring, bbox: ringBbox(ring) })));
      })
      .catch(() => {
        /* offline or Overpass throttling — listings stay as dots */
      })
      .finally(() => {
        if (!controller.signal.aborted) onLoadingChange(false);
      });

    return () => controller.abort();
  }, [bboxKey, onLoadingChange]);

  const matches = useMemo(() => {
    if (!footprints.length) return [];
    const found: { property: Property; ring: Ring }[] = [];
    for (const property of properties) {
      const ring = findFootprint(footprints, property.coordinates.lat, property.coordinates.lng);
      if (ring) found.push({ property, ring });
    }
    return found;
  }, [footprints, properties]);

  const matchedKey = useMemo(
    () => matches.map(m => m.property.id).sort().join(','),
    [matches],
  );

  /* Every other footprint is painted flat grey so the highlighted ones read as
     buildings rather than floating blobs. */
  const baseLayerRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);

  useEffect(() => {
    if (!map.getPane('listingBuildingsBase')) {
      const pane = map.createPane('listingBuildingsBase');
      pane.style.zIndex = '395';
      pane.style.pointerEvents = 'none';
    }
    // One shared canvas keeps thousands of footprints cheap to draw.
    const renderer = L.canvas({ pane: 'listingBuildingsBase' }).addTo(map);
    const group = L.layerGroup([]).addTo(map);
    rendererRef.current = renderer;
    baseLayerRef.current = group;
    return () => {
      group.remove();
      renderer.remove();
      baseLayerRef.current = null;
      rendererRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = baseLayerRef.current;
    const renderer = rendererRef.current;
    if (!group || !renderer) return;

    group.clearLayers();
    if (!footprints.length) return;

    const matchedRings = new Set(matches.map(m => m.ring));

    for (const { ring } of footprints) {
      if (matchedRings.has(ring)) continue;
      L.polygon(ring, {
        renderer,
        pane: 'listingBuildingsBase',
        stroke: true,
        color: '#d2d7e0',
        weight: 0.6,
        fillColor: '#e3e7ee',
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    }
  }, [footprints, matches]);

  useEffect(() => {
    onMatchedChange(new Set(matchedKey ? matchedKey.split(',') : []));
  }, [matchedKey, onMatchedChange]);

  // The hovered building is drawn last so its darker fill is never covered.
  const ordered = useMemo(
    () => [...matches].sort((a, b) => Number(a.property.id === activeId) - Number(b.property.id === activeId)),
    [matches, activeId],
  );

  return (
    <>
      {ordered.map(({ property, ring }) => {
        const active = property.id === activeId;
        return (
          <Polygon
            key={`building-${property.id}`}
            positions={ring}
            pathOptions={{
              stroke: active,
              color: '#ffffff',
              weight: 2,
              fillColor: active ? '#4338ca' : '#6366f1',
              fillOpacity: 1,
              className: `listing-building ${active ? 'is-active' : ''}`,
            }}
            eventHandlers={{
              mouseover: () => onActiveChange(property.id),
              mouseout: () => onActiveChange(null),
              click: () => onActiveChange(property.id),
            }}
          >
            <Tooltip sticky opacity={1} className="listing-dot-tooltip">
              {formatPrice(property)}
            </Tooltip>
            <Popup className="listing-map-leaflet-popup" closeButton={false} autoPanPadding={[28, 28]}>
              <MapPopupCard
                property={property}
                formatPrice={formatPrice}
                formatPricePerSqm={formatPricePerSqm}
              />
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}

/** Listings that have no building of their own stay as dots. */
function ListingDots({
  properties,
  activeId,
  zoom,
  matchedIds,
  onActiveChange,
  formatPrice,
  formatPricePerSqm,
}: {
  properties: Property[];
  activeId: string | null;
  zoom: number;
  matchedIds: Set<string>;
  onActiveChange: (id: string | null) => void;
  formatPrice: (p: Property) => string;
  formatPricePerSqm: (p: Property) => string;
}) {
  const map = useMap();

  return (
    <>
      {properties.map(property => {
        // A listing whose building is filled in doesn't need a dot as well.
        if (matchedIds.has(property.id)) return null;

        const active = property.id === activeId;
        return (
          <CircleMarker
            key={property.id}
            center={[property.coordinates.lat, property.coordinates.lng]}
            radius={dotRadius(zoom, active, property.isPremium)}
            pathOptions={{
              color: '#ffffff',
              weight: active ? 2.5 : 1.25,
              fillColor: active ? '#4338ca' : property.isPremium ? '#4f46e5' : '#6366f1',
              fillOpacity: 0.96,
              className: `listing-dot ${active ? 'is-active' : ''}`,
            }}
            eventHandlers={{
              mouseover: () => onActiveChange(property.id),
              mouseout: () => onActiveChange(null),
              click: () => {
                onActiveChange(property.id);
                // Drop to street level so the listing's building gets filled in.
                if (map.getZoom() < BUILDINGS_MIN_ZOOM) {
                  map.flyTo([property.coordinates.lat, property.coordinates.lng], 17, { duration: 0.8 });
                }
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} className="listing-dot-tooltip">
              {formatPrice(property)}
            </Tooltip>
            {/* Below building zoom a click zooms in instead of opening a card, so no
                card flashes up only to vanish as the dot becomes a building. */}
            {zoom >= BUILDINGS_MIN_ZOOM ? (
              <Popup className="listing-map-leaflet-popup" closeButton={false} autoPanPadding={[28, 28]}>
                <MapPopupCard
                  property={property}
                  formatPrice={formatPrice}
                  formatPricePerSqm={formatPricePerSqm}
                />
              </Popup>
            ) : null}
          </CircleMarker>
        );
      })}
    </>
  );
}

function MapZoomControls() {
  const map = useMap();

  useEffect(() => {
    const control = new L.Control({ position: 'bottomright' });

    control.onAdd = () => {
      const wrap = L.DomUtil.create('div', 'listings-map-controls');
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.disableScrollPropagation(wrap);

      const make = (label: string, title: string, action: () => void) => {
        const btn = L.DomUtil.create('button', 'listings-map-control-btn', wrap);
        btn.type = 'button';
        btn.textContent = label;
        btn.setAttribute('aria-label', title);
        btn.onclick = action;
      };

      make('+', 'Zoom in', () => map.zoomIn());
      make('−', 'Zoom out', () => map.zoomOut());

      return wrap;
    };

    control.addTo(map);
    return () => { control.remove(); };
  }, [map]);

  return null;
}

/** A price tooltip under an open card is just noise, so it steps aside. */
function PopupTooltipGuard() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const open = () => container.classList.add('has-popup');
    const close = () => container.classList.remove('has-popup');

    map.on('popupopen', open);
    map.on('popupclose', close);

    return () => {
      map.off('popupopen', open);
      map.off('popupclose', close);
      close();
    };
  }, [map]);

  return null;
}

function MapPopupCard({
  property,
  formatPrice,
  formatPricePerSqm,
}: {
  property: Property;
  formatPrice: (p: Property) => string;
  formatPricePerSqm: (p: Property) => string;
}) {
  const { t } = useTranslation();

  return (
    <Link to={`/property/${property.id}`} className="listing-map-popup">
      <div className="listing-map-popup__thumb">
        <img src={property.images[0]} alt="" />
        {property.isPremium && (
          <span className="listing-map-popup__vip">
            <Sparkles size={8} fill="currentColor" /> VIP
          </span>
        )}
      </div>

      <div className="listing-map-popup__body">
        <p className="listing-map-popup__price">
          {formatPrice(property)}
          {property.status === 'sale' && (
            <span className="listing-map-popup__sqm">{formatPricePerSqm(property)}</span>
          )}
        </p>

        <p className="listing-map-popup__meta">
          <Maximize2 size={10} strokeWidth={2.2} />
          <strong>{property.area}</strong> მ²
          {property.bedrooms > 0 && (
            <>
              <span className="listing-map-popup__sep" />
              <Bed size={11} strokeWidth={2.2} />
              <strong>{property.bedrooms}</strong> {t('property.bedsShort')}
            </>
          )}
        </p>

        <p className="listing-map-popup__address">
          <MapPin size={10} strokeWidth={2.4} />
          <span>{property.address || `${property.district}, ${property.city}`}</span>
        </p>
      </div>
    </Link>
  );
}

export default function ListingsMap({
  properties,
  contextProperties = [],
  activeId,
  onActiveChange,
  onBoundsChange,
  boundary,
  fitKey,
  areaSearch,
  onAreaSearchChange,
  drawnArea,
  onDrawnAreaChange,
  formatPrice,
  formatPricePerSqm,
}: ListingsMapProps) {
  const { t } = useTranslation();
  const [hashView] = useState(readHashView);
  const [zoom, setZoom] = useState(hashView?.zoom ?? 12);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const finishDrawing = useCallback(
    (ring: Ring) => {
      setDrawing(false);
      onDrawnAreaChange(ring);
    },
    [onDrawnAreaChange],
  );

  const cancelDrawing = useCallback(() => setDrawing(false), []);

  const ordered = useMemo(
    () => [...properties].sort((a, b) => {
      const score = (p: Property) => (p.id === activeId ? 2 : p.isPremium ? 1 : 0);
      return score(a) - score(b);
    }),
    [properties, activeId],
  );

  return (
    <div className="listings-map-panel">
      <MapContainer
        center={hashView?.center ?? DEFAULT_CENTER}
        zoom={hashView?.zoom ?? 12}
        minZoom={6}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        className="listings-map-container"
      >
        {/* Positron keeps roads and labels muted so the highlighted buildings carry the map. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

        <MapStateBridge onZoom={setZoom} onBounds={onBoundsChange} />
        <PopupTooltipGuard />
        <HashSync />
        <FitToArea
          properties={properties}
          boundary={boundary}
          fitKey={fitKey}
          skipFirstFit={hashView !== null}
        />
        <BoundaryHighlight boundary={boundary} />
        <BuildingHighlights
          properties={properties}
          activeId={activeId}
          zoom={zoom}
          onActiveChange={onActiveChange}
          onMatchedChange={setMatchedIds}
          onLoadingChange={setBuildingsLoading}
          formatPrice={formatPrice}
          formatPricePerSqm={formatPricePerSqm}
        />

        {contextProperties.map(property => (
          <CircleMarker
            key={`ctx-${property.id}`}
            center={[property.coordinates.lat, property.coordinates.lng]}
            radius={Math.max(3, dotRadius(zoom, false, false) - 2)}
            interactive={false}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              opacity: 0.7,
              fillColor: '#a3a8dd',
              fillOpacity: 0.55,
              className: 'listing-dot is-context',
            }}
          />
        ))}

        <ListingDots
          properties={ordered}
          activeId={activeId}
          zoom={zoom}
          matchedIds={matchedIds}
          onActiveChange={onActiveChange}
          formatPrice={formatPrice}
          formatPricePerSqm={formatPricePerSqm}
        />

        <AreaLasso active={drawing} onFinish={finishDrawing} onCancel={cancelDrawing} />
        <MapZoomControls />
      </MapContainer>

      <div className="listings-map-tools">
        {drawing ? (
          <button type="button" className="listings-map-tool is-active" onClick={cancelDrawing}>
            <X size={14} strokeWidth={2.4} />
            {t('listings.drawCancel')}
          </button>
        ) : (
          <>
            <button type="button" className="listings-map-tool" onClick={() => setDrawing(true)}>
              <Pencil size={14} strokeWidth={2.2} />
              {drawnArea ? t('listings.drawRedraw') : t('listings.drawArea')}
            </button>
            {drawnArea ? (
              <button
                type="button"
                className="listings-map-tool is-danger"
                onClick={() => onDrawnAreaChange(null)}
              >
                <Trash2 size={14} strokeWidth={2.2} />
                {t('listings.drawClear')}
              </button>
            ) : null}
          </>
        )}
      </div>

      {drawing ? (
        <div className="listings-map-pill is-hint">{t('listings.drawHint')}</div>
      ) : drawnArea ? null : areaSearch ? (
        <div className="listings-map-pill">
          <span>{t('listings.areaSearchOn')}</span>
          <button type="button" onClick={() => onAreaSearchChange(false)} aria-label={t('listings.areaSearchOff')}>
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <button type="button" className="listings-map-pill is-button" onClick={() => onAreaSearchChange(true)}>
          {t('listings.areaSearchEnable')}
        </button>
      )}

      {zoom < BUILDINGS_MIN_ZOOM ? (
        <div className="listings-map-note">
          <Building2 size={13} strokeWidth={2.2} />
          {t('listings.zoomForBuildings')}
        </div>
      ) : buildingsLoading ? (
        <div className="listings-map-note">
          <span className="listings-map-note__spinner" />
          {t('listings.loadingBuildings')}
        </div>
      ) : null}

      <div className="listings-map-attribution">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
        {' · '}
        <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a>
      </div>
    </div>
  );
}
