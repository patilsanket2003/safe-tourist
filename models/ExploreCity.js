const mongoose = require('mongoose');

const exploreCitySchema = new mongoose.Schema({
  cityId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  stateId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  stateName: {
    type: String,
    required: true,
    trim: true
  },
  categories: [{
    type: String,
    index: true
  }],
  primaryCategory: {
    type: String,
    required: true,
    enum: ['sea-beaches', 'mountains-nature', 'historic-places'],
    index: true
  },
  categoryRanks: {
    type: Map,
    of: Number,
    default: {}
  },
  rank: {
    type: Number,
    default: 99
  },
  coverImage: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true
  },
  fullDescription: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  bestTimeToVisit: {
    type: String
  },
  weatherOverview: {
    type: String
  },
  attractionCount: {
    type: Number,
    default: 0
  },
  source: {
    provider: { type: String, default: 'Wikidata' },
    wikidataId: { type: String },
    license: { type: String, default: 'Creative Commons CC-BY-SA 4.0' },
    attribution: { type: String, default: 'Wikimedia Contributors' }
  }
}, {
  timestamps: true
});

// Spatial index for geo queries
exploreCitySchema.index({ location: '2dsphere' });
exploreCitySchema.index({ primaryCategory: 1, rank: 1 });

module.exports = mongoose.model('ExploreCity', exploreCitySchema);
