import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { color, radius } from '../../theme';
import { CITY_CENTER } from '../../api/geo';

// §7 — the map is a primary component of the booking experience, so it gets a muted
// basemap rather than default OSM tiles, and markers drawn from the site palette.
//
// Positron is greyscale by design, which lets the orange route read as the only
// saturated thing on screen. Attribution is required by the OSM and CARTO licences.
const TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Leaflet's default marker PNGs break under bundlers; divIcons also let us style them. */
const dot = (fill, ring, glyph) =>
  L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:26px;height:26px;border-radius:999px;
      background:${fill};border:3px solid ${ring};
      box-shadow:0 6px 14px -4px rgba(17,17,17,.6);
      font:700 11px/1 'JetBrains Mono',monospace;color:${ring};
    ">${glyph || ''}</span>`
  });

const PICKUP_ICON = dot(color.white, color.ink, 'A');
const DESTINATION_ICON = dot(color.ink, color.orange, 'B');
const COURIER_ICON = dot(color.orange, color.ink, '');

/** Keeps every marker and the whole route in frame as they change. */
function Frame({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [42, 42], maxZoom: 15, animate: true });
  }, [map, points]);
  return null;
}

/** §6 — lets the customer drop a pin instead of typing an address. */
function ClickToDrop({ onPick }) {
  useMapEvents({
    click(event) {
      onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

export default function RouteMap({
  pickup,
  destination,
  route,
  courier,
  onPick,
  height = 'clamp(240px,34vw,380px)',
  draggableCourier = false,
  onCourierDrag
}) {
  const points = [pickup, destination, courier].filter(Boolean).map((p) => [p.lat, p.lng]);
  const center = points[0] || [CITY_CENTER.lat, CITY_CENTER.lng];

  return (
    <div
      style={{
        height,
        borderRadius: radius.card,
        overflow: 'hidden',
        border: '1px solid rgba(17,17,17,.1)',
        background: color.paperWarm
      }}
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl
      >
        <TileLayer url={TILES} attribution={ATTRIBUTION} />
        {onPick && <ClickToDrop onPick={onPick} />}
        <Frame points={points} />

        {route?.coordinates?.length > 1 && (
          <>
            {/* Casing under the line keeps it legible over pale tiles. */}
            <Polyline positions={route.coordinates} pathOptions={{ color: color.white, weight: 8, opacity: 0.9 }} />
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: color.orange,
                weight: 4,
                opacity: 1,
                dashArray: route.estimated ? '9 9' : undefined
              }}
            />
          </>
        )}

        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={PICKUP_ICON} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={DESTINATION_ICON} />}
        {courier && (
          <Marker
            position={[courier.lat, courier.lng]}
            icon={COURIER_ICON}
            draggable={draggableCourier}
            eventHandlers={
              draggableCourier
                ? {
                    dragend(event) {
                      const { lat, lng } = event.target.getLatLng();
                      onCourierDrag?.({ lat, lng });
                    }
                  }
                : undefined
            }
          />
        )}
      </MapContainer>
    </div>
  );
}
