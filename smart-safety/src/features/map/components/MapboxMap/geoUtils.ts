
import { Coordinates } from './types';
import { MAPBOX_ACCESS_TOKEN } from '../../../../config';

// Convert decimal coordinates to DMS (Degrees, Minutes, Seconds)
export const convertToDMS = (decimal: number, type: 'lat' | 'lon'): string => {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
  
  const direction = type === 'lat' 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes}'${seconds}"${direction}`;
};

// Format coordinates to display both decimal and DMS formats
export const formatCoordinates = (lat: number, lon: number): Coordinates => {
  return {
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6),
    dms: {
      lat: convertToDMS(lat, 'lat'),
      lon: convertToDMS(lon, 'lon'),
    }
  };
};

// Reverse geocode to get address from coordinates using Mapbox Geocoding API
export const reverseGeocode = async (lat: number, lon: number, retryCount: number = 0): Promise<string | null> => {
  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return data.features[0].place_name || "Address not found";
        }
      }
    } catch (err: any) {
      console.warn("Mapbox reverse geocoding error:", err);
    }
  }

  // OpenStreetMap Nominatim Fallback
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SafeTrail-TouristApp/1.0' }
    });
    if (response.ok) {
      const data = await response.json();
      return data.display_name || "Current Location";
    }
  } catch (err) {
    console.warn("OSM reverse geocoding error:", err);
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
};
