const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  title: String,
  type: { 
    type: String, 
    enum: ['theft', 'assault', 'accident', 'riot', 'natural_disaster', 'other'],
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true, index: '2dsphere' } // [lng, lat]
  },
  severity: { type: Number, min: 0, max: 1, default: 0.5 }, // 0 to 1
  timestamp: { type: Date, default: Date.now },
  source: { type: String, default: 'Manual' } // GNews, Police, User, etc.
});

incidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
