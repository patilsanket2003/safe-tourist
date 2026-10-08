const mongoose = require("mongoose");

const GlobalHazardSchema = new mongoose.Schema({
  // Unique identifier from the source (e.g., USGS event ID, OSM node ID)
  source_id: { type: String, required: true, unique: true },
  
  // Name or title of the hazard (e.g., "M 5.4 Earthquake - Japan")
  name: { type: String, required: true },
  
  // Type of hazard (e.g., earthquake, flood, military_zone, volcano)
  type: { type: String, required: true },
  
  // Severity (Low, Medium, High, Critical)
  severity: { 
    type: String, 
    enum: ["Low", "Medium", "High", "Critical", "Unknown"],
    default: "Unknown"
  },
  
  // GeoJSON geometry (Point or Polygon)
  geometry: {
    type: {
      type: String,
      enum: ['Point', 'Polygon', 'MultiPolygon', 'LineString'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed, // Can be array of numbers (Point) or nested arrays (Polygon)
      required: true
    }
  },
  
  // Data source (e.g., "USGS", "OSM", "GDACS")
  source: { type: String, required: true },
  
  // Optional description or details provided by the API
  description: { type: String },
  
  // Is this hazard currently active?
  active: { type: Boolean, default: true },

  // When the hazard expires (if applicable, e.g., weather alerts)
  expires_at: { type: Date }
}, { 
  timestamps: true 
});

// Create a 2dsphere index for fast spatial queries
GlobalHazardSchema.index({ geometry: '2dsphere' });
// Index for fast active/inactive filtering
GlobalHazardSchema.index({ active: 1 });
GlobalHazardSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired hazards

module.exports = mongoose.model("GlobalHazard", GlobalHazardSchema);
