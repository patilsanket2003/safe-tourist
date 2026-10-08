const EmergencyVehicle = require('../../models/EmergencyVehicle');

exports.addEmergencyVehicle = async (req, res, next) => {
  try {
    const { vehicleId, type } = req.body;
    
    if (!vehicleId || !type) {
      return res.status(400).json({ success: false, message: 'Vehicle ID and type are required' });
    }
    
    const existing = await EmergencyVehicle.findOne({ vehicleId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vehicle ID already exists' });
    }
    
    const vehicle = await EmergencyVehicle.create({ vehicleId, type });
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    next(error);
  }
};

exports.getEmergencyVehicles = async (req, res, next) => {
  try {
    const vehicles = await EmergencyVehicle.find({});
    res.status(200).json({ success: true, vehicles });
  } catch (error) {
    next(error);
  }
};
