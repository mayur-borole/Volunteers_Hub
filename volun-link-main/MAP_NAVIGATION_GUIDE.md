# Map & Navigation Feature - Complete Guide

## 🗺️ What's Been Added

### New Features
- ✅ **Interactive Maps** - Leaflet-powered maps showing event locations
- ✅ **Current Location Detection** - Automatically detects volunteer's location
- ✅ **Distance Calculation** - Shows distance from volunteer to event
- ✅ **Travel Time Estimation** - Estimates travel time (≈40 km/h average)
- ✅ **Turn-by-Turn Directions** - Opens Google Maps for navigation
- ✅ **Dual Markers** - Blue for current location, Red for event location
- ✅ **Location Permission Handling** - Graceful error handling

### Backend Changes
**Event Model Updated:**
```javascript
coordinates: {
  latitude: Number,   // -90 to 90
  longitude: Number   // -180 to 180
}
address: {
  street: String,
  city: String,
  state: String,
  zipCode: String,
  country: String
}
```

### Frontend Components Created

1. **`EventMap.tsx`** - Interactive map component
   - Shows event location (red marker)
   - Shows current location (blue marker)
   - Auto-fits bounds to show both markers
   - Distance display with travel time estimate

2. **`EventLocationCard.tsx`** - Complete location UI
   - Location details
   - Distance and travel time
   - Toggle map visibility
   - "Get Directions" buttons
   - Location permission handling

3. **`useGeolocation` Hook** - Browser geolocation
   - Auto-detects current location
   - Error handling
   - Permission management
   - Refetch capability

## 🚀 How to Use

### For Volunteers (View Event Location)

When viewing an event, volunteers will see:

```tsx
import EventLocationCard from '@/components/ui/EventLocationCard';

<EventLocationCard
  event={{
    title: "Beach Cleanup Drive",
    location: "Marina Beach",
    coordinates: {
      latitude: 13.0492,
      longitude: 80.2625
    },
    address: {
      street: "Marina Beach Road",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India"
    }
  }}
  showMap={true}
/>
```

**Features Available:**
- 📍 See event location on map
- 📍 See their current location
- 📏 View distance from their location
- ⏱️ See estimated travel time
- 🧭 Get turn-by-turn directions via Google Maps
- 🔄 Toggle map visibility

### For Organizers (Add Event Location)

When creating/editing an event:

```tsx
import { useState } from 'react';
import EventMap from '@/components/ui/EventMap';
import { getCurrentLocation } from '@/hooks/useGeolocation';

// In your form:
const [coordinates, setCoordinates] = useState({
  latitude: 28.6139,
  longitude: 77.2090
});

// Get current location button
<Button onClick={async () => {
  try {
    const location = await getCurrentLocation();
    setCoordinates(location);
  } catch (error) {
    alert('Could not get location');
  }
}}>
  Use My Current Location
</Button>

// Show map for selection
<EventMap
  eventLocation={coordinates}
  eventTitle="Event Location"
  showCurrentLocation={false}
/>

// Save coordinates with event
await eventService.createEvent({
  ...eventData,
  coordinates: {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude
  }
});
```

## 📊 Example Usage in Events Page

```tsx
import EventLocationCard from '@/components/ui/EventLocationCard';

function EventDetailsPage() {
  const event = {
    title: "Community Health Camp",
    location: "City Hall, Downtown",
    coordinates: {
      latitude: 28.6139,
      longitude: 77.2090
    },
    address: {
      street: "123 Main Street",
      city: "New Delhi",
      state: "Delhi",
      zipCode: "110001",
      country: "India"
    }
  };

  return (
    <div>
      <h1>{event.title}</h1>
      
      {/* Location Card with Map */}
      <EventLocationCard 
        event={event}
        showMap={true}
        className="mt-6"
      />
      
      {/* Rest of event details */}
    </div>
  );
}
```

## 🎯 Features Explained

### 1. **Distance Calculation**
Uses Haversine formula to calculate great-circle distance:
```typescript
import { calculateDistance, formatDistance } from '@/hooks/useGeolocation';

const distance = calculateDistance(
  userLat, userLon, eventLat, eventLon
);
console.log(formatDistance(distance)); // "5.2 km" or "850 m"
```

### 2. **Travel Time Estimation**
Assumes 40 km/h average speed (accounts for city traffic):
```typescript
import { estimateTravelTime } from '@/hooks/useGeolocation';

const time = estimateTravelTime(5.2); // 5.2 km
console.log(time); // "8 min"
```

