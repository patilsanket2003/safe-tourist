import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  MapPin,
  Shield,
  TrendingUp,
  FileText,
  Activity,
  Clock,
  Download,
  UserCircle2,
  ShieldAlert,
  ClipboardList,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
  LabelList,
  BarChart,
  Bar,
} from "recharts";
import {
  fetchDashboardStats,
  fetchCrowdPrediction,
  DashboardStats,
  CrowdPredictionData,
} from "../api/dashboard";
import { StatsBlock, StatItem } from "./stats-01";
import {
  MAX_AUTHORITY_UNITS,
  UNIT_CAPACITY_EVENT,
  UnitCapacitySnapshot,
  getUnitCapacitySnapshot,
} from "../utils/unitCapacity";
import { CreateAlertModal } from "./CreateAlertModal";
import { toast } from "sonner";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // Original Dashboard State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [crowdPrediction, setCrowdPrediction] =
    useState<CrowdPredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false);
  const [unitCapacity, setUnitCapacity] = useState<UnitCapacitySnapshot>({
    authorityKey: "authority:anonymous",
    totalUnits: MAX_AUTHORITY_UNITS,
    usedUnits: 0,
    availableUnits: MAX_AUTHORITY_UNITS,
    updatedAt: "",
  });

  // Refs for PDF capture
  const responseChartRef = React.useRef<HTMLDivElement>(null);
  const severityChartRef = React.useRef<HTMLDivElement>(null);

  // Real-Time Ops Data from Stats
  const analytics = stats?.analytics;
  const avgResponse = analytics?.responseAnalysis?.avgTimeMinutes || 0;
  const utilPercent = analytics?.unitUtilization?.percent || 0;
  const engagedUnits = analytics?.unitUtilization?.engaged || 0;
  const totalUnits = analytics?.unitUtilization?.total || 0;

  // Charts Data - Backend now sends samples in seconds, convert to minutes
  // Reverse the array to show oldest to newest (left to right on chart)
  const samples = analytics?.responseAnalysis?.samples || [];
  const chartSeries = samples
    .slice()
    .reverse()
    .map((val, i) => ({
      time: `T-${samples.length - 1 - i}`,
      responseTime: val / 60, // Convert seconds to minutes
    }));

  const incidentSeverities = analytics?.incidentAnalysis?.severityBreakdown || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const severityData = Object.keys(incidentSeverities).map((k) => ({
    severity: k,
    count: (incidentSeverities as any)[k] || 0,
  }));

  const liveIncidents = (analytics?.incidentAnalysis?.recentStream || []).slice(
    0,
    5,
  );
  const patterns = Object.values(analytics?.patterns || {});
  const predictions = analytics?.predictions || {
    crowdSurge: "N/A",
    riskForecast: "N/A",
    proactiveDeployment: "N/A",
  };
  const demographics = analytics?.demographics || {
    mostSosFromAge: "N/A",
    soloTravelersPercent: "0%",
    populationSoloPercent: "0%",
    soloRiskInsight: "No demographic risk insight available.",
    topGroup: "N/A",
  };
  const normalizedDemographicInsight =
    typeof demographics.soloRiskInsight === "string"
      ? demographics.soloRiskInsight.trim()
      : "";
  const hasProvidedDemographicInsight =
    normalizedDemographicInsight.length > 0 &&
    normalizedDemographicInsight.toLowerCase() !==
      "no demographic risk insight available.";
  const hasDemographicMetrics = [
    demographics.mostSosFromAge,
    demographics.topGroup,
    demographics.soloTravelersPercent,
    demographics.populationSoloPercent,
  ].some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    return normalized !== "" && normalized !== "n/a" && normalized !== "na";
  });
  const recentAlerts = (stats?.recentAlerts || []).slice(0, 4);
  const loadStats = React.useCallback(async () => {
    try {
      const [statsData, predictionData] = await Promise.all([
        fetchDashboardStats(),
        fetchCrowdPrediction().catch((e) => {
          console.error("Failed to fetch crowd prediction", e);
          return null;
        }),
      ]);
      setStats(statsData);
      setCrowdPrediction(predictionData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Original Dashboard Stats
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  useEffect(() => {
    let mounted = true;

    const refreshUnitCapacity = async () => {
      const snapshot = await getUnitCapacitySnapshot();
      if (mounted) setUnitCapacity(snapshot);
    };

    refreshUnitCapacity();

    const handler = () => {
      void refreshUnitCapacity();
    };

    window.addEventListener(UNIT_CAPACITY_EVENT, handler);
    window.addEventListener("storage", handler);
    window.addEventListener("focus", handler);

    return () => {
      mounted = false;
      window.removeEventListener(UNIT_CAPACITY_EVENT, handler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase() || "";
    switch (s) {
      case "critical":
        return "bg-red-50 text-red-700 border border-red-100";
      case "high":
        return "bg-orange-50 text-orange-700 border border-orange-100";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border border-yellow-100";
      case "low":
        return "bg-blue-50 text-blue-700 border border-blue-100";
      default:
        return "bg-gray-50 text-gray-600 border border-gray-100";
    }
  };

  const formatHotspotLabel = (hotspot: any): string => {
    if (typeof hotspot === "string") return hotspot;
    if (!hotspot || typeof hotspot !== "object") return "Unknown hotspot";

    const locationName = String(hotspot.locationName || "").trim();
    const coordinates = Array.isArray(hotspot.coordinates)
      ? hotspot.coordinates
      : [];
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    const expectedTourists = hotspot.expectedTourists;
    const activityTypes = Array.isArray(hotspot.mainActivityTypes)
      ? hotspot.mainActivityTypes.filter(Boolean).join(", ")
      : "";

    const coordText =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? ` (${lat.toFixed(3)}, ${lng.toFixed(3)})`
        : "";
    const volumeText =
      expectedTourists !== undefined && expectedTourists !== null
        ? ` • Expected: ${expectedTourists}`
        : "";
    const activityText = activityTypes ? ` • Activities: ${activityTypes}` : "";

    return `${locationName || "Predicted hotspot"}${coordText}${volumeText}${activityText}`;
  };

  const formatPatternLabel = (pattern: any): string => {
    if (typeof pattern === "string") return pattern;
    if (pattern === null || pattern === undefined) return "";
    if (typeof pattern === "number" || typeof pattern === "boolean") {
      return String(pattern);
    }

    if (typeof pattern === "object") {
      const parts: string[] = [];
      if (pattern.title) parts.push(String(pattern.title));
      if (pattern.locationName) parts.push(`at ${pattern.locationName}`);
      if (pattern.description) parts.push(String(pattern.description));
      if (parts.length > 0) return parts.join(" • ");
      return JSON.stringify(pattern);
    }

    return String(pattern);
  };

  const handleExportPDF = async () => {
    if (!stats) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    const safeBottomY = pageHeight - 18;
    const generatedAt = new Date().toLocaleString();
    let currentY = 18;

    const drawPageHeader = (title = "Authority Command Center") => {
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, marginX, 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Generated ${generatedAt}`, pageWidth - marginX, 9, {
        align: "right",
      });
      doc.setTextColor(31, 41, 55);
      currentY = 30;
    };

    const ensureSpace = (requiredHeight: number) => {
      if (currentY + requiredHeight <= safeBottomY) return;
      doc.addPage();
      drawPageHeader("Authority Command Center");
    };

    const drawSectionTitle = (title: string) => {
      ensureSpace(14);
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(marginX, currentY - 4, contentWidth, 9, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(title, marginX + 3, currentY + 1.5);
      currentY += 12;
    };

    drawPageHeader("Authority Command Center");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39);
    doc.text("Operational Analytics Report", marginX, currentY);
    currentY += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    const subtitle =
      "This report summarizes live operations, response efficiency, incident trends, and predictive risk insights for command-level decision making.";
    const subtitleLines = doc.splitTextToSize(subtitle, contentWidth);
    doc.text(subtitleLines, marginX, currentY);
    currentY += subtitleLines.length * 4 + 6;

    const cardGap = 4;
    const cardW = (contentWidth - cardGap) / 2;
    const cardH = 22;
    const summaryCards = [
      {
        title: "SOS Alerts Today",
        value: String(stats.sosAlertsToday.count),
        note: stats.sosAlertsToday.change,
      },
      {
        title: "Average Response",
        value: `${avgResponse.toFixed(1)} min`,
        note: avgResponse <= 15 ? "Within SLA" : "SLA Attention Needed",
      },
      {
        title: "Active Tourists",
        value: stats.activeTourists.count.toLocaleString(),
        note: stats.activeTourists.change,
      },
      {
        title: "Unit Utilization",
        value: `${utilPercent}%`,
        note: `${engagedUnits}/${totalUnits} units engaged`,
      },
    ];

    ensureSpace(cardH * 2 + 10);
    summaryCards.forEach((card, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = marginX + col * (cardW + cardGap);
      const y = currentY + row * (cardH + cardGap);
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(card.title, x + 3, y + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(card.value, x + 3, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(card.note, x + 3, y + 18);
    });
    currentY += cardH * 2 + cardGap + 8;

    drawSectionTitle("1. Operational KPI Summary");

    const kpiData = [
      [
        "SOS Alerts (Today)",
        String(stats.sosAlertsToday.count),
        stats.sosAlertsToday.change,
      ],
      [
        "Average Response Time",
        `${avgResponse.toFixed(1)} min`,
        avgResponse <= 15 ? "Within SLA threshold" : "Above SLA threshold",
      ],
      [
        "Active Tourists",
        stats.activeTourists.count.toLocaleString(),
        stats.activeTourists.change,
      ],
      [
        "Unit Utilization",
        `${utilPercent}%`,
        `${engagedUnits}/${totalUnits} units engaged`,
      ],
      [
        "Resolved Cases",
        String(stats.resolvedCases.count),
        stats.resolvedCases.change,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Metric", "Current Value", "Operational Note"]],
      body: kpiData,
      theme: "grid",
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: { textColor: [31, 41, 55], fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 58, fontStyle: "bold" },
        1: { cellWidth: 38 },
        2: { cellWidth: 82 },
      },
      margin: { left: marginX, right: marginX },
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;

    drawSectionTitle("2. Visual Trend Analysis");

    if (responseChartRef.current) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text("Response Time Trend", marginX, currentY);
      currentY += 4;

      try {
        const canvas = await html2canvas(responseChartRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        ensureSpace(imgHeight + 6);
        doc.addImage(imgData, "PNG", marginX, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 7;
      } catch (e) {
        console.error("Error capturing response chart", e);
      }
    }

    if (severityChartRef.current) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text("Incident Severity Distribution", marginX, currentY);
      currentY += 4;

      try {
        const canvas = await html2canvas(severityChartRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        ensureSpace(imgHeight + 6);
        doc.addImage(imgData, "PNG", marginX, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 8;
      } catch (e) {
        console.error("Error capturing severity chart", e);
      }
    }

    drawSectionTitle("3. Predictive Intelligence");

    const predictionRows = [
      ["Crowd Surge Risk", predictions.crowdSurge || "N/A"],
      ["Risk Forecast", predictions.riskForecast || "N/A"],
      ["Proactive Deployment", predictions.proactiveDeployment || "N/A"],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Forecast Dimension", "Assessment"]],
      body: predictionRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: { textColor: [31, 41, 55], fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: "bold" },
        1: { cellWidth: 116 },
      },
      margin: { left: marginX, right: marginX },
    });
    currentY = (doc as any).lastAutoTable.finalY + 6;

    if (crowdPrediction) {
      ensureSpace(36);
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(marginX, currentY, contentWidth, 28, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 64, 175);
      doc.text(
        `Surge Forecast Target: ${crowdPrediction.targetDate}`,
        marginX + 3,
        currentY + 6,
      );

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8.5);
      const summaryLines = doc.splitTextToSize(
        crowdPrediction.summary || "No summary available.",
        contentWidth - 6,
      );
      doc.text(summaryLines, marginX + 3, currentY + 11);
      currentY += 34;

      if (crowdPrediction.hotspots.length > 0) {
        ensureSpace(18);
        autoTable(doc, {
          startY: currentY,
          head: [["Projected High Risk Zones"]],
          body: crowdPrediction.hotspots.map((spot) => [
            formatHotspotLabel(spot),
          ]),
          theme: "grid",
          headStyles: {
            fillColor: [153, 27, 27],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          bodyStyles: { textColor: [31, 41, 55], fontSize: 8.5 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: marginX, right: marginX },
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    if (patterns.length > 0) {
      ensureSpace(20);
      autoTable(doc, {
        startY: currentY,
        head: [["Detected Operational Patterns"]],
        body: patterns.map((pattern: any) => [formatPatternLabel(pattern)]),
        theme: "grid",
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: { textColor: [31, 41, 55], fontSize: 8.5 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: marginX, right: marginX },
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    if (liveIncidents.length > 0) {
      drawSectionTitle("4. Recent Live Incidents");
      const incidentRows = liveIncidents.map((incident) => [
        new Date(incident.time).toLocaleTimeString(),
        incident.severity.toUpperCase(),
        incident.title,
        incident.location
          ? `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`
          : "Unknown",
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Time", "Severity", "Description", "Location"]],
        body: incidentRows,
        theme: "grid",
        headStyles: {
          fillColor: [127, 29, 29],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        bodyStyles: { textColor: [31, 41, 55], fontSize: 8.5 },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 82 },
          3: { cellWidth: 58 },
        },
        margin: { left: marginX, right: marginX },
      });
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(229, 231, 235);
      doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(
        "Confidential - Authority Internal Use Only",
        marginX,
        pageHeight - 7.5,
      );
      doc.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - marginX,
        pageHeight - 7.5,
        {
          align: "right",
        },
      );
    }

    doc.save("authority_analytics_report.pdf");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-500">
        <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p>Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 bg-gray-50/30 p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Authority Command Center
          </h1>
          <p className="text-gray-500 text-sm">
            Overview of tourist safety operations
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Live Stream
            </span>
          </div>
        </div>
      </div>

      {/* --- SECTION 1: OVERVIEW & KPIs --- */}
      <section>
        <StatsBlock
          stats={
            [
              {
                id: "sos-alerts",
                name: "SOS Alerts Today",
                value: stats.sosAlertsToday.count,
                change: stats.sosAlertsToday.change,
                changeType:
                  stats.sosAlertsToday.change.includes("+") &&
                  !stats.sosAlertsToday.change.includes("+0")
                    ? ("negative" as const)
                    : ("positive" as const),
                icon: AlertTriangle,
                helperText: "Requires immediate attention",
              },
              {
                id: "response-time",
                name: "Avg Response Time",
                value: `${avgResponse.toFixed(1)}m`,
                change:
                  avgResponse <= 15
                    ? `${(((15 - avgResponse) / 15) * 100).toFixed(0)}% below SLA`
                    : `${(((avgResponse - 15) / 15) * 100).toFixed(0)}% above SLA`,
                changeType:
                  avgResponse <= 15
                    ? ("positive" as const)
                    : ("negative" as const),
                icon: Clock,
                helperText:
                  avgResponse <= 15
                    ? "Within 15m SLA target"
                    : "Exceeds 15m SLA target",
              },
              {
                id: "active-tourists",
                name: "Active Tourists",
                value: stats.activeTourists.count.toLocaleString(),
                change:
                  stats.activeTourists.change === "+0.0% from yesterday" ||
                  stats.activeTourists.change === "+0% from yesterday"
                    ? "Stable"
                    : stats.activeTourists.change,
                changeType:
                  stats.activeTourists.change.includes("+") &&
                  !stats.activeTourists.change.startsWith("+0")
                    ? ("positive" as const)
                    : stats.activeTourists.change.includes("-")
                      ? ("negative" as const)
                      : ("neutral" as const),
                icon: Users,
                helperText: "Currently registered",
              },
              {
                id: "resolved",
                name: "Resolved Cases",
                value: stats.resolvedCases.count,
                change:
                  stats.resolvedCases.change === "+0% from last month" ||
                  stats.resolvedCases.change === "+0.0% from last month"
                    ? "No change"
                    : stats.resolvedCases.change,
                changeType:
                  stats.resolvedCases.change.includes("+") &&
                  !stats.resolvedCases.change.startsWith("+0")
                    ? ("positive" as const)
                    : stats.resolvedCases.change.includes("-")
                      ? ("negative" as const)
                      : ("neutral" as const),
                icon: Shield,
                helperText: "This month's total",
              },
              {
                id: "high-risk-zones",
                name: "High-Risk Zones",
                value: stats.highRiskZones.count,
                change:
                  stats.highRiskZones.count > 0
                    ? "Requires monitoring"
                    : "No high-risk zones",
                changeType:
                  stats.highRiskZones.count > 0
                    ? ("negative" as const)
                    : ("positive" as const),
                icon: ShieldAlert,
                helperText: "Danger zones tagged High / Very High",
              },
              {
                id: "units-left",
                name: "Units Left",
                value: `${unitCapacity.availableUnits}/${unitCapacity.totalUnits}`,
                change:
                  unitCapacity.availableUnits === 0
                    ? "Exhausted"
                    : `${unitCapacity.usedUnits} consumed`,
                changeType:
                  unitCapacity.availableUnits === 0
                    ? ("negative" as const)
                    : unitCapacity.availableUnits <= 2
                      ? ("neutral" as const)
                      : ("positive" as const),
                icon: Activity,
                helperText: "Authority assignment capacity",
              },
            ] satisfies StatItem[]
          }
          className="lg:grid-cols-3 xl:grid-cols-6"
        />
      </section>

      {/* --- SECTION 2: OPERATIONS & ANALYTICS --- */}
      <section className="grid grid-cols-12 gap-6">
        {/* Charts Column (Left - 8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Response Trend */}
          <div
            ref={responseChartRef}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-bold text-gray-900">Response Time Trend</h4>
                <p className="text-xs text-gray-500">
                  Real-time performance vs SLA (15m)
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>{" "}
                  Actual
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span>{" "}
                  SLA Limit
                </span>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartSeries}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F3F4F6"
                  />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9CA3AF" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{
                      color: "#111827",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }}
                    labelStyle={{
                      color: "#6B7280",
                      marginBottom: "0.25rem",
                      fontSize: "10px",
                      textTransform: "uppercase",
                    }}
                    formatter={(value: any) => [
                      `${Number(value).toFixed(2)} min`,
                      "Response Time",
                    ]}
                  />
                  <ReferenceLine y={15} stroke="#EF4444" strokeDasharray="3 3">
                    <Label
                      value="SLA Threshold (15m)"
                      position="insideTopRight"
                      fill="#EF4444"
                      fontSize={10}
                    />
                  </ReferenceLine>
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#3B82F6",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Predictive Insights Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">
                    Predictive Intel
                  </h4>
                  <p className="text-xs text-gray-500">
                    AI-driven safety forecasting
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {crowdPrediction && (
                  <div className="flex flex-col p-4 bg-purple-50/50 rounded-xl border border-purple-100 transition-all hover:bg-purple-50">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                        Surge Forecast
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-purple-500 font-semibold uppercase">
                        Target: {crowdPrediction.targetDate}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-purple-900 leading-snug mb-2">
                      {crowdPrediction.summary}
                    </p>
                    {crowdPrediction.hotspots.length > 0 && (
                      <div className="space-y-1 mt-1">
                        <p className="text-xs font-bold text-purple-800 uppercase">
                          High Risk Zones:
                        </p>
                        <ul className="text-xs text-purple-700 pl-4 list-disc">
                          {crowdPrediction.hotspots.map((spot, i) => (
                            <li key={i}>{formatHotspotLabel(spot)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {predictions.riskForecast !== "N/A" && (
                  <div className="flex flex-col p-4 bg-orange-50/50 rounded-xl border border-orange-100 transition-all hover:bg-orange-50">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                        Forecast
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-orange-900 leading-snug">
                      {predictions.riskForecast}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Incident Severity Bar */}
            <div
              ref={severityChartRef}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h4 className="font-bold text-gray-900 mb-1">
                Incident Severity
              </h4>
              <p className="text-xs text-gray-500 mb-6">Volume by risk level</p>

              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={severityData}
                    barSize={32}
                    margin={{ top: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F3F4F6"
                    />
                    <XAxis
                      dataKey="severity"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6B7280", fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "#F9FAFB" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {severityData.map((entry, index) => {
                        let fill = "#9CA3AF";
                        if (entry.severity === "critical") fill = "#EF4444";
                        if (entry.severity === "high") fill = "#F97316";
                        if (entry.severity === "medium") fill = "#EAB308";
                        if (entry.severity === "low") fill = "#3B82F6";
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                      <LabelList
                        dataKey="count"
                        position="top"
                        fill="#374151"
                        fontSize={12}
                        fontWeight="bold"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {patterns.length > 0 && (
                <div className="pt-5 mt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Detected Patterns
                    </h5>
                  </div>
                  <ul className="space-y-2">
                    {patterns.slice(0, 4).map((p: any, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-600 flex items-start"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-3 shrink-0"></div>
                        <span className="leading-relaxed">
                          {formatPatternLabel(p)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence Column (Right - 4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Live Incident Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[360px] max-h-[460px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">
                  Action Feed
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">
                {liveIncidents.length} Active
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {liveIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                  <Shield className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">All Quiet</p>
                </div>
              ) : (
                liveIncidents.map((i, idx) => (
                  <div
                    key={i.id}
                    className={`p-4 rounded-xl border transition-all ${idx === 0 ? "bg-red-50/30 border-red-100 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getSeverityColor(i.severity)}`}
                        >
                          {i.severity}
                        </span>
                        <h4
                          className="font-semibold text-gray-900 text-sm truncate max-w-[120px]"
                          title={i.title}
                        >
                          {i.title}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(i.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      <MapPin className="h-3 w-3 mr-1" />
                      {i.location
                        ? `Lat: ${i.location.lat.toFixed(4)}, Lon: ${i.location.lng.toFixed(4)}`
                        : "Unknown Location"}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={() =>
                          unitCapacity.availableUnits > 0 &&
                          navigate("/alerts?autoAssign=1")
                        }
                        disabled={unitCapacity.availableUnits <= 0}
                        className={`flex items-center justify-center px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${unitCapacity.availableUnits > 0 ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900" : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"}`}
                      >
                        {unitCapacity.availableUnits > 0
                          ? "Assign Unit"
                          : "No Units Left"}
                      </button>
                      <button
                        onClick={() => navigate("/heatmap")}
                        className="flex items-center justify-center px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        View Map
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent SOS Alerts (Backend: recentAlerts) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-red-600" />
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                  Recent SOS
                </h3>
              </div>
              <span className="text-xs text-gray-500">
                {recentAlerts.length} items
              </span>
            </div>

            {recentAlerts.length === 0 ? (
              <p className="text-sm text-gray-500">
                No recent unresolved alerts.
              </p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-gray-100 p-3 bg-gray-50/40"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p
                        className="text-sm font-semibold text-gray-900 truncate"
                        title={alert.reason}
                      >
                        {alert.reason || "SOS Alert"}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold uppercase">
                        {alert.priority || "N/A"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {alert.location}
                    </p>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                      <span>
                        {alert.touristName || alert.touristId || "Unknown"}
                      </span>
                      <span>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserCircle2 className="h-4 w-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                  Demographic Risk
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg border border-gray-100 p-2 bg-gray-50/50">
                  <p className="text-[10px] uppercase text-gray-500">
                    Top Age Group
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {demographics.mostSosFromAge}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 p-2 bg-gray-50/50">
                  <p className="text-[10px] uppercase text-gray-500">
                    Top Nationality
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {demographics.topGroup}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 p-2 bg-gray-50/50">
                  <p className="text-[10px] uppercase text-gray-500">
                    Solo SOS
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {demographics.soloTravelersPercent}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 p-2 bg-gray-50/50">
                  <p className="text-[10px] uppercase text-gray-500">
                    Authority Utilization
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {`${utilPercent}%`}
                  </p>
                </div>
              </div>
              {hasProvidedDemographicInsight ? (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {normalizedDemographicInsight}
                </p>
              ) : !hasDemographicMetrics ? (
                <p className="text-xs text-gray-600 leading-relaxed">
                  No demographic risk insight available.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setIsCreateAlertOpen(true)}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-all hover:shadow-sm cursor-pointer group"
          >
            <AlertTriangle className="h-8 w-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-gray-900">Create New Alert</h3>
            <p className="text-sm text-gray-600">
              Manually create emergency alert
            </p>
          </button>
          <button
            onClick={() => navigate("/firs")}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-all hover:shadow-sm cursor-pointer group"
          >
            <FileText className="h-8 w-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-gray-900">Generate E-FIR</h3>
            <p className="text-sm text-gray-600">Create incident report</p>
          </button>
          <button
            onClick={() => navigate("/heatmap")}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-all hover:shadow-sm cursor-pointer group"
          >
            <MapPin className="h-8 w-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-gray-900">View Live Map</h3>
            <p className="text-sm text-gray-600">Monitor tourist locations</p>
          </button>
        </div>
      </div>

      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={isCreateAlertOpen}
        onClose={() => setIsCreateAlertOpen(false)}
        onSuccess={() => {
          setIsCreateAlertOpen(false);
          toast.success("Emergency alert broadcasted successfully!");
          loadStats();
        }}
      />
    </div>
  );
};

export default Dashboard;
