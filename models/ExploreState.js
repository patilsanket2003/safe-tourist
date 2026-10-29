const mongoose = require('mongoose');

const exploreStateSchema = new mongoose.Schema({
  stateId: {
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
  capital: {
    type: String,
    trim: true
  },
  region: {
    type: String,
    enum: ['North', 'South', 'West', 'East', 'Central', 'Northeast'],
    default: 'North'
  },
  coverImage: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  popularCategories: [{
    type: String
  }],
  destinationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExploreState', exploreStateSchema);
