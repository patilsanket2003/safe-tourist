import React from "react";
import { SOSAlert } from "../types";
import {
  User,
  MapPin,
  Clock,
  HeartPulse,
  ShieldAlert,
  CarFront,
  Flame,
  AlertCircle,
} from "lucide-react";
import {
  formatTimeAgo,
  formatSOSReason,
  getSeverityFromScore,
  formatPhoneNumber,
} from "../utils/formatters";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface AuthorityAlertCardProps {
  alert: SOSAlert;
  onAssignUnit: (alert: SOSAlert) => void;
  onViewDetails: (alert: SOSAlert) => void;
  isHighlighted?: boolean;
}

export const AuthorityAlertCard: React.FC<AuthorityAlertCardProps> = ({
  alert,
  onAssignUnit,
  onViewDetails,
  isHighlighted = false,
}) => {
  const severity =
    alert.severity || getSeverityFromScore(alert.safetyScore || 50);
  const reason = formatSOSReason(alert.sosReason);
  const rawReason =
    typeof alert.sosReason === "string"
      ? alert.sosReason
      : alert.sosReason?.reason || "";
  const displayReason = rawReason.trim().replace(/\s*:\s*/g, " : ") || reason;
  const locationName =
    alert.locationName ||
    alert.location?.locationName ||
    alert.location?.address ||
    "Unknown Location";
  const [nowMs, setNowMs] = React.useState(Date.now());

  React.useEffect(() => {
    if (!alert.etaArrivalAt) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [alert.etaArrivalAt]);

  const etaText = React.useMemo(() => {
    if (alert.etaArrivalAt) {
      const etaTime = new Date(alert.etaArrivalAt).getTime();
      if (Number.isFinite(etaTime)) {
        const diffMs = etaTime - nowMs;
        if (diffMs <= 0) return "Arriving";
        const mins = Math.ceil(diffMs / 60000);
        if (mins >= 60) {
          const hrs = Math.floor(mins / 60);
          const rem = mins % 60;
          return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
        }
        return `${mins} min`;
      }
    }

    if (
      typeof alert.etaMinutes === "number" &&
      Number.isFinite(alert.etaMinutes)
    ) {
      return `${Math.max(0, Math.round(alert.etaMinutes))} min`;
    }

    return null;
  }, [alert.etaArrivalAt, alert.etaMinutes, nowMs]);

  const assignedBy = React.useMemo(() => {
    if (alert.assignedBy) return alert.assignedBy;
    if (Array.isArray(alert.assignedTo) && alert.assignedTo[0]) {
      const first = alert.assignedTo[0];
      if (typeof first === "object") return first.fullName || first.authorityId;
      return first;
    }
    return null;
  }, [alert.assignedBy, alert.assignedTo]);

  const sosClass = React.useMemo(() => {
    const reasonLower = rawReason.toLowerCase();
    const typeLower = (alert.emergencyType || "").toLowerCase();
    const reasonPrefix = rawReason.split(":")[0]?.trim().toLowerCase();

    if (reasonPrefix.includes("fire")) {
      return { label: "Fire", icon: Flame, iconColor: "text-orange-600" };
    }

    if (reasonPrefix.includes("security") || reasonPrefix.includes("crime")) {
      return {
        label: "Security",
        icon: ShieldAlert,
        iconColor: "text-amber-600",
      };
    }

    if (reasonPrefix.includes("medical") || reasonPrefix.includes("health")) {
      return { label: "Medical", icon: HeartPulse, iconColor: "text-blue-600" };
    }

    if (reasonPrefix.includes("accident")) {
      return { label: "Accident", icon: CarFront, iconColor: "text-red-600" };
    }

    if (reasonPrefix.includes("lost")) {
      return { label: "Lost", icon: MapPin, iconColor: "text-indigo-600" };
    }

    if (
      typeLower === "medical" ||
      reasonLower.includes("medical") ||
      reasonLower.includes("health")
    ) {
      return { label: "Medical", icon: HeartPulse, iconColor: "text-blue-600" };
    }

    if (
      typeLower === "crime" ||
      reasonLower.includes("security") ||
      reasonLower.includes("attack") ||
      reasonLower.includes("assault") ||
      reasonLower.includes("robbery")
    ) {
      return {
        label: "Security",
        icon: ShieldAlert,
        iconColor: "text-amber-600",
      };
    }

    if (
      typeLower === "accident" ||
      reasonLower.includes("accident") ||
      reasonLower.includes("crash") ||
      reasonLower.includes("collision")
    ) {
      return { label: "Accident", icon: CarFront, iconColor: "text-red-600" };
    }

    if (reasonLower.includes("fire") || reasonLower.includes("burn")) {
      return { label: "Fire", icon: Flame, iconColor: "text-orange-600" };
    }

    if (typeLower === "natural_disaster") {
      return {
        label: "Natural Disaster",
        icon: AlertCircle,
        iconColor: "text-purple-600",
      };
    }

    if (typeLower === "lost" || reasonLower.includes("lost")) {
      return { label: "Lost", icon: MapPin, iconColor: "text-indigo-600" };
    }

    return { label: "Emergency", icon: AlertCircle, iconColor: "text-red-600" };
  }, [alert.emergencyType, rawReason]);

  const isImmediatePanic = React.useMemo(() => {
    const reasonLower = rawReason.toLowerCase();
    if (reasonLower.includes("immediate panic")) return true;

    if (typeof alert.sosReason === "object" && alert.sosReason) {
      const reasonObj = alert.sosReason as any;
      return Boolean(
        reasonObj.immediatePanic ||
        reasonObj.isImmediatePanic ||
        reasonObj.panic === true ||
        String(reasonObj.priority || "").toLowerCase() === "immediate",
      );
    }

    return false;
  }, [alert.sosReason, rawReason]);

  const SOSClassIcon = sosClass.icon;

  // Severity badge colors - matching new palette
  const badgeColors = {
    critical: "bg-red-900 text-white",
    high: "bg-red-600 text-white",
    medium: "bg-orange-500 text-white",
    low: "bg-yellow-500 text-black",
  };

  // Highlight styles - dynamic based on severity
  // Use animate-pulse for strong flicker
  const highlightStyles = isHighlighted
    ? `ring-2 ring-offset-2 animate-pulse ${
        severity === "critical"
          ? "ring-red-600 bg-red-50"
          : severity === "high"
            ? "ring-red-500 bg-red-50"
            : severity === "medium"
              ? "ring-orange-500 bg-orange-50"
              : "ring-yellow-500 bg-yellow-50"
      }`
    : "hover:shadow-md";

  return (
    <Card
      onClick={() => onViewDetails(alert)}
      className={`${highlightStyles} transition-all duration-300 cursor-pointer`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onViewDetails(alert);
        }
      }}
    >
      <CardContent className="p-4">
        {/* Header with Title and Severity Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <SOSClassIcon
                className={`w-5 h-5 ${isHighlighted ? "animate-bounce" : ""} ${sosClass.iconColor}`}
              />
              <h3 className="text-lg font-bold text-gray-900">
                {displayReason}
              </h3>
              {isImmediatePanic && (
                <span
                  className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  title="Immediate panic"
                >
                  ⚡ Immediate Panic
                </span>
              )}
            </div>
            <div className="mb-2">
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide"
              >
                SOS Class: {sosClass.label.toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Alert ID: #{alert.alertId || alert.id}</div>
              <div>Source: Mobile App Panic Button</div>
            </div>
          </div>
          <Badge className={`${badgeColors[severity]} uppercase`}>
            {severity}
          </Badge>
        </div>

        {/* Victim Information */}
        <div
          className={`grid grid-cols-2 gap-4 mb-3 pb-3 border-b ${
            isHighlighted
              ? severity === "critical"
                ? "border-red-200"
                : severity === "high"
                  ? "border-red-200"
                  : severity === "medium"
                    ? "border-orange-200"
                    : "border-yellow-200"
              : "border-gray-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900">
                {alert.touristName}
              </div>
              <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-3">
                <span>{alert.age ? `${alert.age} Yrs` : "Age N/A"}</span>
                <span className="text-gray-300">•</span>
                <span>{alert.gender || "Gender N/A"}</span>
                <span className="text-gray-300">•</span>
                <span>{alert.nationality || "Nationality N/A"}</span>
                {alert.phone && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-gray-700">
                      {formatPhoneNumber(alert.phone)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-900">{locationName}</div>
              <div className="text-xs text-gray-600">
                {alert.location?.address || "Location details unavailable"}
              </div>
            </div>
          </div>
        </div>

        {/* Time and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {formatTimeAgo(alert.timestamp)}
            </span>
            {isHighlighted && (
              <span
                className={`ml-2 font-bold text-xs uppercase tracking-wider ${
                  severity === "critical"
                    ? "text-red-900"
                    : severity === "high"
                      ? "text-red-600"
                      : severity === "medium"
                        ? "text-orange-600"
                        : "text-yellow-600"
                }`}
              >
                (Just Now)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(alert.status === "assigned" || alert.status === "responding") && (
              <div className="text-right mr-2">
                {assignedBy && (
                  <div className="text-xs font-bold text-gray-900">
                    Assigned by: {assignedBy}
                  </div>
                )}
                {etaText && (
                  <div className="mt-1 inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                    ETA: {etaText}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {alert.responseDate
                    ? new Date(alert.responseDate).toLocaleTimeString()
                    : "Just now"}
                </div>
              </div>
            )}

            {alert.status === "new" && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignUnit(alert);
                }}
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Assign Unit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
