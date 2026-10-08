const mongoose = require("mongoose");
const { DayAppointSchema } = require("./ItinerarySchemas");

const TourGroupSchema = new mongoose.Schema({
  groupName: { type: String, required: true },

  // The Admin who manages this group
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tourist",
    required: true,
  },

  // Unique code for members to join
  accessCode: { type: String, required: true, unique: true },

  // Trip Duration
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // MASTER ITINERARY - Single Source of Truth
  // We utilize the Node-Based format to store minimal but rich data
  itinerary: [DayAppointSchema],

  // Members of the group
  members: [
    {
      touristId: { type: mongoose.Schema.Types.ObjectId, ref: "Tourist" },
      joinedAt: { type: Date, default: Date.now },
      status: {
        type: String,
        enum: ["active", "inactive", "SOS"],
        default: "active",
      },  
    },
  ],

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Index for geospatial queries on member locations (future proofing)
// Use a partial index so only member documents that actually have coordinates are included.
// This avoids Mongo errors when documents contain empty/missing coordinate arrays.
TourGroupSchema.index(
  { "members.lastKnownLocation": "2dsphere" },
  { partialFilterExpression: { "members.lastKnownLocation.coordinates.0": { $exists: true } } }
);

module.exports = mongoose.model("TourGroup", TourGroupSchema);
