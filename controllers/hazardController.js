const GlobalHazard = require('../models/GlobalHazard');

exports.getNearbyHazards = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Please provide lat and lng' });
    }

    const radiusMeters = parseFloat(radiusKm) * 1000;
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    const hazards = await GlobalHazard.find({
      active: true,
      geometry: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusMeters
        }
      }
    });

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
