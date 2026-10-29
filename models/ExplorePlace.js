const mongoose = require('mongoose');

const explorePlaceSchema = new mongoose.Schema({
  placeId: {
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
  cityId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  cityName: {
    type: String,
    required: true
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
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['sea-beaches', 'mountains-nature', 'historic-places'],
    index: true
  },
  subCategory: {
    type: String,
    default: 'Attraction'
  },
  coverImage: {
    type: String,
    required: true
  },
  images: [{
    url: String,
    caption: String,
    author: String,
    license: String,
    sourceUrl: String
  }],
  description: {
    type: String,
    required: true
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
  verifiedInfo: {
    bestSeason: { type: String },
    entryFee: { type: String, default: 'Free / Standard entry' },
    timings: { type: String, default: 'Open daily' },
    wheelchairAccessible: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false }
  },
  rating: {
    score: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 250 },
    source: { type: String, default: 'Official Tourism Guide' }
  },
  source: {
    provider: { type: String, default: 'OpenStreetMap' },
    osmId: { type: String },
    osmType: { type: String },
    wikidataId: { type: String },
    license: { type: String, default: 'ODbL & Creative Commons' },
    attribution: { type: String, default: 'OpenStreetMap & Wikimedia contributors' }
  }
}, {
  timestamps: true
});

explorePlaceSchema.index({ location: '2dsphere' });
explorePlaceSchema.index({ cityId: 1, category: 1 });

module.exports = mongoose.model('ExplorePlace', explorePlaceSchema);
