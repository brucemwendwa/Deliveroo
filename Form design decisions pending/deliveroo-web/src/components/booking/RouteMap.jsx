import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useJourneyClock from '../../hooks/useJourneyClock';
import { arcBetween, measurePath, pointAlong, vehicleLeg } from '../../lib/journey';
import { color, radius } from '../../theme';
import { CITY_CENTER } from '../../api/geo';
import { TRANSPORT, modeMeta, usesRoadNetwork } from '../../lib/transport';

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
      box-shadow:0 6px 14px -4px rgba(28,32,31,.6);
      font:600 11px/1 'Inter',system-ui,sans-serif;color:${ring};
    ">${glyph || ''}</span>`
  });

const PICKUP_ICON = dot(color.white, color.green, 'A');
const DESTINATION_ICON = dot(color.greenDeep, color.orange, 'B');

/**
 * The vehicle. Material Symbols is loaded document-wide, so a ligature span works
 * inside a divIcon; the drone is inline SVG for the same reason it is in
 * TransportGlyph — the icon set has no dependable drone glyph.
 */
const DRONE_SVG = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="${color.ink}" stroke-width="1.8" stroke-linecap="round">
  <path d="M7.4 7.4 16.6 16.6M16.6 7.4 7.4 16.6"/><path d="M3.4 7.4h6M3.4 16.6h6M14.6 7.4h6M14.6 16.6h6"/>
  <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1.6" fill="${color.ink}" stroke="none"/></svg>`;

const vehicleIcon = (mode, moving, gliding = false) =>
  L.divIcon({
    // The className rides on the element Leaflet writes the position transform to, so
    // the CSS transition that smooths the journey between frames hangs off it.
    className: gliding ? 'vehicle-marker' : '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;">
      ${moving ? `<span style="position:absolute;inset:0;border-radius:999px;background:${color.orange};opacity:.35;animation:pulsering 2.4s ease-out infinite;"></span>` : ''}
      <span style="
        position:relative;display:flex;align-items:center;justify-content:center;
        width:34px;height:34px;border-radius:999px;background:${color.orange};
        border:3px solid ${color.white};box-shadow:0 8px 18px -6px rgba(28,32,31,.7);
        font-family:'Material Symbols Rounded';font-size:19px;line-height:1;color:${color.ink};
      ">${mode === TRANSPORT.DRONE ? DRONE_SVG : modeMeta(mode).icon}</span>
    </span>`
  });

const HERE_ICON = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${color.white};border:4px solid ${color.inkSoft};box-shadow:0 4px 10px -3px rgba(28,32,31,.6);"></span>`
});

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
  mode,
  presentLocation,
  onPick,
  height = 'clamp(240px,34vw,380px)',
  draggableCourier = false,
  onCourierDrag,
  moving = false,
  journey = null
}) {
  // Road and motorbike both drive the road network, so they get the router's real
  // polyline; a flight, a sailing and a drone hop get an honest schematic arc.
  const flies = Boolean(mode) && !usesRoadNetwork(mode);

  const path = useMemo(() => {
    if (flies && pickup && destination) return arcBetween(pickup, destination);
    return route?.coordinates?.length > 1 ? route.coordinates : null;
  }, [flies, pickup, destination, route]);

  // §25 — the vehicle walks the journey rather than sitting where the API last saw it.
  // The admin console drags this marker by hand, so there it stays put.
  const animated = Boolean(journey) && !draggableCourier;
  // Whether to burn animation frames at all, decided before the clock is asked for so
  // the hook is never called conditionally. It settles to false of its own accord when
  // the agent reaches the pickup or the parcel lands, and the clock drops to a crawl.
  const live = animated && vehicleLeg(journey).moving;
  const clock = useJourneyClock(live);
  const leg = animated ? vehicleLeg(journey, clock) : null;

  // The approach is a straight run at the pickup: we have the agent's position and
  // their ETA, not a route for them, and inventing one would be fiction on a map.
  const approach = useMemo(
    () => (courier && pickup ? [[courier.lat, courier.lng], [pickup.lat, pickup.lng]] : null),
    [courier, pickup]
  );
  const measuredRoute = useMemo(() => measurePath(path), [path]);
  const measuredApproach = useMemo(() => measurePath(approach), [approach]);

  const travelled = leg?.leg === 'approach' ? pointAlong(measuredApproach, leg.fraction) : null;
  const carried = leg?.leg === 'route' ? pointAlong(measuredRoute, leg.fraction) : null;
  const vehicleAt = travelled || carried || (courier ? [courier.lat, courier.lng] : null);
  const vehicleMoving = leg ? leg.moving : moving;
  // Rebuilt only when the vehicle or its state changes. Built inline it would be a new
  // icon every frame, and Leaflet would replace the marker's DOM — throwing away both
  // the CSS glide and the pulse ring on every single tick.
  const icon = useMemo(
    () => vehicleIcon(mode || TRANSPORT.ROAD, vehicleMoving, animated),
    [mode, vehicleMoving, animated]
  );

  // Anchors only — never the animated marker. Frame refits whenever this changes, and
  // a map that re-fits eight times a second to chase its own vehicle is unusable.
  const points = useMemo(
    () => [pickup, destination, courier, presentLocation].filter(Boolean).map((p) => [p.lat, p.lng]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      pickup?.lat, pickup?.lng,
      destination?.lat, destination?.lng,
      courier?.lat, courier?.lng,
      presentLocation?.lat, presentLocation?.lng
    ]
  );
  const center = points[0] || [CITY_CENTER.lat, CITY_CENTER.lng];

  return (
    <div
      style={{
        height,
        borderRadius: radius.card,
        overflow: 'hidden',
        border: `1px solid ${color.border}`,
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

        {path && (
          <>
            {/* Casing under the line keeps it legible over pale tiles. */}
            <Polyline positions={path} pathOptions={{ color: color.white, weight: 8, opacity: 0.9 }} />
            <Polyline
              positions={path}
              pathOptions={{
                color: color.orange,
                weight: 4,
                opacity: 1,
                // Solid lines draw themselves in; dashed ones fade, because a CSS
                // dasharray would overwrite the pattern that carries the meaning.
                className: flies || route?.estimated ? 'route-fade' : 'route-line',
                dashArray: flies ? '2 10' : route?.estimated ? '9 9' : undefined,
                lineCap: flies ? 'round' : undefined
              }}
            />
          </>
        )}

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={PICKUP_ICON}>
            <Tooltip direction="top" offset={[0, -12]}>{pickup.name || 'Pickup'}</Tooltip>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={DESTINATION_ICON}>
            <Tooltip direction="top" offset={[0, -12]}>{destination.name || 'Destination'}</Tooltip>
          </Marker>
        )}
        {presentLocation && (
          <Marker position={[presentLocation.lat, presentLocation.lng]} icon={HERE_ICON}>
            <Tooltip direction="top" offset={[0, -10]}>{presentLocation.label}</Tooltip>
          </Marker>
        )}
        {/* Where the agent is coming from, while they are still coming. Dashed and pale:
            it is the direction of travel, not a route we claim they will drive. */}
        {leg?.leg === 'approach' && approach && (
          <Polyline
            positions={approach}
            pathOptions={{ color: color.inkSoft, weight: 2, opacity: 0.5, dashArray: '3 8', lineCap: 'round' }}
          />
        )}

        {vehicleAt && (
          <Marker
            position={vehicleAt}
            icon={icon}
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
          >
            <Tooltip direction="top" offset={[0, -18]}>
              {courier?.name || modeMeta(mode || TRANSPORT.ROAD).label}
              {courier?.plate ? ` · ${courier.plate}` : ''}
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
