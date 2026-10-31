import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getComplaintCoordinates } from '@/utils/complaintLocation';
import { complaintStatusColors } from '@/data/complaintStatus';

const defaultCenter = [20.5937, 78.9629];

const markerIcon = (color) =>
  L.divIcon({
    className: 'civic-map-marker',
    html: `<span style="background-color:${color}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function CenterMap({ coordinates, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) map.flyTo([coordinates.lat, coordinates.lng], zoom);
  }, [coordinates, map, zoom]);
  return null;
}

function FitMarkers({ complaints }) {
  const map = useMap();
  useEffect(() => {
    const points = complaints
      .map(getComplaintCoordinates)
      .filter(Boolean)
      .map(({ lat, lng }) => [lat, lng]);
    if (points.length) map.fitBounds(points, { padding: [32, 32], maxZoom: 14 });
  }, [complaints, map]);
  return null;
}

function MapTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

export function LocationPicker({ coordinates, onSelect }) {
  const center = coordinates ? [coordinates.lat, coordinates.lng] : defaultCenter;
  return (
    <MapContainer
      center={center}
      zoom={coordinates ? 14 : 5}
      scrollWheelZoom
      className="h-80 w-full"
    >
      <MapTiles />
      <MapClickHandler onSelect={onSelect} />
      <CenterMap coordinates={coordinates} zoom={14} />
      {coordinates && (
        <Marker
          position={[coordinates.lat, coordinates.lng]}
          icon={markerIcon('#1d4ed8')}
          draggable
          eventHandlers={{
            dragend(event) {
              const position = event.target.getLatLng();
              onSelect({ lat: position.lat, lng: position.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}

export function ComplaintMap({
  complaints,
  fitAll = false,
  readOnlyComplaint,
  className = 'h-96 w-full',
}) {
  const complaintCoordinates = readOnlyComplaint && getComplaintCoordinates(readOnlyComplaint);
  const center = complaintCoordinates
    ? [complaintCoordinates.lat, complaintCoordinates.lng]
    : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={complaintCoordinates ? 15 : 5}
      scrollWheelZoom
      className={className}
    >
      <MapTiles />
      {fitAll && <FitMarkers complaints={complaints} />}
      {readOnlyComplaint && complaintCoordinates && (
        <Marker
          position={[complaintCoordinates.lat, complaintCoordinates.lng]}
          icon={markerIcon(complaintStatusColors[readOnlyComplaint.status] ?? '#475569')}
        />
      )}
      {complaints.map((complaint) => {
        const coordinates = getComplaintCoordinates(complaint);
        if (!coordinates) return null;
        const color = complaintStatusColors[complaint.status] ?? '#475569';
        return (
          <Marker
            key={complaint._id}
            position={[coordinates.lat, coordinates.lng]}
            icon={markerIcon(color)}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{complaint.title}</p>
                <p>{complaint.category?.name ?? 'Uncategorized'}</p>
                <p className="capitalize">{complaint.status.replaceAll('_', ' ')}</p>
                <Link to={`/complaints/${complaint._id}`}>View details</Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
