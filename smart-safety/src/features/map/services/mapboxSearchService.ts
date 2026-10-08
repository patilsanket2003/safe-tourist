/**
 * Mapbox Search Box API Service
 * Uses the Category Search endpoint to find nearby POIs like police stations and hospitals
 * Docs: https://docs.mapbox.com/api/search/search-box/
 */

import { MAPBOX_ACCESS_TOKEN } from '../../../config';

// POI Categories for Mapbox Search API
export const POI_CATEGORIES = {
    POLICE: 'police_station',
    HOSPITAL: 'hospital',
} as const;

export interface NearbyPOI {
    id: string;
    name: string;
    address: string;
    fullAddress: string;
    coordinates: { lat: number; lon: number };
    distance: number; // in km
    category: 'police' | 'hospital';
}

interface MapboxFeature {
    properties: {
        mapbox_id: string;
        name: string;
        address?: string;
        full_address?: string;
        place_formatted?: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
        poi_category?: string[];
    };
    geometry: {
        coordinates: [number, number]; // [lon, lat]
    };
}

interface MapboxCategoryResponse {
    type: string;
    features: MapboxFeature[];
    attribution: string;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Fetch nearby POIs by category using Mapbox Search Box API
 */
export async function fetchNearbyPOIs(
    userLat: number,
    userLon: number,
    category: string,
    limit: number = 5
): Promise<NearbyPOI[]> {
    if (!MAPBOX_ACCESS_TOKEN || !MAPBOX_ACCESS_TOKEN.startsWith('pk.')) {
        console.warn('[MapboxSearch] Invalid or missing access token');
        return [];
    }

    const url = `https://api.mapbox.com/search/searchbox/v1/category/${category}?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}` +
        `&proximity=${userLon},${userLat}` +
        `&limit=${limit}` +
        `&language=en`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error('[MapboxSearch] API error:', response.status, await response.text());
            return [];
        }

        const data: MapboxCategoryResponse = await response.json();

        if (!data.features || !Array.isArray(data.features)) {
            return [];
        }

        const poiCategory: 'police' | 'hospital' =
            category === POI_CATEGORIES.POLICE ? 'police' : 'hospital';

        return data.features.map((feature) => {
            const coords = feature.properties.coordinates || {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
            };

            const distance = haversineKm(userLat, userLon, coords.latitude, coords.longitude);

            return {
                id: feature.properties.mapbox_id,
                name: feature.properties.name,
                address: feature.properties.address || feature.properties.place_formatted || '',
                fullAddress: feature.properties.full_address || feature.properties.place_formatted || '',
                coordinates: { lat: coords.latitude, lon: coords.longitude },
                distance,
                category: poiCategory,
            };
        }).sort((a, b) => a.distance - b.distance);
    } catch (error) {
        console.error('[MapboxSearch] Fetch error:', error);
        return [];
    }
}

/**
 * Fetch nearest police station
 */
export async function fetchNearestPolice(
    userLat: number,
    userLon: number
): Promise<NearbyPOI | null> {
    const results = await fetchNearbyPOIs(userLat, userLon, POI_CATEGORIES.POLICE, 1);
    return results.length > 0 ? results[0] : null;
}

/**
 * Fetch nearest hospital
 */
export async function fetchNearestHospital(
    userLat: number,
    userLon: number
): Promise<NearbyPOI | null> {
    const results = await fetchNearbyPOIs(userLat, userLon, POI_CATEGORIES.HOSPITAL, 1);
    return results.length > 0 ? results[0] : null;
}

/**
 * Fetch both police stations and hospitals, interleaved
 * Returns: police, hospital, police, hospital, police, hospital (3 of each)
 */
export async function fetchNearbyHelp(
    userLat: number,
    userLon: number,
    countPerCategory: number = 3
): Promise<NearbyPOI[]> {
    const [policeResults, hospitalResults] = await Promise.all([
        fetchNearbyPOIs(userLat, userLon, POI_CATEGORIES.POLICE, countPerCategory),
        fetchNearbyPOIs(userLat, userLon, POI_CATEGORIES.HOSPITAL, countPerCategory),
    ]);

    // Interleave: police, hospital, police, hospital...
    const interleaved: NearbyPOI[] = [];
    const maxLen = Math.max(policeResults.length, hospitalResults.length);

    for (let i = 0; i < maxLen; i++) {
        if (i < policeResults.length) {
            interleaved.push(policeResults[i]);
        }
        if (i < hospitalResults.length) {
            interleaved.push(hospitalResults[i]);
        }
    }

    return interleaved;
}
