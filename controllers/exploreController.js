const ExploreState = require('../models/ExploreState');
const ExploreCity = require('../models/ExploreCity');
const ExplorePlace = require('../models/ExplorePlace');
const { DangerZone } = require('../models/Geofence');
const GlobalHazard = require('../models/GlobalHazard');
const { fetchAndIngestLiveAttractions } = require('../services/openDataTourismService');

// Haversine formula to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Compute live SafeTrail safety status for coordinates
async function computeSafetyStatus(lat, lng) {
  try {
    if (!lat || !lng) {
      return { status: 'NORMAL', score: 100, warnings: [], dangerZonesCount: 0 };
    }

    // Check DangerZones within 5km
    const allDangerZones = await DangerZone.find({ active: true });
    const nearbyDangerZones = allDangerZones.filter(z => {
      if (!z.coords || z.coords.length < 2) return false;
      const d = calculateDistance(lat, lng, z.coords[0], z.coords[1]);
      return d <= 5;
    });

    // Check Global Hazards (fires, floods, earthquakes) within 20km
    const nearbyHazards = await GlobalHazard.find({
      geometry: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 20000
        }
      },
      active: true
    }).limit(5);

    let score = 100;
    const warnings = [];

    if (nearbyDangerZones.length > 0) {
      score -= Math.min(nearbyDangerZones.length * 35, 70);
      nearbyDangerZones.forEach(z => {
        warnings.push(`Restricted / Danger Zone nearby: ${z.name}`);
      });
    }

    if (nearbyHazards.length > 0) {
      score -= Math.min(nearbyHazards.length * 20, 50);
      nearbyHazards.forEach(h => {
        warnings.push(`Natural hazard reported: ${h.type || 'Hazard'} - ${h.name || 'Nearby alert'}`);
      });
    }

    score = Math.max(0, Math.min(100, score));

    let riskLevel = 'LOW RISK';
    if (score < 40) riskLevel = 'CRITICAL';
    else if (score < 60) riskLevel = 'HIGH RISK';
    else if (score < 80) riskLevel = 'CAUTION';

    return {
      score,
      riskLevel,
      warnings,
      nearbyDangerZonesCount: nearbyDangerZones.length,
      nearbyHazardsCount: nearbyHazards.length
    };
  } catch (err) {
    console.error('Safety status calculation error:', err.message);
    return { score: 95, riskLevel: 'LOW RISK', warnings: [], nearbyDangerZonesCount: 0, nearbyHazardsCount: 0 };
  }
}

// 1. GET /api/explore/categories
exports.getCategories = async (req, res) => {
  try {
    const seaCount = await ExploreCity.countDocuments({ categories: 'sea-beaches' });
    const mountainsCount = await ExploreCity.countDocuments({ categories: 'mountains-nature' });
    const historicCount = await ExploreCity.countDocuments({ categories: 'historic-places' });

    const categories = [
      {
        id: 'sea-beaches',
        title: 'Sea & Beaches',
        subtitle: 'Sun, sand, coastal gems & pristine shores',
        coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
        badge: 'Popular for Summers',
        icon: 'weather-sunny',
        destinationCount: seaCount || 5
      },
      {
        id: 'mountains-nature',
        title: 'Mountains & Nature',
        subtitle: 'Snow peaks, hill retreats, lush valleys & trekking trails',
        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        badge: 'Serene Escapes',
        icon: 'image-filter-hdr',
        destinationCount: mountainsCount || 5
      },
      {
        id: 'historic-places',
        title: 'Historic Places',
        subtitle: 'Ancient forts, heritage monuments, palatial architecture & culture',
        coverImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
        badge: 'Cultural Heritage',
        icon: 'castle',
        destinationCount: historicCount || 5
      }
    ];

    res.json({ success: true, categories });
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch categories' });
  }
};

// 2. GET /api/explore/states
exports.getStates = async (req, res) => {
  try {
    const states = await ExploreState.find().sort({ name: 1 });
    res.json({ success: true, count: states.length, states });
  } catch (err) {
    console.error('getStates error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch states' });
  }
};

// 3. GET /api/explore/categories/:categoryId/cities
exports.getCitiesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { search, stateId, sort = 'rank', page = 1, limit = 20 } = req.query;

    const query = {};

    if (categoryId && categoryId !== 'all') {
      query.$or = [
        { primaryCategory: categoryId },
        { categories: categoryId }
      ];
    }

    const stateFilter = (stateId || req.query.state || '').trim();
    if (stateFilter && stateFilter !== 'all') {
      query.stateId = stateFilter.toLowerCase();
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    let sortObj = { rank: 1 };
    if (sort === 'name') sortObj = { name: 1 };
    else if (sort === 'attractions') sortObj = { attractionCount: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ExploreCity.countDocuments(query);
    const cities = await ExploreCity.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Enrich with safety status
    const enrichedCities = await Promise.all(cities.map(async (c) => {
      const lat = c.location?.coordinates?.[1];
      const lng = c.location?.coordinates?.[0];
      const safety = await computeSafetyStatus(lat, lng);
      return {
        ...c.toObject(),
        safety
      };
    }));

    res.json({
      success: true,
      category: categoryId,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      cities: enrichedCities
    });
  } catch (err) {
    console.error('getCitiesByCategory error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch cities' });
  }
};

