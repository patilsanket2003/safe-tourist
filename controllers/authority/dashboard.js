const Tourist = require('../../models/Tourist');
const SOSAlert = require('../../models/SOSAlertModel');
const { decrypt } = require('../../utils/encrypt');
const Incident = require('../../models/Incident');
const Authority = require('../../models/Authority');
const { DangerZone } = require("../../models/Geofence");
// @desc    Get aggregated dashboard statistics
// @route   GET /api/authority/dashboard-stats
// @access  Private (authority)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // 1. Active Tourists & Change
    const activeTouristsCount = await Tourist.countDocuments({ expiresAt: { $gt: new Date() } });

    // Approximation for 'yesterday': Active count at start of today (end of yesterday)
    const activeYesterdayCount = await Tourist.countDocuments({
      createdAt: { $lt: startOfToday },
      expiresAt: { $gt: startOfToday }
    });

    const activeDiff = activeTouristsCount - activeYesterdayCount;
    const activePercentChange = activeYesterdayCount > 0
      ? ((activeDiff / activeYesterdayCount) * 100).toFixed(1)
      : activeDiff > 0 ? "100" : "0";

    // 2. SOS Alerts Today & Change
    const sosTodayCount = await SOSAlert.countDocuments({
      timestamp: { $gte: startOfToday }
    });

    const sosYesterdayCount = await SOSAlert.countDocuments({
      timestamp: { $gte: startOfYesterday, $lt: startOfToday }
    });

    const sosDiff = sosTodayCount - sosYesterdayCount;
    const sosChangeLabel = sosDiff >= 0 ? `+${sosDiff} from yesterday` : `${sosDiff} from yesterday`;

    // 3. High-Risk Zones
    const highRiskZonesCount = await DangerZone.countDocuments({
      riskLevel: { $in: ['High', 'Very High'] }
    });

    // 4. Resolved Cases (This Month) & Change
    const resolvedThisMonth = await SOSAlert.countDocuments({
      status: { $in: ['resolved', 'closed'] },
      timestamp: { $gte: startOfMonth }
    });

    const resolvedLastMonth = await SOSAlert.countDocuments({
      status: { $in: ['resolved', 'closed'] },
      timestamp: { $gte: startOfLastMonth, $lt: startOfMonth }
    });

    const resolvedDiff = resolvedThisMonth - resolvedLastMonth;
    const resolvedPercentChange = resolvedLastMonth > 0
      ? ((resolvedDiff / resolvedLastMonth) * 100).toFixed(1)
      : resolvedDiff > 0 ? "100" : "0";

    // 5. Recent SOS Alerts
    const recentAlertsRaw = await SOSAlert.find({ status: { $ne: 'resolved' } })
      .sort({ timestamp: -1 })
      .limit(3)
      .populate('touristId', 'nameEncrypted touristId')
      .lean();

    const recentAlerts = recentAlertsRaw.map(alert => {
      let touristName = "Unknown Name";
      let displayId = "Unknown ID";

      if (alert.touristId && typeof alert.touristId === 'object') {
        displayId = alert.touristId.touristId;
        try {
          if (alert.touristId.nameEncrypted) {
            touristName = decrypt(alert.touristId.nameEncrypted);
          }
        } catch (e) {
          console.error("Decrypt error", e);
        }
      } else {
        // Fallback if not populated (though it should be)
        displayId = alert.touristId;
      }

      return {
        id: alert._id,
        touristId: displayId,
        touristName: touristName,
        location: alert.location && alert.location.locationName ? alert.location.locationName :
          (alert.location && alert.location.coordinates ? `${alert.location.coordinates[1]}, ${alert.location.coordinates[0]}` : 'Unknown Location'),
        status: alert.status, // new, responded
        timestamp: alert.timestamp,
        reason: alert.sosReason ? alert.sosReason.reason : 'SOS Alert',
        priority: (alert.safetyScore && alert.safetyScore < 40) ? 'CRITICAL' : ((alert.safetyScore && alert.safetyScore < 70) ? 'MEDIUM' : 'LOW'),
        isNew: alert.status === 'new'
      };
    });

    // 6. Tourist Status Overview
    const touristsRaw = await Tourist.find({}).sort({ createdAt: -1 }).limit(5).lean();

    const touristOverview = touristsRaw.map((t) => {
      let name = "Unknown";
      try {
        if (t.nameEncrypted) name = decrypt(t.nameEncrypted);
      } catch (e) {
        console.error("Decrypt error", e);
      }

      const isActive = t.expiresAt && new Date(t.expiresAt) > new Date();

      return {
        id: t.touristId,
        name: name,
        safetyScore: t.safetyScore,
        status: isActive ? "ACTIVE" : "EXPIRED",
        regTxHash: t.audit ? t.audit.regTxHash : "N/A"
      };
    });


    // 7. NEW: Advanced Analytics Data (Response Time, Severity, Demographics)
    
    // a. Response Time Analysis
    const respondingAlerts = await SOSAlert.find({ 
      status: { $in: ['responding', 'resolved', 'closed'] },
      responseDate: { $exists: true } 
    }).select('timestamp responseDate').lean();

    let totalResponseTimeMs = 0;
    let responseCount = 0;
    
    respondingAlerts.forEach(a => {
      if (a.responseDate && a.timestamp) {
        const diff = new Date(a.responseDate) - new Date(a.timestamp);
        if (diff > 0) {
          totalResponseTimeMs += diff;
          responseCount++;
        }
      }
    });

    const avgResponseTimeMs = responseCount > 0 ? (totalResponseTimeMs / responseCount) : 0;
    const avgResponseTimeMinutes = Math.abs(avgResponseTimeMs / 60000).toFixed(1); // One decimal place
    const avgResponseTimeString = `${avgResponseTimeMinutes} min`;

    // b. Incident Severity Breakdown
    const incidents = await Incident.find({}).select('severity type timestamp title location').lean();
    const severityStats = { critical: 0, high: 0, medium: 0, low: 0 };
    
    incidents.forEach(inc => {
      const score = inc.severity || 0;
      if (score >= 0.8) severityStats.critical++;
      else if (score >= 0.6) severityStats.high++;
      else if (score >= 0.4) severityStats.medium++;
      else severityStats.low++;
    });

    // c. Live Incident Stream (Top 5 recent)
    const incidentStream = incidents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .map(i => ({
        id: i._id,
        title: i.title,
        type: i.type,
        severity: i.severity >= 0.8 ? 'critical' : (i.severity >= 0.6 ? 'high' : 'medium'),
        time: i.timestamp,
        location: {
          lat: i.location.coordinates[1],
          lng: i.location.coordinates[0]
        }
      }));

    // d. Demographic Vulnerability (Based on all SOS alerts to find patterns)
    // We need to fetch alerts with populated tourist data
    const allAlertsForDemographics = await SOSAlert.find({})
      .populate('touristId', 'dob gender nationality role ownedGroupId groupId') // Populating unencrypted fields
      .lean();

    let ageGroups = { '18-30': 0, '30-50': 0, '50+': 0, 'Under 18': 0 };
    let soloCount = 0;
    let groupCount = 0;
    let nationalityMap = {};

    allAlertsForDemographics.forEach(a => {
      const t = a.touristId;
      if (t) {
        // Age Pattern
        if (t.dob) {
          const age = new Date().getFullYear() - new Date(t.dob).getFullYear();
          if (age < 18) ageGroups['Under 18']++;
          else if (age <= 30) ageGroups['18-30']++;
          else if (age <= 50) ageGroups['30-50']++;
          else ageGroups['50+']++;
        }

        // Solo vs Group (Check role or group links)
        if (t.role === 'solo' && !t.groupId) soloCount++;
        else groupCount++;

        // Nationality
        if (t.nationality) {
          nationalityMap[t.nationality] = (nationalityMap[t.nationality] || 0) + 1;
        }
      }
    });

    // Find top nationality
    let topNationality = 'N/A';
    let maxNatCount = 0;
    Object.keys(nationalityMap).forEach(nat => {
      if (nationalityMap[nat] > maxNatCount) {
        maxNatCount = nationalityMap[nat];
        topNationality = nat;
      }
    });
    
    // Find top age group
    let topAgeGroup = 'N/A';
    let maxAgeCount = 0;
    Object.keys(ageGroups).forEach(grp => {
      if (ageGroups[grp] > maxAgeCount) {
        maxAgeCount = ageGroups[grp];
        topAgeGroup = grp;
      }
    });

    const soloPercentage = (soloCount + groupCount) > 0 
      ? Math.round((soloCount / (soloCount + groupCount)) * 100) 
      : 0;

    // Solo vs Group Risk Ratio Analysis
    const totalActiveTourists = activeTouristsCount || 1; // prevent div by zero
    const activeSoloTourists = await Tourist.countDocuments({ 
      expiresAt: { $gt: new Date() }, 
      role: 'solo', 
      groupId: { $exists: false } 
    });
    
    const demographicSoloPercentage = Math.round((activeSoloTourists / totalActiveTourists) * 100);
    
    // Evaluate risk disproportion
    let soloRiskMessage = "Standard risk distribution.";
    if (soloPercentage > demographicSoloPercentage * 1.5 && soloCount > 5) {
      soloRiskMessage = `CRITICAL: Solo travelers account for ${soloPercentage}% of SOS alerts but only ${demographicSoloPercentage}% of the current tourist population. Consider broadcasting targeted safety guidelines for lone travelers.`;
    } else if (soloPercentage > demographicSoloPercentage * 1.2 && soloCount > 5) {
      soloRiskMessage = `Elevated Risk: Solo travelers are disproportionately triggering SOS alerts (Alerts: ${soloPercentage}%, Population: ${demographicSoloPercentage}%).`;
    } else {
      soloRiskMessage = `Solo traveler SOS rate (${soloPercentage}%) aligns with their population representation (${demographicSoloPercentage}%).`;
    }

    // e. Unit Utilization
    // Total active units
    const totalAuthorities = await Authority.countDocuments({ 
      role: { $in: ['Emergency Responder', 'Police Officer'] }, 
      isActive: true 
    });

    // Engaged units (those assigned to currently open alerts)
    const openAlerts = await SOSAlert.find({ 
      status: { $in: ['new', 'responding'] } 
    }).select('assignedTo');
    
    const engagedAuthoritiesIds = new Set();
    openAlerts.forEach(alert => {
      if (alert.assignedTo && Array.isArray(alert.assignedTo)) {
        alert.assignedTo.forEach(assignment => {
          if (assignment.authorityId) engagedAuthoritiesIds.add(assignment.authorityId);
        });
      }
    });
    
    const engagedCount = engagedAuthoritiesIds.size;
    const utilizationPercent = totalAuthorities > 0 ? Math.round((engagedCount / totalAuthorities) * 100) : 0;

    // f. Generate Real-Time Predictions and Patterns based on data
    
    // Crowd Surge Prediction: Analyze tourist count trend
    const touristsLast24h = await Tourist.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    const touristsLast48h = await Tourist.countDocuments({
      createdAt: { 
        $gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    });
    
    let crowdSurgeMessage = "Stable tourist inflow expected";
    if (touristsLast24h > touristsLast48h * 1.3) {
      const increasePercent = Math.round(((touristsLast24h - touristsLast48h) / touristsLast48h) * 100);
      crowdSurgeMessage = `High (${increasePercent}% increase detected in last 24h)`;
    } else if (touristsLast24h > touristsLast48h * 1.1) {
      const increasePercent = Math.round(((touristsLast24h - touristsLast48h) / touristsLast48h) * 100);
      crowdSurgeMessage = `Moderate (${increasePercent}% increase detected)`;
    } else if (touristsLast24h < touristsLast48h * 0.8) {
      crowdSurgeMessage = "Low - Tourist activity declining";
    }

    // Risk Forecast: Based on recent incident severity and SOS trends
    const criticalIncidentsLast24h = await Incident.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      severity: { $gte: 0.7 }
    });
    
    let riskForecastMessage = "Normal risk levels";
    if (criticalIncidentsLast24h >= 5) {
      riskForecastMessage = `Elevated - ${criticalIncidentsLast24h} critical incidents in last 24h`;
    } else if (criticalIncidentsLast24h >= 3) {
      riskForecastMessage = `Moderate - ${criticalIncidentsLast24h} critical incidents detected`;
    } else if (sosTodayCount > sosYesterdayCount * 1.5 && sosYesterdayCount > 0) {
      const increasePercent = Math.round(((sosTodayCount - sosYesterdayCount) / sosYesterdayCount) * 100);
      riskForecastMessage = `Rising - SOS alerts increased ${increasePercent}%`;
    } else if (sosTodayCount > sosYesterdayCount && sosYesterdayCount === 0) {
      riskForecastMessage = `Rising - ${sosTodayCount} new SOS alerts today`;
    }

    // Proactive Deployment: Identify high-activity zones from incidents
    const recentIncidentsByLocation = await Incident.aggregate([
      { 
        $match: { 
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      },
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 2] }
          },
          count: { $sum: 1 },
          avgSeverity: { $avg: "$severity" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    let deploymentMessage = "No critical hotspots detected";
    if (recentIncidentsByLocation.length > 0) {
      const hotspot = recentIncidentsByLocation[0];
      if (hotspot.count >= 5) {
        deploymentMessage = `Deploy units to area (${hotspot._id.lat.toFixed(2)}°, ${hotspot._id.lng.toFixed(2)}°) - ${hotspot.count} incidents detected`;
      } else {
        deploymentMessage = `Monitor area (${hotspot._id.lat.toFixed(2)}°, ${hotspot._id.lng.toFixed(2)}°) - ${hotspot.count} incidents`;
      }
    }

    // Detect Patterns from historical data
    const patternInsights = [];

    // Pattern 1: Time-based incident analysis
    const incidentsByHour = await Incident.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          count: { $sum: 1 },
          types: { $push: "$type" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    if (incidentsByHour.length > 0) {
      const peakHour = incidentsByHour[0];
      const timeRange = peakHour._id >= 18 ? "evening (6 PM - midnight)" : 
                       peakHour._id >= 12 ? "afternoon (12 PM - 6 PM)" : "morning (6 AM - 12 PM)";
      patternInsights.push(`Peak incident time: ${timeRange} with ${peakHour.count} incidents`);
    }

    // Pattern 2: Type-based pattern
    const incidentsByType = await Incident.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 2 }
    ]);

    if (incidentsByType.length > 0) {
      const topType = incidentsByType[0];
      patternInsights.push(`Most common incident: ${topType._id} (${topType.count} cases in 30 days)`);
    }

    // Pattern 3: High-risk zone pattern
    const highRiskZones = await DangerZone.find({ 
      riskLevel: { $in: ['High', 'Very High'] } 
    }).limit(2).lean();

    if (highRiskZones.length > 0) {
      const zoneNames = highRiskZones.map(z => z.name).join(', ');
      patternInsights.push(`Active high-risk zones: ${zoneNames}`);
    }

    // Pattern 4: Response efficiency
    if (avgResponseTimeMinutes > 15) {
      patternInsights.push(`Response time exceeds SLA target by ${(avgResponseTimeMinutes - 15).toFixed(1)} minutes`);
    } else if (responseCount > 0) {
      patternInsights.push(`Response time within SLA: avg ${avgResponseTimeMinutes} min`);
    }

    // Convert patterns array to object format expected by frontend
    const patternsObject = {};
    patternInsights.forEach((insight, idx) => {
      patternsObject[`insight${idx + 1}`] = insight;
    });

    res.status(200).json({
      success: true,
      data: {
        activeTourists: {
          count: activeTouristsCount,
          change: `${activePercentChange >= 0 ? '+' : ''}${activePercentChange}% from yesterday`
        },
        sosAlertsToday: {
          count: sosTodayCount,
          change: sosChangeLabel
        },
        highRiskZones: {
          count: highRiskZonesCount
        },
        resolvedCases: {
          count: resolvedThisMonth,
          change: `${resolvedPercentChange >= 0 ? '+' : ''}${resolvedPercentChange}% from last month`
        },
        recentAlerts,
        touristOverview,
        
        // Advanced Analytics Merged Data
        analytics: {
          responseAnalysis: {
            avgTime: avgResponseTimeString,
            avgTimeMinutes: parseFloat(avgResponseTimeMinutes),
            samples: respondingAlerts
              .slice(0, 50)
              .map(a => parseFloat(((new Date(a.responseDate) - new Date(a.timestamp)) / 1000).toFixed(2))) // seconds
          },
          unitUtilization: {
            percent: utilizationPercent,
            engaged: engagedCount,
            total: totalAuthorities,
            label: `${utilizationPercent}% Authorities engaged with assinging units`
          },
          incidentAnalysis: {
            severityBreakdown: severityStats,
            recentStream: incidentStream
          },
          demographics: {
            mostSosFromAge: topAgeGroup,
            soloTravelersPercent: `${soloPercentage}%`,
            populationSoloPercent: `${demographicSoloPercentage}%`,
            soloRiskInsight: soloRiskMessage,
            topGroup: topNationality
          },
          predictions: {
            crowdSurge: crowdSurgeMessage,
            riskForecast: riskForecastMessage,
            proactiveDeployment: deploymentMessage
          },
          patterns: patternsObject
        }
      }
    });

  } catch (err) {
    console.error("❌ getDashboardStats error:", err);
    next(err);
  }
};