import { getRouteBounds, Route } from './mapboxDirectionsService';

export interface POI {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  type: 'hill' | 'lake' | 'hospital' | 'police';
}

export async function fetchPOIsAlongRoute(route: Route): Promise<POI[]> {
  try {
    const { minLat, maxLat, minLng, maxLng } = getRouteBounds(route);
    
    // Expand bounding box slightly (by ~5km) to catch nearby features
    const expand = 0.05; 
    const s = minLat - expand;
    const n = maxLat + expand;
    const w = minLng - expand;
    const e = maxLng + expand;

    // Overpass QL to fetch peaks and water bodies within bounding box
    // Limiting to 200 to prevent huge payloads for long routes
    const query = `
      [out:json][timeout:25];
      (
        node["natural"="peak"](${s},${w},${n},${e});
        node["natural"="water"](${s},${w},${n},${e});
        node["water"="lake"](${s},${w},${n},${e});
        node["amenity"="hospital"](${s},${w},${n},${e});
        node["amenity"="police"](${s},${w},${n},${e});
      );
      out body 300;
    `;
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.elements) {
      return [];
    }
    
    return data.elements
      .filter((el: any) => el.type === 'node' && el.lat && el.lon)
      .map((el: any) => {
        let type: 'hill' | 'lake' | 'hospital' | 'police' = 'hill';
        if (el.tags?.natural === 'water' || el.tags?.water === 'lake') {
          type = 'lake';
        } else if (el.tags?.amenity === 'hospital') {
          type = 'hospital';
        } else if (el.tags?.amenity === 'police') {
          type = 'police';
        }
        return {
          id: el.id,
          lat: el.lat,
          lon: el.lon,
          tags: el.tags || {},
          type
        };
      });
  } catch (error) {
    console.warn("Failed to fetch POIs from Overpass:", error);
    return [];
  }
}
