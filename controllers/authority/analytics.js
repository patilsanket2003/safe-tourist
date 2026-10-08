const Tourist = require('../../models/Tourist');
const TourGroup = require('../../models/TourGroup');
const mongoose = require('mongoose');
const { DangerZone } = require('../../models/Geofence');
const realtimeService = require('../../services/realtimeService');

// @desc    Get forward-looking crowd prediction based on itineraries
// @route   GET /api/authority/analytics/crowd-prediction
// @access  Private (authority)
exports.predictCrowdSurge = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate tomorrow's date range
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // Aggregate locations specifically planned for tomorrow across all active tourists
    const predictionPipeline = [
      // Step 1: Filter out expired tourists
      { 
        $match: { 
          expiresAt: { $gt: new Date() } 
        } 
      },
      // Step 2: Unwind the dayWiseItinerary array to examine individual days
      { 
        $unwind: {
          path: "$dayWiseItinerary",
          preserveNullAndEmptyArrays: false
        }
      },
      // Step 3: Match only the itinerary days that fall on tomorrow
      { 
        $match: { 
          "dayWiseItinerary.date": { 
            $gte: tomorrowStart, 
            $lt: tomorrowEnd 
          } 
        } 
      },
      // Step 4: Unwind the nodes (places to visit/stay) for that specific day
      { 
        $unwind: {
          path: "$dayWiseItinerary.nodes",
          preserveNullAndEmptyArrays: false
        }
      },
      // Step 5: Group by the location name and summarize
      { 
        $group: {
          _id: {
            name: "$dayWiseItinerary.nodes.name",
            // Also grouping by coordinates slightly rounded to treat nearby points as the same location
            // Using a simple rounding for longitude/latitude
            lat: { $round: [{ $arrayElemAt: ["$dayWiseItinerary.nodes.location.coordinates", 1] }, 3] },
            lng: { $round: [{ $arrayElemAt: ["$dayWiseItinerary.nodes.location.coordinates", 0] }, 3] }
          },
          expectedTourists: { $sum: 1 },
          types: { $addToSet: "$dayWiseItinerary.nodes.type" }
        }
      },
      // Step 6: Format output and sort by highest expected crowd
      {
        $project: {
          _id: 0,
          locationName: "$_id.name",
          coordinates: ["$_id.lng", "$_id.lat"],
          expectedTourists: 1,
          mainActivityTypes: {
            // Count frequency of activity types (visit, stay, transit, etc)
            $setUnion: ["$types"]
          }
        }
      },
      { $sort: { expectedTourists: -1 } },
      { $limit: 10 } // Top 10 predicted hot spots
    ];

    const predictedHotspots = await Tourist.aggregate(predictionPipeline);

    // Generate insight message
    let predictionMessage = "No significant crowds predicted for tomorrow.";
    if (predictedHotspots.length > 0) {
      const topSpot = predictedHotspots[0];
      predictionMessage = `High density expected at ${topSpot.locationName} tomorrow: ${topSpot.expectedTourists} tourists have it in their itinerary.`;
    }

    res.status(200).json({
      success: true,
      message: "Proactive crowd prediction generated successfully.",
      data: {
        summary: predictionMessage,
        targetDate: tomorrowStart.toISOString().split('T')[0],
        hotspots: predictedHotspots
      }
    });

  } catch (err) {
    console.error("❌ predictCrowdSurge error:", err);
    next(err);
  }
};
