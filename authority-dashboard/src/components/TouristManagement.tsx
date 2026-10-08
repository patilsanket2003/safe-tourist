import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users,
  Search,
  Shield,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Phone,
  Calendar,
  Trash2,
  AlertTriangle,
  User,
  X,
  Filter,
} from "lucide-react";
import {
  fetchTouristManagementData,
  fetchExpiredTourists,
  revokeTourist,
  TouristManagementData,
  TouristRegistryItem,
  ExpiredTouristItem,
} from "../api/touristRegistry";
import {
  verifyTouristRecord,
  type VerifyTouristRecordResponse,
} from "../api/auth";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

type ItineraryNode = {
  type?: string;
  name?: string;
  locationName?: string;
  address?: string;
  scheduledTime?: string;
  description?: string;
};

type ItineraryDay = {
  dayNumber: number;
  date?: string;
  nodes: ItineraryNode[];
};

const normalizeItinerary = (itinerary: any[] | undefined): ItineraryDay[] => {
  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    return [];
  }

  return itinerary.map((item, index) => {
    if (typeof item === "string") {
      return {
        dayNumber: index + 1,
        nodes: [{ type: "visit", name: item }],
      };
    }

    const fallbackNode: ItineraryNode[] =
      item && (item.location || item.activity || item.locations)
        ? [
            {
              type: "visit",
              name:
                item.location ||
                item.activity ||
                (Array.isArray(item.locations)
                  ? item.locations.join(", ")
                  : undefined),
            },
          ]
        : [];

    return {
      dayNumber: Number(item?.dayNumber || item?.day || index + 1),
      date: item?.date,
      nodes: Array.isArray(item?.nodes) ? item.nodes : fallbackNode,
    };
  });
};

