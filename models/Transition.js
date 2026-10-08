const mongoose = require('mongoose');

const transitionSchema = new mongoose.Schema({
  // The ID of the user associated with the transition.
  // Using the digitalId as it's immutable and unique to the user's blockchain identity.
  digitalId: {
    type: String,
    required: true,
    index: true, // Index for efficient queries based on user
  },
  
  // A general event type to categorize the transition.
  // Examples: 'location-update', 'geofence-entry', 'geofence-exit', etc.
  eventType: {
    type: String,
    required: true,
  },
  
  // The location at the time of the event.
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  
  // The client-side timestamp when the event occurred.
  // This is provided by the tourist's device.
  timestamp: {
    type: Date,
    required: true,
  },
  
  // The server-side timestamp when the API received the event.
  // This is what your route code adds to the document.
  receivedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  
  // Optional metadata to provide context for the event.
  // For example, a geofence ID, an anomaly score from the AI service, or a note.
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
});

// Create an index for faster lookups by digitalId and timestamp
transitionSchema.index({ digitalId: 1, timestamp: -1 });

module.exports = mongoose.model('Transition', transitionSchema);