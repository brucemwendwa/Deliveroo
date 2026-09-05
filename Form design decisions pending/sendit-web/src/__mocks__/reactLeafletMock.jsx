// Leaflet needs layout APIs jsdom doesn't implement. Tests care that the booking flow
// renders and advances, not that tiles paint, so the map is stubbed out here.
const passthrough = ({ children }) => <div data-testid="map">{children}</div>;

export const MapContainer = passthrough;
export const TileLayer = () => null;
export const Marker = () => null;
export const Polyline = () => null;
export const Tooltip = () => null;
export const useMap = () => ({ setView() {}, fitBounds() {} });
export const useMapEvents = () => null;
