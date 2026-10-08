const mongoose = require('mongoose');

// Sub-schema for individual itinerary nodes (Locations)
const ItineraryNodeSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["stay", "visit", "transit", "start", "end"],
            required: true,
        },
        name: { type: String, required: true },
        location: {
            type: { type: String, default: "Point" },
            coordinates: { type: [Number], required: true }, // [lng, lat]
        },
        address: { type: String },
        scheduledTime: { type: String }, // e.g., "14:00"
        description: { type: String },
    },
    { _id: false },
);

// Sub-schema for a single day
const DayAppointSchema = new mongoose.Schema(
    {
        date: { type: Date, required: true },
        dayNumber: { type: Number, required: true },
        nodes: [ItineraryNodeSchema],
    },
    { _id: false },
);

module.exports = { ItineraryNodeSchema, DayAppointSchema };
