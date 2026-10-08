/**
 * Mapbox Geocoding API Service
 * Provides forward geocoding (address → coordinates) and autocomplete
 * Docs: https://docs.mapbox.com/api/search/geocoding/
 */

import { MAPBOX_ACCESS_TOKEN } from '../../../config';

export interface GeocodingResult {
  id: string;
  type: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  place_type: string[];
  relevance: number;
  address?: string;
  context?: Array<{
    id: string;
    text: string;
  }>;
}

export interface GeocodingResponse {
  type: string;
  query: string[];
  features: GeocodingResult[];
  attribution: string;
}

/**
 * Search for locations using Mapbox Geocoding API
 */
export async function searchLocation(
  query: string,
  options: {
    proximity?: { longitude: number; latitude: number };
    limit?: number;
    types?: string[];
    country?: string[];
    bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  } = {}
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.startsWith('pk.')) {
    const {
      proximity,
      limit = 5,
      types = ['place', 'locality', 'neighborhood', 'address', 'poi'],
      country,
      bbox
    } = options;

    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      limit: limit.toString(),
      types: types.join(','),
      language: 'en'
    });

    if (proximity) {
      params.append('proximity', `${proximity.longitude},${proximity.latitude}`);
    }

    if (country && country.length > 0) {
      params.append('country', country.join(','));
    }

    if (bbox) {
      params.append('bbox', bbox.join(','));
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?${params}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data: GeocodingResponse = await response.json();
        return data.features || [];
      }
    } catch (error) {
      console.warn('[GeocodingAPI] Mapbox fetch error, falling back to OSM:', error);
    }
  }

  // OpenStreetMap Nominatim Fallback - Free, no API key required!
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${options.limit || 5}&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SafeTrail-TouristApp/1.0' }
    });

    if (!response.ok) return [];

    const items = await response.json();
    return (items || []).map((item: any) => ({
      id: String(item.place_id),
      type: 'Feature' as const,
      place_name: item.display_name,
      text: item.display_name.split(',')[0],
      center: [Number(item.lon), Number(item.lat)] as [number, number],
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(item.lon), Number(item.lat)]
      },
      relevance: 1
    }));
  } catch (error) {
    console.error('[GeocodingAPI] OSM fetch error:', error);
    return [];
  }
}

/**
 * Get coordinates for a specific address
 */
export async function geocodeAddress(
  address: string,
  proximity?: { longitude: number; latitude: number }
): Promise<{ latitude: number; longitude: number } | null> {
  const results = await searchLocation(address, { proximity, limit: 1 });
  
  if (results.length === 0) {
    return null;
  }

  const [lng, lat] = results[0].center;
  return { latitude: lat, longitude: lng };
}

/**
 * Format a geocoding result for display
 */
export function formatPlaceName(result: GeocodingResult): string {
  return result.place_name;
}

/**
 * Get short name from result
 */
export function getShortName(result: GeocodingResult): string {
  return result.text;
}

/**
 * Extract coordinates from result
 */
export function getCoordinates(result: GeocodingResult): { latitude: number; longitude: number } {
  const [lng, lat] = result.center;
  return { latitude: lat, longitude: lng };
}
