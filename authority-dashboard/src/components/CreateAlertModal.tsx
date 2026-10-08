import React, { useState } from "react";
import { X, AlertTriangle, MapPin, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { getAuthoritySocket, createAuthoritySocket } from "../utils/socketClient";

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    type: "warning" as
      | "emergency"
      | "warning"
      | "info"
      | "weather"
      | "civil_unrest",
    title: "",
    message: "",
    priority: "medium" as "critical" | "high" | "medium" | "low",
    targetType: "all" as "all" | "location",
    latitude: "",
    longitude: "",
    radius: "5000",
    actionRequired: "",
    requiresAcknowledgment: false,
    expiresIn: "24",
  });

  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBroadcasting(true);

    try {
      let socket = getAuthoritySocket();
      if (!socket || !socket.connected) {
        const token = localStorage.getItem("token");
        let uid = "authority-admin";
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            uid = payload.id || payload.userId || uid;
          } catch (err) {}
        }
        socket = createAuthoritySocket(uid);
      }

      if (!socket) {
        throw new Error("Unable to establish authority socket connection.");
      }

      // Prepare target area (null for broadcast to all)
      let targetArea = null;
      if (formData.targetType === "location") {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        const radius = parseInt(formData.radius);

        if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
          throw new Error("Invalid location coordinates or radius");
        }

        targetArea = { lat, lng, radius };
      }

      // Calculate expiration time
      const expiresAt = formData.expiresIn
        ? new Date(
            Date.now() + parseInt(formData.expiresIn) * 60 * 60 * 1000,
          ).toISOString()
        : null;

      // Get authority info from localStorage
      const token = localStorage.getItem("token");
      let authorityName = "Safety Authority";
      let authorityId = "unknown";

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          authorityName =
            payload.name || payload.username || "Safety Authority";
          authorityId = payload.id || payload.authorityId || "unknown";
        } catch (err) {
          console.warn("Could not parse token:", err);
        }
      }

      // Construct alert payload
      const alertPayload = {
        type: formData.type,
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        targetArea,
        expiresAt,
        requiresAcknowledgment: formData.requiresAcknowledgment,
        actionRequired: formData.actionRequired || null,
        authorityName,
        authorityId,
      };

      console.log("📢 Broadcasting alert to tourists:", alertPayload);

      // Emit to backend via socket
      socket.emit("authorityBroadcast", alertPayload);

      // If acknowledgment is not required, close immediately to avoid buffering
      if (!formData.requiresAcknowledgment) {
        onSuccess();
        resetForm();
        onClose();
        setBroadcasting(false);
        return;
      }

      // Listen for success or error response
      const successHandler = () => {
        console.log("✅ Alert broadcasted successfully");
        socket.off("broadcastSuccess", successHandler);
        socket.off("broadcastError", errorHandler);
        onSuccess();
        resetForm();
        onClose();
        setBroadcasting(false);
      };

      const errorHandler = (errorData: any) => {
        console.error("❌ Broadcast failed:", errorData);
        socket.off("broadcastSuccess", successHandler);
        socket.off("broadcastError", errorHandler);
        setError(errorData.message || "Failed to broadcast alert");
        setBroadcasting(false);
      };

      socket.once("broadcastSuccess", successHandler);
      socket.once("broadcastError", errorHandler);

      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off("broadcastSuccess", successHandler);
        socket.off("broadcastError", errorHandler);
        if (broadcasting) {
          setBroadcasting(false);
          // Assume success if no error received
          onSuccess();
          resetForm();
          onClose();
        }
      }, 10000);
    } catch (err: any) {
      console.error("Failed to broadcast alert:", err);
      setError(err.message || "Failed to broadcast alert");
      setBroadcasting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "warning",
      title: "",
      message: "",
      priority: "medium",
      targetType: "all",
      latitude: "",
      longitude: "",
      radius: "5000",
      actionRequired: "",
      requiresAcknowledgment: false,
      expiresIn: "24",
    });
    setError(null);
  };

  const handleClose = () => {
    if (!broadcasting) {
      resetForm();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Create Alert Broadcast</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={broadcasting}
            className="p-1 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Alert Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alert Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as any,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="emergency">Emergency</option>
              <option value="warning">Warning</option>
              <option value="info">Information</option>
              <option value="weather">Weather Alert</option>
              <option value="civil_unrest">Civil Unrest</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Priority Level *
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as any,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alert Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Cyclone Warning - Evacuate Coastal Areas"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alert Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Detailed information about the alert..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent h-24"
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.message.length}/500 characters
            </p>
          </div>

          {/* Action Required */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Action Required
            </label>
            <input
              type="text"
              value={formData.actionRequired}
              onChange={(e) =>
                setFormData({ ...formData, actionRequired: e.target.value })
              }
              placeholder="e.g., Evacuate immediately, Stay indoors"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              maxLength={100}
            />
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Audience
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="all"
                  checked={formData.targetType === "all"}
                  onChange={(e) =>
                    setFormData({ ...formData, targetType: "all" })
                  }
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm">Broadcast to All Tourists</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="location"
                  checked={formData.targetType === "location"}
                  onChange={(e) =>
                    setFormData({ ...formData, targetType: "location" })
                  }
                  className="w-4 h-4 text-orange-500"
                />
                <span className="text-sm">Specific Location</span>
              </label>
            </div>
          </div>

          {/* Location Targeting (conditional) */}
          {formData.targetType === "location" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-blue-700 font-semibold">
                <MapPin className="h-5 w-5" />
                <span>Location Targeting</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    placeholder="e.g., 28.6139"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required={formData.targetType === "location"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    placeholder="e.g., 77.2090"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required={formData.targetType === "location"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radius (meters) *
                </label>
                <input
                  type="number"
                  value={formData.radius}
                  onChange={(e) =>
                    setFormData({ ...formData, radius: e.target.value })
                  }
                  placeholder="e.g., 5000"
                  min="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={formData.targetType === "location"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.radius
                    ? `${(parseInt(formData.radius) / 1000).toFixed(1)} km radius`
                    : ""}
                </p>
              </div>
            </div>
          )}

          {/* Expiration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Clock className="h-4 w-4" />
              Expires In (hours)
            </label>
            <input
              type="number"
              value={formData.expiresIn}
              onChange={(e) =>
                setFormData({ ...formData, expiresIn: e.target.value })
              }
              placeholder="24"
              min="1"
              max="168"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Acknowledgment Checkbox */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresAcknowledgment}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requiresAcknowledgment: e.target.checked,
                  })
                }
                className="w-4 h-4 text-orange-500 rounded"
              />
              <span className="text-sm text-gray-700">
                Require acknowledgment from tourists
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={broadcasting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={broadcasting}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {broadcasting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Broadcasting...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Broadcast Alert
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
