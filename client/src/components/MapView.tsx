import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { appConfig } from '../lib/config';
import { initialsFromName } from '../lib/geo';
import { travelerLabel, type MapMarkerModel } from '../lib/mapData';
import { poiSymbol, type PoiRow } from '../lib/poi';

type Props = {
  markers: MapMarkerModel[];
  pois?: PoiRow[];
  myLocation: { lat: number; lng: number } | null;
  onMessageUser?: (peerId: string) => void;
  trail?: Array<{ lat: number; lng: number }>;
};

function userIcon(marker: MapMarkerModel) {
  const initials = initialsFromName(marker.name);
  const opacity = marker.isStale || marker.isQuiet ? 0.55 : 1;
  const ring = marker.isSelf ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.85)';
  const age = marker.ageLabel
    ? `<div class="map-marker-age">${marker.ageLabel}</div>`
    : '';
  const selfClass = marker.isSelf ? ' is-self' : '';

  return L.divIcon({
    className: 'user-marker-wrap',
    html: `<div class="user-marker${selfClass}" style="--c:${marker.color};opacity:${opacity}">
      <div class="user-marker-name">${escapeHtml(marker.name)}</div>
      ${age}
      <div class="user-marker-dot" style="border:${ring}">${escapeHtml(initials)}</div>
    </div>`,
    iconSize: [64, 72],
    iconAnchor: [32, 60],
    popupAnchor: [0, -52],
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
    iconSize: [72, 56],
    iconAnchor: [36, 48],
    popupAnchor: [0, -40],
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function MapView({ markers, pois = [], myLocation, onMessageUser, trail = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const trailLayerRef = useRef<L.LayerGroup | null>(null);
  const myLocationRef = useRef(myLocation);
  const onMessageRef = useRef(onMessageUser);
  const centeredRef = useRef(false);

  myLocationRef.current = myLocation;
  onMessageRef.current = onMessageUser;

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

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    const LocateControl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'leaflet-bar locate-me-btn');
        btn.type = 'button';
        btn.title = 'חזרה למיקום שלי';
        btn.setAttribute('aria-label', 'חזרה למיקום שלי');
        btn.textContent = '◎';
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

    // Fallback Khan marker always present (env coords); DB POIs layer adds more.
    L.marker([appConfig.khanLat, appConfig.khanLng], {
      icon: poiIcon({
        id: 'khan-fallback',
        name: 'חאן יותם',
        description: null,
        lat: appConfig.khanLat,
        lng: appConfig.khanLng,
        type: 'khan',
      }),
      interactive: false,
    }).addTo(map);

    userLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    trailLayerRef.current = L.layerGroup().addTo(map);
    map.fitBounds(bounds, { padding: [24, 24] });
    mapRef.current = map;

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
      const m = L.marker([marker.lat, marker.lng], { icon: userIcon(marker) });
      if (!marker.isSelf) {
        const popup = `
          <div class="map-popup" dir="rtl">
            <strong>${escapeHtml(marker.name)}</strong>
            <div>${escapeHtml(travelerLabel(marker.travelerType))}</div>
            <button type="button" class="map-popup-msg" data-peer="${marker.userId}">שליחת הודעה</button>
          </div>`;
        m.bindPopup(popup);
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
      const nearKhan =
        poi.type === 'khan' &&
        Math.abs(poi.lat - appConfig.khanLat) < 0.0002 &&
        Math.abs(poi.lng - appConfig.khanLng) < 0.0002;
      if (nearKhan) continue;

      const m = L.marker([poi.lat, poi.lng], { icon: poiIcon(poi) });
      const desc = poi.description ? `<div>${escapeHtml(poi.description)}</div>` : '';
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
