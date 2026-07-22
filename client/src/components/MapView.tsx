import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { appConfig } from '../lib/config';
import { travelerLabel, type MapMarkerModel } from '../lib/mapData';
import { poiSymbol, type PoiRow } from '../lib/poi';

type Props = {
  markers: MapMarkerModel[];
  pois?: PoiRow[];
  myLocation: { lat: number; lng: number } | null;
  onMessageUser?: (peerId: string) => void;
  trail?: Array<{ lat: number; lng: number }>;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
};

function userIcon(marker: MapMarkerModel) {
  const opacity = marker.isStale || marker.isQuiet ? 0.55 : 1;
  const selfClass = marker.isSelf ? ' is-self' : '';
  const initial = firstInitial(marker.name);

  return L.divIcon({
    className: 'user-marker-wrap',
    html: `<div class="user-marker${selfClass}" style="--c:${marker.color};opacity:${opacity}">
      <div class="user-marker-head">${escapeHtml(initial)}</div>
      <div class="user-marker-tail" aria-hidden="true"></div>
    </div>`,
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    popupAnchor: [0, -32],
  });
}

function poiIcon(poi: PoiRow) {
  const symbol = poiSymbol(poi.type);
  return L.divIcon({
    className: 'poi-marker-wrap',
    html: `<div class="poi-marker poi-${poi.type}">
      <div class="poi-marker-label">${escapeHtml(poi.name)}</div>
      <div class="poi-marker-dot">${symbol}</div>
    </div>`,
    iconSize: [54, 42],
    iconAnchor: [27, 36],
    popupAnchor: [0, -30],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Linkify http(s) URLs in already-escaped text. Call only after escapeHtml. */
function linkifyEscapedUrls(escaped: string): string {
  return escaped.replace(
    /https?:\/\/[^\s<]+/gi,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
  );
}

function markerPopup(marker: MapMarkerModel) {
  const age = marker.ageLabel ? `<div class="map-marker-age">${escapeHtml(marker.ageLabel)}</div>` : '';
  const action = marker.isSelf
    ? ''
    : `<button type="button" class="map-popup-msg" data-peer="${marker.userId}">שליחת הודעה</button>`;

  return `
    <div class="map-popup" dir="rtl">
      <strong>${escapeHtml(marker.name)}</strong>
      ${age}
      <div>${escapeHtml(travelerLabel(marker.travelerType))}</div>
      ${action}
    </div>`;
}

function firstInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}

export function MapView({
  markers,
  pois = [],
  myLocation,
  onMessageUser,
  trail = [],
  onMapClick,
}: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const trailLayerRef = useRef<L.LayerGroup | null>(null);
  const myLocationRef = useRef(myLocation);
  const onMessageRef = useRef(onMessageUser);
  const onMapClickRef = useRef(onMapClick);
  const navigateRef = useRef(navigate);
  const centeredRef = useRef(false);

  myLocationRef.current = myLocation;
  onMessageRef.current = onMessageUser;
  onMapClickRef.current = onMapClick;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    const bounds = L.latLngBounds(
      L.latLng(appConfig.mapBoundsSw[0], appConfig.mapBoundsSw[1]),
      L.latLng(appConfig.mapBoundsNe[0], appConfig.mapBoundsNe[1]),
    );

    const map = L.map(container, {
      zoomControl: false,
      maxBounds: bounds.pad(0.15),
      minZoom: 6,
      maxZoom: 18,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    // bottomleft stack (bottom → top): zoom, locate, help
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    const LocateControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'leaflet-bar locate-me-btn');
        btn.type = 'button';
        btn.title = 'חזרה למיקום שלי';
        btn.setAttribute('aria-label', 'חזרה למיקום שלי');
        btn.textContent = '◎';
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stop(e);
          const here = myLocationRef.current;
          if (here) {
            map.flyTo([here.lat, here.lng], 14, { duration: 0.6 });
          }
        });
        return btn;
      },
    });
    map.addControl(new LocateControl({ position: 'bottomleft' }));

    const HelpControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'leaflet-bar locate-me-btn map-help-btn');
        btn.type = 'button';
        btn.title = 'מדריך שימוש';
        btn.setAttribute('aria-label', 'מדריך שימוש');
        btn.textContent = '?';
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stop(e);
          navigateRef.current('/help');
        });
        return btn;
      },
    });
    map.addControl(new HelpControl({ position: 'bottomleft' }));

    userLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    trailLayerRef.current = L.layerGroup().addTo(map);
    map.fitBounds(bounds, { padding: [24, 24] });
    mapRef.current = map;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('click', handleMapClick);

    const invalidate = () => map.invalidateSize();
    requestAnimationFrame(invalidate);
    const t1 = window.setTimeout(invalidate, 100);
    const t2 = window.setTimeout(invalidate, 400);
    const ro = new ResizeObserver(() => invalidate());
    ro.observe(container);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
      userLayerRef.current = null;
      poiLayerRef.current = null;
      trailLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myLocation || centeredRef.current) return;
    map.setView([myLocation.lat, myLocation.lng], 14);
    map.invalidateSize();
    centeredRef.current = true;
  }, [myLocation]);

  useEffect(() => {
    const layer = userLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const marker of markers) {
      const m = L.marker([marker.lat, marker.lng], {
        icon: userIcon(marker),
        userId: marker.userId,
      } as L.MarkerOptions);
      m.bindPopup(markerPopup(marker));
      if (!marker.isSelf) {
        m.on('popupopen', () => {
          const btn = document.querySelector(
            `.map-popup-msg[data-peer="${marker.userId}"]`,
          ) as HTMLButtonElement | null;
          if (!btn) return;
          const handler = (ev: MouseEvent) => {
            ev.preventDefault();
            onMessageRef.current?.(marker.userId);
          };
          btn.addEventListener('click', handler, { once: true });
        });
      }
      m.addTo(layer);
    }
  }, [markers]);

  useEffect(() => {
    const layer = poiLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const poi of pois) {
      const m = L.marker([poi.lat, poi.lng], { icon: poiIcon(poi) });
      const desc = poi.description
        ? `<div>${linkifyEscapedUrls(escapeHtml(poi.description))}</div>`
        : '';
      m.bindPopup(
        `<div class="map-popup" dir="rtl"><strong>${escapeHtml(poi.name)}</strong>${desc}</div>`,
      );
      m.addTo(layer);
    }
  }, [pois]);

  useEffect(() => {
    const layer = trailLayerRef.current;
    const map = mapRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (trail.length < 2) return;
    const line = L.polyline(
      trail.map((p) => [p.lat, p.lng] as [number, number]),
      { color: '#c45c26', weight: 4, opacity: 0.9 },
    );
    line.addTo(layer);
    map?.fitBounds(line.getBounds(), { padding: [40, 40] });
  }, [trail]);

  return <div ref={containerRef} className="map-canvas" dir="ltr" />;
}
