import React, { useEffect, useRef, useState } from 'react';
import { Compass, Navigation2 } from 'lucide-react';
import { speak } from '../../utils/speech';

export function Navigation() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      zoom: 15,
      center: { lat: 0, lng: 0 },
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(pos);
          map.setCenter(pos);
          new google.maps.Marker({ position: pos, map });
          speak('Location found. Ready for navigation.');
        },
        () => {
          speak('Error: Location service is not available.');
        }
      );
    }
  }, []);

  const startNavigation = async () => {
    if (!location || !destination) return;

    setIsNavigating(true);
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();

    try {
      const result = await directionsService.route({
        origin: location,
        destination,
        travelMode: google.maps.TravelMode.WALKING,
      });

      if (mapRef.current) {
        const map = new google.maps.Map(mapRef.current);
        directionsRenderer.setMap(map);
        directionsRenderer.setDirections(result);
        
        const steps = result.routes[0].legs[0].steps;
        speak(`Route found. ${steps.length} steps to destination.`);
        
        steps.forEach((step, index) => {
          setTimeout(() => {
            speak(step.instructions.replace(/<[^>]*>/g, ''));
          }, index * 5000);
        });
      }
    } catch (error) {
      speak('Could not calculate route. Please try again.');
      setIsNavigating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter destination..."
          className="flex-1 p-2 border rounded-lg"
        />
        <button
          onClick={startNavigation}
          disabled={!destination || isNavigating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isNavigating ? (
            <>
              <Navigation2 className="w-5 h-5 animate-pulse" />
              <span>Navigating...</span>
            </>
          ) : (
            <>
              <Compass className="w-5 h-5" />
              <span>Start Navigation</span>
            </>
          )}
        </button>
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg shadow-md"
        aria-label="Google Maps navigation"
      />
    </div>
  );
}