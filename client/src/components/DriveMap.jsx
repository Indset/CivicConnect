import { MapContainer, Marker, TileLayer } from 'react-leaflet';

export default function DriveMap({ location, title }) {
  const coordinates = location?.coordinates;
  if (!coordinates) {
    return (
      <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-600">
        Map coordinates are not available.
      </p>
    );
  }

  const center = [coordinates.lat, coordinates.lng];
  return (
    <div aria-label={`Map showing the location of ${title}`} className="mt-3 h-44 overflow-hidden rounded-lg" role="region">
      <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
      </MapContainer>
    </div>
  );
}
