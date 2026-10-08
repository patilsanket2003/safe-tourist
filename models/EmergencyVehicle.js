const mongoose = require('mongoose');

const emergencyVehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['police', 'ambulance', 'firebrigade'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    latitude: Number,
    longitude: Number
  },
  currentRoute: {
    type: Object, // Could store the polyline or route geometry here
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyVehicle', emergencyVehicleSchema);
