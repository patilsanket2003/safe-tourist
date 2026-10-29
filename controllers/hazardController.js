const GlobalHazard = require('../models/GlobalHazard');

exports.getNearbyHazards = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 50, hideMilitary, includeMilitary } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Please provide lat and lng' });
    }

    const radiusMeters = parseFloat(radiusKm) * 1000;
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    const query = {
      active: true,
      source_id: { $ne: 'osm-area-554975362' },
      geometry: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusMeters
        }
      }
    };

    if (hideMilitary === 'true' || includeMilitary === 'false') {
      query.type = { $ne: 'restricted area' };
      query.name = { $not: /military/i };
    }

    const hazards = await GlobalHazard.find(query);

    res.status(200).json({
      success: true,
      count: hazards.length,
      data: hazards
    });
  } catch (error) {
    console.error('Error fetching nearby hazards:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
