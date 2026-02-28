// @ts-nocheck - React Leaflet 4.2.1 has type definition issues with legacy peer deps for React 18
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different marker types
const currentLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const eventLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to fit bounds when both locations are available
function FitBounds({ currentLocation, eventLocation }: any) {
  const map = useMap();

  useEffect(() => {
    if (currentLocation && eventLocation) {
      const bounds = L.latLngBounds(
        [currentLocation.latitude, currentLocation.longitude],
        [eventLocation.latitude, eventLocation.longitude]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (eventLocation) {
      map.setView([eventLocation.latitude, eventLocation.longitude], 13);
    }
  }, [currentLocation, eventLocation, map]);

  return null;
}

interface EventMapProps {
  eventLocation?: {
    latitude: number;
    longitude: number;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  eventTitle?: string;
  eventAddress?: string;
  className?: string;
  showCurrentLocation?: boolean;
}

const EventMap = ({
  eventLocation,
  currentLocation,
  eventTitle = 'Event Location',
  eventAddress = '',
  className = '',
  showCurrentLocation = true
}: EventMapProps) => {
  // Default center (if no locations provided)
  const defaultCenter = eventLocation 
    ? [eventLocation.latitude, eventLocation.longitude]
    : [28.6139, 77.2090]; // Default to Delhi, India

  return (
    <div className={`relative ${className}`}>
      {/* @ts-ignore - React Leaflet 4.2.1 type definitions issue with legacy peer deps */}
      <MapContainer
        center={defaultCenter as any}
        zoom={13}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      >
        {/* @ts-ignore - React Leaflet 4.2.1 type definitions issue */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Event Location Marker */}
        {eventLocation && (
          // @ts-ignore - React Leaflet 4.2.1 type definitions issue
          <Marker
            position={[eventLocation.latitude, eventLocation.longitude] as any}
            icon={eventLocationIcon as any}
          >
            <Popup>
              <div className="text-sm">
                <strong className="text-red-600">📍 {eventTitle}</strong>
                {eventAddress && <p className="mt-1 text-gray-600">{eventAddress}</p>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${eventLocation.latitude},${eventLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-2 inline-block"
                >
                  Get Directions →
                </a>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Current Location Marker */}
        {showCurrentLocation && currentLocation && (
          // @ts-ignore - React Leaflet 4.2.1 type definitions issue
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude] as any}
            icon={currentLocationIcon as any}
          >
            <Popup>
              <div className="text-sm">
                <strong className="text-blue-600">📍 Your Location</strong>
                <p className="mt-1 text-gray-600">You are here</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Fit bounds to show both markers */}
        {showCurrentLocation && (
          <FitBounds currentLocation={currentLocation} eventLocation={eventLocation} />
        )}
      </MapContainer>

      {/* Distance Info */}
      {showCurrentLocation && currentLocation && eventLocation && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <div className="text-sm">
            <div className="font-semibold text-gray-700">Distance</div>
            <div className="text-2xl font-bold text-primary">
              {calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                eventLocation.latitude,
                eventLocation.longitude
              ).toFixed(1)} km
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ≈ {Math.round(
                calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  eventLocation.latitude,
                  eventLocation.longitude
                ) * 15
              )} min drive
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default EventMap;
export { calculateDistance };
