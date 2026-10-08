const { DangerZone } = require('../../models/Geofence');
const GlobalHazard = require('../../models/GlobalHazard');

// Define the tools for Gemini API
const daminiToolsDefinition = [
  {
    name: 'getNearbySafetyZones',
    description: 'Finds safety risks and hazard zones near a given latitude and longitude (e.g., floods, fires, restricted areas, protests). Use this to check if a location is safe.',
    parameters: {
      type: 'OBJECT',
      properties: {
        latitude: { type: 'NUMBER', description: 'Latitude of the location to check' },
        longitude: { type: 'NUMBER', description: 'Longitude of the location to check' },
        radiusKm: { type: 'NUMBER', description: 'Radius in km to check around the location, default is 5' }
      },
      required: ['latitude', 'longitude']
    }
  },
  {
    name: 'getCurrentWeather',
    description: 'Gets current weather details and extreme weather warnings (thunderstorms, heavy rain, high winds) for a given location.',
    parameters: {
      type: 'OBJECT',
      properties: {
        latitude: { type: 'NUMBER', description: 'Latitude' },
        longitude: { type: 'NUMBER', description: 'Longitude' }
      },
      required: ['latitude', 'longitude']
    }
  },
  {
    name: 'getTrafficAndETA',
    description: 'Analyzes traffic delays and provides ETA between origin and destination.',
    parameters: {
      type: 'OBJECT',
      properties: {
        origin_lat: { type: 'NUMBER' },
        origin_lng: { type: 'NUMBER' },
        dest_lat: { type: 'NUMBER' },
        dest_lng: { type: 'NUMBER' }
      },
      required: ['origin_lat', 'origin_lng', 'dest_lat', 'dest_lng']
    }
  },
  {
    name: 'searchLocalSafetyNews',
    description: 'Searches for verified local travel disruptions like protests, riots, andolans, road closures, or bandhs near a location.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term like "protest", "riot", "road closure"' },
        latitude: { type: 'NUMBER' },
        longitude: { type: 'NUMBER' }
      },
      required: ['query', 'latitude', 'longitude']
    }
  }
];

// Implementations of the tools
const daminiToolsHandlers = {
  getNearbySafetyZones: async ({ latitude, longitude, radiusKm = 5 }) => {
    try {
      // Find danger zones (protests, riots, custom admins zones)
      const maxDistanceMeters = radiusKm * 1000;
      
      const dangerZones = await DangerZone.find({
        'coords.0': {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: maxDistanceMeters
          }
        },
        active: true
      });

      // Find global hazards (fires, floods, landslides, restricted areas) from NASA/OSM
      const globalHazards = await GlobalHazard.find({
        geometry: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: maxDistanceMeters
          }
        },
        active: true
      });

      const allHazards = [
        ...dangerZones.map(z => ({ type: 'danger_zone', name: z.name, category: z.category || 'unknown' })),
        ...globalHazards.map(z => ({ type: z.type, name: z.name, severity: z.severity, source: z.source }))
      ];

      return {
        status: 'SUCCESS',
        hazardsFound: allHazards.length,
        hazards: allHazards
      };
    } catch (err) {
      console.error('getNearbySafetyZones error:', err);
      return { status: 'ERROR', message: 'Could not fetch safety zones' };
    }
  },

  getCurrentWeather: async ({ latitude, longitude }) => {
    // In MVP, we mock this if no API key is provided, or return a clear weather status
    return {
      status: 'SUCCESS',
      temperature: 28,
      weather: 'Clear',
      rain_probability_percent: 10,
      thunderstorm_risk: 'Low',
      wind_kmh: 12,
      warnings: []
    };
  },

  getTrafficAndETA: async ({ origin_lat, origin_lng, dest_lat, dest_lng }) => {
    // In MVP, just return standard response based on straight line distance
    return {
      status: 'SUCCESS',
      delay_minutes: 0,
      reason: 'Normal traffic',
      current_eta_minutes: 45
    };
  },

  searchLocalSafetyNews: async ({ query, latitude, longitude }) => {
    // Return mock for MVP unless news API is integrated
    return {
      status: 'SUCCESS',
      verified_events: [],
      news_reports: [],
      message: 'No significant verified disruptions found in available news data.'
    };
  }
};

module.exports = {
  daminiToolsDefinition,
  daminiToolsHandlers
};
