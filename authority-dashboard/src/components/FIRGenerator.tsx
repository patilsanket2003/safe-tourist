import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import {
  FileText,
  User,
  MapPin,
  Phone,
  Calendar,
  Save,
  Download,
  Send,
  AlertTriangle,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  createEFIR,
  getEFIRSummaries,
  type EFIRPayload,
  type EFIRSummary,
} from "../api/efir";
import {
  fetchTouristManagementData,
  type TouristRegistryItem,
} from "../api/touristRegistry";

interface FIRData {
  touristId: string;
  touristName: string;
  govIdHash: string;
  country: string;
  phoneNumber: string;
  emergencyContact: string;
  lastKnownLocation: string;
  lastSeenDate: string;
  lastSeenTime: string;
  incidentType: string;
  incidentDescription: string;
  reportingOfficer: string;
  reportingUnit: string;
  reportDate: string;
  reportTime: string;
  witnesses: string;
  additionalInfo: string;
}

const FIRGenerator: React.FC = () => {
  const defaultFormState: FIRData = {
    touristId: "",
    touristName: "",
    govIdHash: "",
    country: "",
    phoneNumber: "",
    emergencyContact: "",
    lastKnownLocation: "",
    lastSeenDate: "",
    lastSeenTime: "",
    incidentType: "missing",
    incidentDescription: "",
    reportingOfficer: "",
    reportingUnit: "",
    reportDate: new Date().toISOString().split("T")[0],
    reportTime: new Date().toTimeString().slice(0, 5),
    witnesses: "",
    additionalInfo: "",
  };

  const [selectedTourist, setSelectedTourist] = useState<string>("");
  const [firData, setFirData] = useState<FIRData>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [latestSubmitted, setLatestSubmitted] = useState<FIRData | null>(null);
  const [latestFIRNumber, setLatestFIRNumber] = useState<string | null>(null);
  const [tourists, setTourists] = useState<TouristRegistryItem[]>([]);
  const [touristsLoading, setTouristsLoading] = useState(false);
  const [touristsError, setTouristsError] = useState<string | null>(null);
  const [showSummaries, setShowSummaries] = useState(false);
  const [summaries, setSummaries] = useState<EFIRSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);

  const incidentTypes = [
    { value: "Missing Person", label: "Missing Person" },
    { value: "Theft", label: "Theft/Robbery" },
    { value: "Assault", label: "Physical Assault" },
    { value: "Fraud", label: "Fraud/Scam" },
    { value: "Accident", label: "Accident" },
    { value: "Harassment", label: "Harassment" },
    { value: "Other", label: "Other" },
  ];

  useEffect(() => {
    const loadTourists = async () => {
      setTouristsLoading(true);
      setTouristsError(null);
      try {
        const result = await fetchTouristManagementData("active");
        setTourists(Array.isArray(result.registry) ? result.registry : []);
      } catch (error: any) {
        setTouristsError(error?.message || "Failed to load tourists");
      } finally {
        setTouristsLoading(false);
      }
    };

    void loadTourists();
  }, []);

  const handleTouristSelect = (touristId: string) => {
    const tourist = tourists.find((t) => t.touristId === touristId);
    if (tourist) {
      setSelectedTourist(touristId);
      setFirData({
        ...firData,
        touristId: tourist.touristId,
        touristName: tourist.name,
        govIdHash: tourist.regTxHash || "",
        country: tourist.nationality || "",
        phoneNumber: tourist.phone || "",
        emergencyContact: "",
      });
    }
  };

  const handleGetSummaries = async () => {
    setSummariesLoading(true);
    setSummariesError(null);
    try {
      const result = await getEFIRSummaries();
      setSummaries(result);
      setShowSummaries(true);
    } catch (error: any) {
      setSummaries([]);
      setShowSummaries(true);
      setSummariesError(error?.message || "Failed to fetch E-FIR summaries");
    } finally {
      setSummariesLoading(false);
    }
  };

  const summaryStats = useMemo(() => {
    const total = summaries.length;
    const missingCases = summaries.filter((entry) =>
      String(entry.incidentType || "")
        .toLowerCase()
        .includes("missing"),
    ).length;
    const submitted = summaries.filter((entry) =>
      String(entry.status || "")
        .toLowerCase()
        .includes("submitted"),
    ).length;
    return { total, missingCases, submitted };
  }, [summaries]);

  const handleInputChange = (field: keyof FIRData, value: string) => {
    setFirData({ ...firData, [field]: value });
  };

  const generateFIRNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `FIR/${year}/${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    const payload: EFIRPayload = {
      ...firData,
      countryOfOrigin: firData.country,
      witnesses: firData.witnesses || undefined,
      additionalInfo: firData.additionalInfo || undefined,
    };

    try {
      const response = await createEFIR(payload);
      const serverFirNumber = response?.data?.firNumber;
      const firNumber =
        typeof serverFirNumber === "string" && serverFirNumber.trim().length > 0
          ? serverFirNumber
          : generateFIRNumber();

      setLatestFIRNumber(firNumber);
      setLatestSubmitted(firData);
      setSubmitSuccess(`E-FIR ${firNumber} submitted successfully.`);

      setFirData(defaultFormState);
      setSelectedTourist("");
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to submit E-FIR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportAsPDF = () => {
    const dataToExport = latestSubmitted || firData;
    const firNumber = latestFIRNumber || generateFIRNumber();

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Electronic First Information Report (E-FIR)", 14, 18);

    doc.setFontSize(11);
    doc.text(`FIR Number: ${firNumber}`, 14, 28);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 35);

    const lines = [
      `Tourist Name: ${dataToExport.touristName || "N/A"}`,
      `Tourist ID: ${dataToExport.touristId || "N/A"}`,
      `Country: ${dataToExport.country || "N/A"}`,
      `Phone Number: ${dataToExport.phoneNumber || "N/A"}`,
      `Emergency Contact: ${dataToExport.emergencyContact || "N/A"}`,
      `Incident Type: ${dataToExport.incidentType || "N/A"}`,
      `Last Known Location: ${dataToExport.lastKnownLocation || "N/A"}`,
      `Last Seen: ${dataToExport.lastSeenDate || "N/A"} ${dataToExport.lastSeenTime || ""}`,
      `Reporting Officer: ${dataToExport.reportingOfficer || "N/A"}`,
      `Reporting Unit: ${dataToExport.reportingUnit || "N/A"}`,
      `Report Date/Time: ${dataToExport.reportDate || "N/A"} ${dataToExport.reportTime || ""}`,
      `Witnesses: ${dataToExport.witnesses || "N/A"}`,
      `Additional Info: ${dataToExport.additionalInfo || "N/A"}`,
      "Incident Description:",
      dataToExport.incidentDescription || "N/A",
    ];

    let y = 44;
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`efir-${firNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-FIR Generator</h1>
          <p className="text-gray-600 mt-2">
            Generate electronic First Information Reports for tourist incidents
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button
            type="button"
            onClick={handleGetSummaries}
            disabled={summariesLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 ${summariesLoading ? "animate-spin" : ""}`}
            />
            <span>
              {summariesLoading ? "Fetching E-FIR..." : "Get E-FIR Summaries"}
            </span>
          </button>
        </div>
      </div>

      {showSummaries && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-indigo-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
              E-FIR Summaries
            </h2>
            <span className="text-xs text-indigo-700 font-medium">
              {summaries.length} records
            </span>
          </div>

          {summariesError ? (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-t border-red-100">
              {summariesError}
            </div>
          ) : summaries.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">
              No E-FIR summaries found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {summaries.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {entry.incidentType} • {entry.touristName}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tourist ID: {entry.touristId} • {entry.countryOfOrigin}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Filed: {new Date(entry.filedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold uppercase">
                        {entry.status}
                      </span>
                      {(entry.submittedBy?.fullName ||
                        entry.submittedBy?.authorityId) && (
                        <p className="text-xs text-gray-500 mt-2">
                          {entry.submittedBy?.fullName ||
                            entry.submittedBy?.authorityId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">E-FIR Records</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryStats.total}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Missing Person Cases
              </p>
              <p className="text-2xl font-bold text-red-600">
                {summaryStats.missingCases}
              </p>
            </div>
            <Users className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Submitted Cases
              </p>
              <p className="text-2xl font-bold text-green-600">
                {summaryStats.submitted}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* FIR Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span>Electronic First Information Report (E-FIR)</span>
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            All fields marked with * are mandatory
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {submitSuccess}
            </div>
          )}

          {/* Tourist Selection */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-600" />
              <span>Tourist Information</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tourist from Registry *
                </label>
                <select
                  value={selectedTourist}
                  onChange={(e) => handleTouristSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">
                    {touristsLoading
                      ? "Loading tourists..."
                      : "Select a tourist..."}
                  </option>
                  {tourists.map((tourist) => (
                    <option key={tourist.id} value={tourist.touristId}>
                      {tourist.name} ({tourist.touristId}) -{" "}
                      {tourist.nationality}
                    </option>
                  ))}
                </select>
                {touristsError && (
                  <p className="text-xs text-red-600 mt-2">{touristsError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tourist Name *
                </label>
                <input
                  type="text"
                  value={firData.touristName}
                  onChange={(e) =>
                    handleInputChange("touristName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter tourist name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tourist ID *
                </label>
                <input
                  type="text"
                  value={firData.touristId}
                  onChange={(e) =>
                    handleInputChange("touristId", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tourist ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country of Origin *
                </label>
                <input
                  type="text"
                  value={firData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Country"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={firData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact *
                </label>
                <input
                  type="tel"
                  value={firData.emergencyContact}
                  onChange={(e) =>
                    handleInputChange("emergencyContact", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Emergency contact number"
                  required
                />
              </div>
            </div>
          </div>

          {/* Incident Information */}
          <div className="bg-red-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Incident Details</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Type *
                </label>
                <select
                  value={firData.incidentType}
                  onChange={(e) =>
                    handleInputChange("incidentType", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {incidentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Description *
                </label>
                <textarea
                  value={firData.incidentDescription}
                  onChange={(e) =>
                    handleInputChange("incidentDescription", e.target.value)
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detailed description of the incident..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Last Known Information */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-yellow-600" />
              <span>Last Known Information</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Known Location *
                </label>
                <input
                  type="text"
                  value={firData.lastKnownLocation}
                  onChange={(e) =>
                    handleInputChange("lastKnownLocation", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Last known location address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Seen Date *
                </label>
                <input
                  type="date"
                  value={firData.lastSeenDate}
                  onChange={(e) =>
                    handleInputChange("lastSeenDate", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Seen Time *
                </label>
                <input
                  type="time"
                  value={firData.lastSeenTime}
                  onChange={(e) =>
                    handleInputChange("lastSeenTime", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reporting Information */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Reporting Officer Information</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporting Officer Name *
                </label>
                <input
                  type="text"
                  value={firData.reportingOfficer}
                  onChange={(e) =>
                    handleInputChange("reportingOfficer", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Officer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporting Unit/Station *
                </label>
                <input
                  type="text"
                  value={firData.reportingUnit}
                  onChange={(e) =>
                    handleInputChange("reportingUnit", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Unit or station name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Date *
                </label>
                <input
                  type="date"
                  value={firData.reportDate}
                  onChange={(e) =>
                    handleInputChange("reportDate", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Time *
                </label>
                <input
                  type="time"
                  value={firData.reportTime}
                  onChange={(e) =>
                    handleInputChange("reportTime", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Additional Information
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Witnesses (if any)
                </label>
                <textarea
                  value={firData.witnesses}
                  onChange={(e) =>
                    handleInputChange("witnesses", e.target.value)
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Names and contact details of witnesses..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  value={firData.additionalInfo}
                  onChange={(e) =>
                    handleInputChange("additionalInfo", e.target.value)
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any other relevant information..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Send className="h-5 w-5" />
              <span>{isSubmitting ? "Submitting..." : "Submit E-FIR"}</span>
            </button>
            <button
              type="button"
              onClick={exportAsPDF}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Export as PDF</span>
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Save className="h-5 w-5" />
              <span>Save Draft</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FIRGenerator;
