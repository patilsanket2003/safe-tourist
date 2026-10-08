  import { LocationData, Coordinates } from './types';

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

// Reverse geocode to get address from coordinates
export const reverseGeocode = async (lat: number, lon: number, retryCount: number = 0): Promise<string | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=en&addressdetails=1&zoom=18`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "sih-smart-safety/2.0 (contact@smartsafety.app)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data.display_name || "Address not found";
  } catch (err: any) {
    console.error("Reverse geocoding error:", err);
    
    // Retry logic for network errors
    if (retryCount < 2) {
      // Wait longer between retries
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return reverseGeocode(lat, lon, retryCount + 1);
    }
    
    return null;
  }
};