// 4. GET /api/explore/states/:stateId/cities
exports.getCitiesByState = async (req, res) => {
  try {
    const { stateId } = req.params;
    const { category, search } = req.query;

    const query = { stateId: stateId.toLowerCase() };
    if (category && category !== 'all') {
      query.$or = [
        { primaryCategory: category },
        { categories: category }
      ];
    }
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const cities = await ExploreCity.find(query).sort({ rank: 1 });
    const enrichedCities = await Promise.all(cities.map(async (c) => {
      const lat = c.location?.coordinates?.[1];
      const lng = c.location?.coordinates?.[0];
      const safety = await computeSafetyStatus(lat, lng);
      return {
        ...c.toObject(),
        safety
      };
    }));

    res.json({ success: true, count: enrichedCities.length, cities: enrichedCities });
  } catch (err) {
    console.error('getCitiesByState error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch cities by state' });
  }
};

// 5. GET /api/explore/cities/:cityId
exports.getCityDetails = async (req, res) => {
  try {
    const { cityId } = req.params;
    const city = await ExploreCity.findOne({ cityId: cityId.toLowerCase() });

    if (!city) {
      return res.status(404).json({ success: false, error: 'City not found' });
    }

    const lat = city.location?.coordinates?.[1];
    const lng = city.location?.coordinates?.[0];
    const safety = await computeSafetyStatus(lat, lng);

    const placesCount = await ExplorePlace.countDocuments({ cityId: city.cityId });

    res.json({
      success: true,
      city: {
        ...city.toObject(),
        placesCount,
        safety
      }
    });
  } catch (err) {
    console.error('getCityDetails error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch city details' });
  }
};

// 6. GET /api/explore/cities/:cityId/places
exports.getPlacesByCity = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { category, search, page = 1, limit = 25, live } = req.query;

    const city = await ExploreCity.findOne({ cityId: cityId.toLowerCase() });
    const query = { cityId: cityId.toLowerCase() };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { subCategory: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    let total = await ExplorePlace.countDocuments(query);

    // If live=true requested or no places found, auto-ingest authentic OSM & Wikipedia places
    if ((live === 'true' || total === 0) && city) {
      try {
        await fetchAndIngestLiveAttractions(city, { limit: 15 });
        total = await ExplorePlace.countDocuments(query);
      } catch (ingestErr) {
        console.warn('[Explore] Auto live ingest skipped:', ingestErr.message);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const places = await ExplorePlace.find(query)
      .sort({ 'rating.score': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Enrich with SafeTrail live safety assessment
    const enrichedPlaces = await Promise.all(places.map(async (p) => {
      const lat = p.location?.coordinates?.[1];
      const lng = p.location?.coordinates?.[0];
      const safety = await computeSafetyStatus(lat, lng);
      return {
        ...p.toObject(),
        safety
      };
    }));

    res.json({
      success: true,
      cityId,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      places: enrichedPlaces
    });
  } catch (err) {
    console.error('getPlacesByCity error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch places for city' });
  }
};

// 6b. POST /api/explore/cities/:cityId/sync-live
exports.syncCityLiveAttractions = async (req, res) => {
  try {
    const { cityId } = req.params;
    const city = await ExploreCity.findOne({ cityId: cityId.toLowerCase() });
    if (!city) {
      return res.status(404).json({ success: false, error: 'City not found' });
    }

    const result = await fetchAndIngestLiveAttractions(city, { limit: 25 });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('syncCityLiveAttractions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 7. GET /api/explore/places/:placeId
exports.getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;
    const place = await ExplorePlace.findOne({ placeId: placeId.toLowerCase() });

    if (!place) {
      return res.status(404).json({ success: false, error: 'Attraction not found' });
    }

    const lat = place.location?.coordinates?.[1];
    const lng = place.location?.coordinates?.[0];
    const safety = await computeSafetyStatus(lat, lng);

    res.json({
      success: true,
      place: {
        ...place.toObject(),
        safety
      }
    });
  } catch (err) {
    console.error('getPlaceDetails error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch place details' });
  }
};

// 8. GET /api/explore/nearby?lat=...&lng=...&radius=...
exports.getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lng, radius = 25 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'lat and lng parameters are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = parseFloat(radius) * 1000;

    const places = await ExplorePlace.find({
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusMeters
        }
      }
    }).limit(15);

    const enriched = await Promise.all(places.map(async (p) => {
      const pLat = p.location.coordinates[1];
      const pLng = p.location.coordinates[0];
      const distance = calculateDistance(latitude, longitude, pLat, pLng);
      const safety = await computeSafetyStatus(pLat, pLng);
      return {
        ...p.toObject(),
        distanceKm: parseFloat(distance.toFixed(2)),
        safety
      };
    }));

    res.json({
      success: true,
      count: enriched.length,
      places: enriched
    });
  } catch (err) {
    console.error('getNearbyPlaces error:', err);
    res.status(500).json({ success: false, error: 'Could not fetch nearby places' });
  }
};

// 9. GET /api/explore/search?q=...
exports.searchExplore = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, cities: [], places: [] });
    }

    const regex = { $regex: q.trim(), $options: 'i' };

    const [cities, places] = await Promise.all([
      ExploreCity.find({
        $or: [{ name: regex }, { stateName: regex }, { shortDescription: regex }]
      }).limit(8),
      ExplorePlace.find({
        $or: [{ name: regex }, { cityName: regex }, { subCategory: regex }, { description: regex }]
      }).limit(12)
    ]);

    res.json({
      success: true,
      resultsCount: cities.length + places.length,
      cities,
      places
    });
  } catch (err) {
    console.error('searchExplore error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};