const formatItineraryDayDate = (date?: string) => {
  if (!date) return "Date not specified";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getNodeTypeLabel = (type?: string) => {
  if (!type) return "Stop";
  if (type.toLowerCase() === "start") return "Start";
  if (type.toLowerCase() === "end") return "End";
  if (type.toLowerCase() === "visit") return "Visit";
  return type;
};

const TouristManagement: React.FC = () => {
  const [data, setData] = useState<TouristManagementData | null>(null);
  const [expiredData, setExpiredData] = useState<ExpiredTouristItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedTourist, setSelectedTourist] =
    useState<TouristRegistryItem | null>(null);
  const [selectedExpiredTourist, setSelectedExpiredTourist] =
    useState<ExpiredTouristItem | null>(null);

  // Revoke state
  const [touristToRevoke, setTouristToRevoke] =
    useState<TouristRegistryItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isVerifyingTourist, setIsVerifyingTourist] = useState(false);
  const [verifyTouristError, setVerifyTouristError] = useState<string | null>(
    null,
  );
  const [verifyTouristResult, setVerifyTouristResult] =
    useState<VerifyTouristRecordResponse | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  const loadData = async () => {
    setLoading(true);
    try {
      // Always fetch stats and active data
      const result = await fetchTouristManagementData(
        undefined,
        debouncedSearch,
      );
      setData(result);

      // If expired tab is active, fetch expired data
      if (activeTab === "expired") {
        const expired = await fetchExpiredTourists(debouncedSearch);
        setExpiredData(expired);
      }
    } catch (error) {
      console.error("Failed to load tourist management data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch, activeTab]);

  useEffect(() => {
    setVerifyTouristError(null);
    setVerifyTouristResult(null);
    setIsVerifyingTourist(false);
  }, [selectedTourist?.touristId]);

  const handleVerifyTouristRecord = async () => {
    if (!selectedTourist?.touristId || isVerifyingTourist) return;

    setIsVerifyingTourist(true);
    setVerifyTouristError(null);
    try {
      const result = await verifyTouristRecord(selectedTourist.touristId);
      setVerifyTouristResult(result);
    } catch (error: any) {
      setVerifyTouristResult(null);
      setVerifyTouristError(
        error?.message || "Failed to verify tourist record",
      );
    } finally {
      setIsVerifyingTourist(false);
    }
  };

  const handleRevoke = async () => {
    if (!touristToRevoke) return;
    if (deleteConfirmation !== touristToRevoke.touristId) {
      setRevokeError(`Please type "${touristToRevoke.touristId}" to confirm.`);
      return;
    }

    setIsRevoking(true);
    setRevokeError(null);
    try {
      await revokeTourist(touristToRevoke.id, revokeReason);
      // Close modal and refresh data
      setTouristToRevoke(null);
      setRevokeReason("");
      setDeleteConfirmation("");
      loadData();
    } catch (err: any) {
      setRevokeError(err.message);
    } finally {
      setIsRevoking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const short = (s?: string) => {
    if (!s) return "N/A";
    if (s.length > 20) return s.slice(0, 17) + "...";
    return s;
  };

  const itineraryDays = normalizeItinerary(selectedTourist?.itinerary);

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Tourist Authority Dashboard Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Statistics
    doc.setFontSize(14);
    doc.text("Analytics Overview", 14, 40);

    const statsData = [
      ["Total Tourists", data.totalTourists],
      ["Active IDs", data.activeIDs],
      ["Expired IDs", data.expiredIDs],
      ["Avg Safety Score", `${data.averageSafetyScore}/100`],
    ];

    autoTable(doc, {
      startY: 45,
      head: [["Metric", "Value"]],
      body: statsData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

    // Active Tourists Table
    if (data.registry.length > 0) {
      let finalY = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.text("Active Tourist Registry", 14, finalY);

      const activeTableData = data.registry.map((t) => [
        t.name,
        t.touristId,
        t.nationality,
        t.phone,
        new Date(t.tripStart).toLocaleDateString(),
        t.tripEnd ? new Date(t.tripEnd).toLocaleDateString() : "Indefinite",
        t.safetyScore,
        t.status,
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [
          [
            "Name",
            "ID",
            "Nationality",
            "Phone",
            "Trip Start",
            "Trip End",
            "Safety",
            "Status",
          ],
        ],
        body: activeTableData,
        theme: "striped",
        headStyles: { fillColor: [46, 204, 113] },
        styles: { fontSize: 8 },
      });
    }

    // Expired Tourists Table
    if (expiredData && expiredData.length > 0) {
      // Check if we need a new page
      let finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(14);
      doc.text("Expired Tourist Records", 14, finalY);

      const expiredTableData = expiredData.map((t) => [
        t.touristId,
        new Date(t.expiresAt).toLocaleDateString(),
        t.safetyScore ?? "N/A",
        t.sosAlerts ? t.sosAlerts.length : 0,
        t.blockchainDetails?.regTxHash ? "Yes" : "No",
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [
          [
            "ID",
            "Expiry Date",
            "Safety Score",
            "Alerts",
            "Blockchain Verified",
          ],
        ],
        body: expiredTableData,
        theme: "striped",
        headStyles: { fillColor: [231, 76, 60] },
        styles: { fontSize: 8 },
      });
    }

    doc.save("authority_dashboard_report.pdf");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tourist Digital ID Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage and verify tourist digital identities and travel documents
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button
            onClick={handleExportPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Tourists
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalTourists}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active IDs</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.activeIDs}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expired IDs</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.expiredIDs}
                </p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Safety Score
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.averageSafetyScore}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 pl-1">
                  Server-side search by Tourist ID{" "}
                  {activeTab === "active" && "or Name"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter className="h-4 w-4" />
            </div>
            <TabsList>
              <TabsTrigger value="active" className="relative">
                Active Tourists
                {data && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-green-100 text-green-700 hover:bg-green-100"
                  >
                    {data.activeIDs}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired
                {data && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-red-100 text-red-700 hover:bg-red-100"
                  >
                    {data.expiredIDs}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </Tabs>

      {/* Tourists Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === "active"
              ? "Active Tourist Registry"
              : "Expired Tourist Records"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading registry...
            </div>
          ) : activeTab === "active" ? (
            !data || data.registry.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No active tourists found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tourist Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Digital ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trip Validity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Safety Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.registry.map((tourist: TouristRegistryItem) => {
                    return (
                      <tr key={tourist.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {tourist.name}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center space-x-2">
                                <Globe className="h-3 w-3" />
                                <span>{tourist.nationality}</span>
                                <Phone className="h-3 w-3 ml-2" />
                                <span>{tourist.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {short(tourist.touristId)}
                          </div>
                          {tourist.regTxHash ? (
                            <div
                              className="text-xs text-gray-500 font-mono"
                              title={tourist.regTxHash}
                            >
                              TX: {short(tourist.regTxHash)}
                            </div>
                          ) : (
                            <div className="text-xs text-red-500 font-medium flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Not Verified
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span>
                              {new Date(tourist.tripStart).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            {tourist.tripEnd
                              ? `to ${new Date(tourist.tripEnd).toLocaleDateString()}`
                              : "Indefinite"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSafetyScoreColor(tourist.safetyScore)}`}
                          >
                            {tourist.safetyScore}/100
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedTourist(tourist)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setTouristToRevoke(tourist);
                                setDeleteConfirmation("");
                                setRevokeReason("");
                                setRevokeError(null);
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors border border-red-200"
                              title="Revoke and Delete ID"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : // EXPIRED TABLE
          expiredData.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No expired tourists found
              </h3>
              <p className="text-gray-600">Expired records will appear here.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tourist ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blockchain Record
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alerts History
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expiredData.map((tourist) => (
                  <tr
                    key={tourist.touristId}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedExpiredTourist(tourist)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {short(tourist.touristId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-red-600 flex items-center font-medium">
                        <Clock className="h-4 w-4 mr-2" />
                        {new Date(tourist.expiresAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(tourist.expiresAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tourist.blockchainDetails?.regTxHash ? (
                        <div
                          className="text-xs text-gray-500 font-mono"
                          title={tourist.blockchainDetails.regTxHash}
                        >
                          TX: {short(tourist.blockchainDetails.regTxHash)}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not Recorded
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tourist.sosAlerts && tourist.sosAlerts.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-red-200 text-red-700 bg-red-50"
                        >
                          {tourist.sosAlerts.length} Alerts
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No Incidents
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {touristToRevoke && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              Revoke Tourist ID
            </h3>
            <p className="text-center text-gray-500 text-sm mb-6">
              This action will permanently delete the tourist record for{" "}
              <strong>{touristToRevoke.name}</strong> (
              {touristToRevoke.touristId}). This cannot be undone.
            </p>

            {revokeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-center text-red-600">
                {revokeError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for revocation <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                >
                  <option value="">Select a reason...</option>
                  <option value="Convicted of local laws violation / Misbehavior">
                    Convicted / Misbehavior
                  </option>
                  <option value="Status Expired / Trip Completed">
                    Status Expired / Trip Completed
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Backend validates keywords: 'misbehave', 'convicted',
                  'expired', 'complete'
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To confirm, type "{touristToRevoke.touristId}"
                </label>
                <input
                  type="text"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={touristToRevoke.touristId}
                  onPaste={(e) => e.preventDefault()} // Force typing for safety
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setTouristToRevoke(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={isRevoking}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={
                    isRevoking ||
                    !revokeReason ||
                    deleteConfirmation !== touristToRevoke.touristId
                  }
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex justify-center items-center"
                >
                  {isRevoking ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Revoke ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tourist Detail Modal */}
      {selectedTourist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Tourist Details
                </h2>
                <button
                  onClick={() => setSelectedTourist(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Personal Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedTourist.name}
                    </p>
                    <p>
                      <strong>Tourist ID:</strong> {selectedTourist.touristId}
                    </p>
                    <p>
                      <strong>Nationality:</strong>{" "}
                      {selectedTourist.nationality}
                    </p>
                    <p>
                      <strong>Phone:</strong> {selectedTourist.phone}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Travel Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Valid From:</strong>{" "}
                      {new Date(selectedTourist.tripStart).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Valid To:</strong>{" "}
                      {selectedTourist.tripEnd
                        ? new Date(selectedTourist.tripEnd).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Status:</strong>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedTourist.status)}`}
                      >
                        {selectedTourist.status.toUpperCase()}
                      </span>
                    </p>
                    <p>
                      <strong>Safety Score:</strong>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs ${getSafetyScoreColor(selectedTourist.safetyScore)}`}
                      >
                        {selectedTourist.safetyScore}/100
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Itinerary Section */}
              {itineraryDays.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Travel Itinerary
                  </h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-72 overflow-y-auto space-y-3">
                    {itineraryDays.map((day, dayIndex) => (
                      <div
                        key={`${day.dayNumber}-${dayIndex}`}
                        className="bg-white border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">
                            Day {day.dayNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatItineraryDayDate(day.date)}
                          </p>
                        </div>

                        {day.nodes.length > 0 ? (
                          <ul className="mt-3 space-y-2">
                            {day.nodes.map((node, nodeIndex) => (
                              <li
                                key={`${day.dayNumber}-${node.name || nodeIndex}`}
                                className="border-l-2 border-blue-200 pl-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-[11px] uppercase tracking-wide text-blue-700 font-medium">
                                    {getNodeTypeLabel(node.type)}
                                  </span>
                                  {node.scheduledTime && (
                                    <span className="text-xs font-medium text-gray-600">
                                      {node.scheduledTime}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-800 font-medium">
                                  {node.name ||
                                    node.locationName ||
                                    `Stop ${nodeIndex + 1}`}
                                </p>
                                {node.address && (
                                  <p className="text-xs text-gray-500">
                                    {node.address}
                                  </p>
                                )}
                                {node.description && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {node.description}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-500 mt-2">
                            No stops listed for this day.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Blockchain Verification
                </h3>
                <div className="mb-3">
                  <button
                    onClick={handleVerifyTouristRecord}
                    disabled={isVerifyingTourist || !selectedTourist.touristId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium inline-flex items-center"
                  >
                    {isVerifyingTourist ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    {isVerifyingTourist
                      ? "Verifying record..."
                      : "Verify On Blockchain"}
                  </button>
                </div>

                {verifyTouristError ? (
                  <div className="bg-red-50 p-4 rounded-lg flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-800 mb-1">
                        Verification Failed
                      </p>
                      <p className="text-sm text-red-700">
                        {verifyTouristError}
                      </p>
                    </div>
                  </div>
                ) : verifyTouristResult ? (
                  <div
                    className={`p-4 rounded-lg ${
                      verifyTouristResult.verified
                        ? "bg-green-50"
                        : "bg-amber-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold mb-2 ${
                        verifyTouristResult.verified
                          ? "text-green-700"
                          : "text-amber-800"
                      }`}
                    >
                      {verifyTouristResult.verified
                        ? "Record verified on blockchain"
                        : "Record could not be verified"}
                    </p>
                    <div className="space-y-1 text-xs">
                      <p>
                        <strong>Tourist ID:</strong>{" "}
                        {verifyTouristResult.touristId}
                      </p>
                      <p>
                        <strong>Hashes Match In DB:</strong>{" "}
                        {verifyTouristResult.hashesMatchInDb ? "Yes" : "No"}
                      </p>
                      {verifyTouristResult.recomputeVariantUsed && (
                        <p>
                          <strong>Recompute Variant:</strong>{" "}
                          {verifyTouristResult.recomputeVariantUsed}
                        </p>
                      )}
                      {verifyTouristResult.blockchain?.regTxHash && (
                        <p className="font-mono break-all text-[11px]">
                          <strong className="font-sans text-xs text-gray-700">
                            Registration TX Hash:
                          </strong>{" "}
                          {verifyTouristResult.blockchain.regTxHash}
                        </p>
                      )}
                      {verifyTouristResult.blockchain?.eventId && (
                        <p className="font-mono break-all text-[11px]">
                          <strong className="font-sans text-xs text-gray-700">
                            Event ID:
                          </strong>{" "}
                          {verifyTouristResult.blockchain.eventId}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Expired Tourist Detail Modal */}
      {selectedExpiredTourist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Expired Record Details
                    </h2>
                    <p className="text-sm text-gray-500">
                      ID: {selectedExpiredTourist.touristId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExpiredTourist(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Status Banner */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <Clock className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">
                    Visa/Trip Expired
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    This tourist's authorized stay expired on{" "}
                    {new Date(
                      selectedExpiredTourist.expiresAt,
                    ).toLocaleString()}
                    .
                  </p>
                </div>
              </div>

              {/* Safety Score Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Safety Score
                </h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">
                          {selectedExpiredTourist.safetyScore ?? "N/A"}
                        </span>
                        <span className="text-lg text-gray-400 font-medium ml-1">
                          /100
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Final safety score recorded at expiration
                      </p>
                    </div>
                    <div
                      className={`h-14 w-14 rounded-full flex items-center justify-center ${getSafetyScoreColor(
                        selectedExpiredTourist.safetyScore || 0,
                      )}`}
                    >
                      <Shield className="h-7 w-7" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SOS Alerts History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    SOS Alert History
                  </h3>
                  {selectedExpiredTourist.sosAlerts &&
                  selectedExpiredTourist.sosAlerts.length > 0 ? (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                      {selectedExpiredTourist.sosAlerts.length} Recorded
                      Incidents
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-200 bg-green-50"
                    >
                      Clean Record
                    </Badge>
                  )}
                </div>

                {selectedExpiredTourist.sosAlerts &&
                selectedExpiredTourist.sosAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {selectedExpiredTourist.sosAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row gap-4 hover:border-red-300 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {alert.reason || "SOS"} Alert
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Badge
                              variant={
                                alert.status === "resolved"
                                  ? "outline"
                                  : "destructive"
                              }
                            >
                              {alert.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            <p>
                              <strong>Location:</strong>{" "}
                              {alert.location || "Unknown"}
                            </p>
                            {alert.details && (
                              <p className="mt-1">{alert.details}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Shield className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      No SOS alerts recorded during the visit.
                    </p>
                  </div>
                )}
              </div>

              {/* Blockchain Info */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Blockchain Ledger Record
                </h3>
                {selectedExpiredTourist.blockchainDetails?.regTxHash ? (
                  <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs text-slate-600 break-all border border-slate-200">
                    <div className="mb-2">
                      <span className="font-bold text-slate-800">
                        Registration Hash:
                      </span>{" "}
                      {selectedExpiredTourist.blockchainDetails.regTxHash}
                    </div>
                    {selectedExpiredTourist.blockchainDetails
                      .completedTxHash && (
                      <div>
                        <span className="font-bold text-slate-800">
                          Completion Hash:
                        </span>{" "}
                        {
                          selectedExpiredTourist.blockchainDetails
                            .completedTxHash
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No blockchain verification data available.
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedExpiredTourist(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TouristManagement;
