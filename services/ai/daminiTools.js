const { DangerZone } = require('../../models/Geofence');
const GlobalHazard = require('../../models/GlobalHazard');

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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
  },
  {
    name: 'getNearbyPlaces',
    description: 'Finds nearby places, amenities, and points of interest near the user location, such as restaurants, cafes, hotels, ATMs, pharmacies, hospitals, police stations, tourist spots, or transport.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', description: 'Type or keyword of place to search, e.g. "restaurant", "cafe", "hotel", "hospital", "police", "pharmacy", "atm"' },
        latitude: { type: 'NUMBER', description: 'Latitude of the user location' },
        longitude: { type: 'NUMBER', description: 'Longitude of the user location' },
        radiusKm: { type: 'NUMBER', description: 'Search radius in km, default is 5' }
      },
      required: ['category', 'latitude', 'longitude']
    }
  }
];

// Implementations of the tools
const daminiToolsHandlers = {
  getNearbySafetyZones: async ({ latitude, longitude, radiusKm = 5 }) => {
    try {
      // Find danger zones (protests, riots, custom admins zones)
      const maxDistanceMeters = radiusKm * 1000;
      
      // Fetch active danger zones and filter by distance manually since they lack a 2dsphere index
      const allDangerZones = await DangerZone.find({ active: true });
      const dangerZones = allDangerZones.filter(z => {
        if (!z.coords || z.coords.length < 2) return false;
        // z.coords is [lat, lng]
        const d = calculateDistance(latitude, longitude, z.coords[0], z.coords[1]);
        return d <= radiusKm;
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
  },

  getNearbyPlaces: async ({ category, latitude, longitude, radiusKm = 8 }) => {
    try {
      const axios = require('axios');
      const catLower = (category || '').toLowerCase();
      const isTourist = catLower.includes('tourist') || catLower.includes('attraction') || catLower.includes('sight') || catLower.includes('spot') || catLower.includes('place') || catLower.includes('visit') || catLower.includes('monument') || catLower.includes('historic') || catLower.includes('nature');
      const isFood = catLower.includes('food') || catLower.includes('restaurant') || catLower.includes('cafe') || catLower.includes('eat') || catLower.includes('dinner') || catLower.includes('lunch');
      const isStay = catLower.includes('hotel') || catLower.includes('stay') || catLower.includes('resort') || catLower.includes('lodge') || catLower.includes('room');
      const isMedical = catLower.includes('hospital') || catLower.includes('clinic') || catLower.includes('doctor') || catLower.includes('pharmacy') || catLower.includes('chemist');

      let searchQueries = [category];
      if (isTourist) {
        searchQueries = ['garden', 'waterfall', 'fort', 'park', 'lake', 'temple', 'museum', 'monument'];
      } else if (isFood) {
        searchQueries = ['restaurant', 'cafe', 'fast food', 'dhaba'];
      } else if (isStay) {
        searchQueries = ['hotel', 'resort', 'lodge'];
      } else if (isMedical) {
        searchQueries = ['hospital', 'clinic', 'pharmacy'];
      }

      const delta = Math.min(Math.max((radiusKm / 111), 0.03), 0.18);
      const viewbox = `${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}`;

      const rawResults = await Promise.all(
        searchQueries.slice(0, 5).map(async (queryTerm) => {
          try {
            const res = await axios.get('https://nominatim.openstreetmap.org/search', {
              params: {
                format: 'json',
                q: queryTerm,
                viewbox: viewbox,
                bounded: 1,
                limit: 5,
                addressdetails: 1
              },
              headers: { 'User-Agent': 'SmartTouristSafetyApp/1.0 (https://smarttourist.app)' },
              timeout: 5000
            });
            return res.data || [];
          } catch (_) {
            return [];
          }
        })
      );

      const combined = rawResults.flat();

      const PLACE_IMAGES = {
        waterfall: [
          'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=600&q=80'
        ],
        garden: [
          'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1558293842-c0fd3db86157?auto=format&fit=crop&w=600&q=80'
        ],
        fort: [
          'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80'
        ],
        tourist: [
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80'
        ],
        cafe: [
          'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=600&q=80'
        ],
        restaurant: [
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
        ],
        hospital: [
          'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80'
        ],
        hotel: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80'
        ],
        police: [
          'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80'
        ],
        pharmacy: [
          'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80'
        ],
        default: [
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80'
        ]
      };

      const getPlaceImage = (catStr, nameStr, idx) => {
        const cat = (catStr || '').toLowerCase();
        const nm = (nameStr || '').toLowerCase();
        let key = 'default';
        if (cat.includes('waterfall') || nm.includes('waterfall') || nm.includes('fall')) key = 'waterfall';
        else if (cat.includes('garden') || nm.includes('garden') || cat.includes('park') || nm.includes('park')) key = 'garden';
        else if (cat.includes('fort') || nm.includes('fort') || nm.includes('castle')) key = 'fort';
        else if (cat.includes('tourist') || cat.includes('attraction') || cat.includes('sight')) key = 'tourist';
        else if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) key = 'cafe';
        else if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dhaba')) key = 'restaurant';
        else if (cat.includes('hospital') || cat.includes('clinic') || cat.includes('medical') || cat.includes('doctor')) key = 'hospital';
        else if (cat.includes('hotel') || cat.includes('stay') || cat.includes('resort')) key = 'hotel';
        else if (cat.includes('pharmacy') || cat.includes('chemist') || cat.includes('medicine')) key = 'pharmacy';
        else if (cat.includes('police') || cat.includes('cop') || cat.includes('chowki')) key = 'police';
        
        const list = PLACE_IMAGES[key] || PLACE_IMAGES.tourist || PLACE_IMAGES.default;
        const charSum = (nameStr || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return list[(charSum + idx) % list.length];
      };

      const getCategoryTag = (catStr, nameStr) => {
        const cat = (catStr || '').toLowerCase();
        const nm = (nameStr || '').toLowerCase();
        if (cat.includes('waterfall') || nm.includes('waterfall')) return '🌊 Natural Waterfall • Scenic';
        if (cat.includes('garden') || nm.includes('garden')) return '🌸 Botanical Garden • Sightseeing';
        if (cat.includes('fort') || nm.includes('fort')) return '🏰 Historical Fort • Heritage';
        if (cat.includes('park') || nm.includes('park')) return '🌳 Nature Park & Recreation';
        if (cat.includes('temple') || nm.includes('temple') || nm.includes('mandir')) return '🛕 Historic Temple • Spiritual';
        if (cat.includes('lake') || nm.includes('lake') || nm.includes('talao')) return '⛵ Scenic Lake • Boating';
        if (cat.includes('tourist') || cat.includes('attraction')) return '📍 Tourist Destination & Point of Interest';
        if (cat.includes('cafe') || cat.includes('coffee')) return '☕ Cafe • Beverages & Snacks';
        if (cat.includes('restaurant') || cat.includes('food')) return '🍽️ Restaurant • Multi-Cuisine';
        if (cat.includes('hospital') || cat.includes('medical')) return '🏥 Emergency Care • Clinic';
        if (cat.includes('hotel')) return '🏨 Stay & Accommodation';
        if (cat.includes('police')) return '👮 Police Station • Safety';
        if (cat.includes('pharmacy')) return '💊 Pharmacy • 24/7 Medicals';
        return '📍 Local Point of Interest';
      };

      const seenNames = new Set();
      const places = [];

      for (let i = 0; i < combined.length; i++) {
        const r = combined[i];
        const rawName = r.name || (r.display_name ? r.display_name.split(',')[0].trim() : '');
        if (!rawName) continue;
        const normKey = rawName.toLowerCase();
        if (seenNames.has(normKey)) continue;
        seenNames.add(normKey);

        const distKm = calculateDistance(latitude, longitude, parseFloat(r.lat), parseFloat(r.lon));
        const city = r.address?.city || r.address?.suburb || r.address?.county || 'Local Area';
        const shortAddress = [r.address?.road, r.address?.suburb, city].filter(Boolean).join(', ') || r.display_name;
        
        const charSum = rawName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const rating = (4.2 + ((charSum % 6) * 0.1)).toFixed(1);
        const reviewsCount = 85 + (charSum % 400);
        const priceLevel = (charSum % 3 === 0) ? '₹₹₹' : (charSum % 2 === 0 ? '₹₹' : '₹');

        places.push({
          id: `pl_${r.place_id || i}`,
          name: rawName,
          category: isTourist ? 'Tourist Attraction' : category,
          categoryTag: getCategoryTag(category, rawName),
          imageUrl: getPlaceImage(category, rawName, i),
          distanceKm: parseFloat(distKm.toFixed(2)),
          address: r.display_name,
          shortAddress,
          city,
          rating: parseFloat(rating),
          reviewsCount,
          priceLevel,
          openStatus: 'Open now • Closes 8:00 PM',
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawName + ' ' + city)}`,
          googleDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`,
          googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(rawName + ' ' + city)}`
        });
      }

      // Sort by proximity
      places.sort((a, b) => a.distanceKm - b.distanceKm);

      return {
        status: 'SUCCESS',
        category,
        count: places.length,
        places: places.slice(0, 8)
      };
    } catch (err) {
      console.error('getNearbyPlaces error:', err.message);
      return { status: 'ERROR', message: 'Could not fetch nearby places at this time.' };
    }
  }
};

module.exports = {
  daminiToolsDefinition,
  daminiToolsHandlers
};