### 3. **Get Directions**
Opens Google Maps with directions:
```typescript
// From current location to event
const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLon}&destination=${eventLat},${eventLon}`;
window.open(url, '_blank');

// Just to event (Google will use user's location)
const url = `https://www.google.com/maps/dir/?api=1&destination=${eventLat},${eventLon}`;
```

### 4. **Location Permission**
Handles browser geolocation prompts:
```typescript
import { useGeolocation } from '@/hooks/useGeolocation';

const { latitude, longitude, error, loading, refetch } = useGeolocation();

if (loading) return <p>Getting location...</p>;
if (error) return <p>{error} <Button onClick={refetch}>Retry</Button></p>;
if (latitude && longitude) return <p>Location: {latitude}, {longitude}</p>;
```

## 🛠️ API Updates Needed

### When Creating Events

Include coordinates in the request:
```typescript
POST /api/events

{
  "title": "Event Title",
  "description": "...",
  "location": "City Hall",  // Keep for backward compatibility
  "coordinates": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "address": {
    "street": "123 Main St",
    "city": "New Delhi",
    "state": "Delhi",
    "zipCode": "110001",
    "country": "India"
  },
  "date": "2026-03-15",
  // ... other fields
}
```

### Event Response Format

```json
{
  "_id": "...",
  "title": "Beach Cleanup",
  "location": "Marina Beach",
  "coordinates": {
    "latitude": 13.0492,
    "longitude": 80.2625
  },
  "address": {
    "street": "Marina Beach Road",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "country": "India"
  }
}
```

## 📱 User Flow

### For Volunteers

1. **Browse Events** → Click event
2. **View Event Details** → See location card
3. **Browser asks** → "Allow location access?" → Click "Allow"
4. **See Map** with:
   - Red marker = Event location
   - Blue marker = Your location
   - Distance displayed (e.g., "5.2 km")
   - Travel time (e.g., "8 min drive")
5. **Click "Get Directions"** → Opens Google Maps
6. **Follow turn-by-turn** navigation to event

### For Organizers

1. **Create Event** → Fill form
2. **Add Location**:
   - Option A: Click "Use My Current Location"
   - Option B: Manually enter coordinates
   - Option C: Click on map to select
3. **Preview** location on map
4. **Submit** event with coordinates

## 🎨 UI Components

### EventMap Props
```typescript
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
```

### EventLocationCard Props
```typescript
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
```

## 🔒 Privacy & Permissions

- Location access requires user consent
- Location data not stored on server
- Only used for distance calculation
- Can deny permission (map still works without current location)
- No tracking or location history

## 🌍 Map Features

- **Free & Open Source** - Uses OpenStreetMap tiles
- **No API Key Required** - Unlike Google Maps
- **Responsive** - Works on mobile and desktop
- **Fast Loading** - Lightweight Leaflet library
- **Custom Markers** - Color-coded for clarity
- **Zoom & Pan** - Interactive navigation
- **Auto-Fit Bounds** - Shows both markers optimally

## 📝 Testing Checklist

- [ ] Map loads correctly
- [ ] Current location marker appears (blue)
- [ ] Event location marker appears (red)
- [ ] Distance calculation is accurate
- [ ] Travel time estimation shows
- [ ] "Get Directions" opens Google Maps
- [ ] Works without location permission (shows event only)
- [ ] Error messages display properly
- [ ] Retry button works
- [ ] Map toggle button works
- [ ] Responsive on mobile

## 🚧 Future Enhancements

- [ ] Search events by distance from user
- [ ] Filter events within X km radius
- [ ] Multiple event markers on single map
- [ ] Real-time traffic data integration
- [ ] Public transport directions
- [ ] Walking/cycling route options
- [ ] Save favorite locations
- [ ] Offline map caching

## ✅ Ready to Use!

The map and navigation system is fully integrated and ready. Just update your event creation forms to include coordinates, and the EventLocationCard will automatically show maps with directions for volunteers!

**Example Files:**
- `src/components/ui/EventMap.tsx` - Base map component
- `src/components/ui/EventLocationCard.tsx` - Complete location UI
- `src/hooks/useGeolocation.ts` - Location detection hook
- `backend/models/Event.js` - Updated with location fields

**Dependencies Installed:**
- `leaflet` - Map library
- `react-leaflet` - React bindings

**Ready to integrate into any event page!** 🗺️🎉
