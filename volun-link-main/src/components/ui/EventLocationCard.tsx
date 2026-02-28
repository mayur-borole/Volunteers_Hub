import { useState } from 'react';
import { MapPin, Navigation, Clock, AlertCircle } from 'lucide-react';
import EventMap from './EventMap';
import { useGeolocation, formatDistance, estimateTravelTime } from '@/hooks/useGeolocation';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';

interface EventLocationCardProps {
  event: {
    title: string;
    location: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  showMap?: boolean;
  className?: string;
}

const EventLocationCard = ({ 
  event, 
  showMap = true,
  className = '' 
}: EventLocationCardProps) => {
  const { latitude, longitude, error, loading, refetch } = useGeolocation();
  const [mapVisible, setMapVisible] = useState(showMap);

  const currentLocation = 
    latitude && longitude ? { latitude, longitude } : null;

  const eventLocation = event.coordinates;

  const fullAddress = event.address
    ? [
        event.address.street,
        event.address.city,
        event.address.state,
        event.address.zipCode,
        event.address.country,
      ]
        .filter(Boolean)
        .join(', ')
    : event.location;

  return (
    <div className={`bg-card rounded-lg border shadow-sm ${className}`}>
      {/* Location Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-lg">Event Location</h3>
            </div>
            <p className="text-muted-foreground">{fullAddress}</p>
          </div>
          
          {eventLocation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapVisible(!mapVisible)}
              className="ml-2"
            >
              {mapVisible ? 'Hide Map' : 'Show Map'}
            </Button>
          )}
        </div>

        {/* Distance & Travel Info */}
        {currentLocation && eventLocation && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {formatDistance(
                  (() => {
                    const R = 6371;
                    const dLat = deg2rad(eventLocation.latitude - currentLocation.latitude);
                    const dLon = deg2rad(eventLocation.longitude - currentLocation.longitude);
                    const a =
                      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(deg2rad(currentLocation.latitude)) *
                        Math.cos(deg2rad(eventLocation.latitude)) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return R * c;
                  })()
                )}
              </span>
              <span className="text-muted-foreground">from you</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {estimateTravelTime(
                  (() => {
                    const R = 6371;
                    const dLat = deg2rad(eventLocation.latitude - currentLocation.latitude);
                    const dLon = deg2rad(eventLocation.longitude - currentLocation.longitude);
                    const a =
                      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(deg2rad(currentLocation.latitude)) *
                        Math.cos(deg2rad(eventLocation.latitude)) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return R * c;
                  })()
                )}
              </span>
              <span className="text-muted-foreground">estimated</span>
            </div>
          </div>
        )}

        {/* Location Error */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-4 text-sm text-muted-foreground">
            Getting your location...
          </div>
        )}
      </div>

      {/* Map */}
      {mapVisible && eventLocation && (
        <div className="h-[400px]">
          <EventMap
            eventLocation={eventLocation}
            currentLocation={currentLocation}
            eventTitle={event.title}
            eventAddress={fullAddress}
            showCurrentLocation={true}
          />
        </div>
      )}

      {/* Action Buttons */}
      {eventLocation && (
        <div className="p-4 border-t flex gap-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${eventLocation.latitude},${eventLocation.longitude}`,
                '_blank'
              );
            }}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
          
          {currentLocation && (
            <Button
              variant="outline"
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${eventLocation.latitude},${eventLocation.longitude}`,
                  '_blank'
                );
              }}
            >
              Navigate from Here
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export default EventLocationCard;
