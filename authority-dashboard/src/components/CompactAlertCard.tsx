import React, { useState } from 'react';
import { SOSAlert } from '../types';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  Activity,
  Droplet,
} from 'lucide-react';
import {
  formatTimeAgo,
  formatPhoneNumber,
  getSeverityFromScore,
  getSeverityColors,
  getSeverityBarColor,
  formatSOSReason,
} from '../utils/formatters';

interface CompactAlertCardProps {
  alert: SOSAlert;
  onRespond: (alert: SOSAlert) => void;
  onViewDetails?: (alert: SOSAlert) => void;
}

export const CompactAlertCard: React.FC<CompactAlertCardProps> = ({
  alert,
  onRespond,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const severity = alert.severity || getSeverityFromScore(alert.safetyScore || 50);
  const severityColors = getSeverityColors(severity);
  const barColor = getSeverityBarColor(severity);
  const reason = formatSOSReason(alert.sosReason);
  const locationName = alert.locationName || alert.location?.locationName || alert.location?.address || 'Unknown Location';
  const emergencyPhone = alert.phone || alert.emergencyContact?.phone || alert.contactInfo;
  const isCritical = severity === 'critical' || severity === 'high';

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all border-2 overflow-hidden ${
      isCritical ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'
    }`}>
      {/* Thick Severity Bar */}
      <div className={`h-2 ${barColor}`} />

      <div className="p-4">
        {/* Header Row with Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {/* Severity Badge & Time */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${
                  isCritical 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : `${severityColors.bg} ${severityColors.text}`
                }`}
              >
                🚨 {severity}
              </span>
              <span className="text-xs text-gray-600 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeAgo(alert.timestamp)}
              </span>
              {alert.status === 'new' && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                  NEW
                </span>
              )}
            </div>

            {/* Tourist Name, Age & Critical Info */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-700" />
                {alert.touristName}
              </h3>
              {alert.age && (
                <span className="text-sm bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-semibold">
                  {alert.age} yrs
                </span>
              )}
              {alert.bloodGroup && (
                <span className="text-sm bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Droplet className="w-3 h-3" />
                  {alert.bloodGroup}
                </span>
              )}
            </div>

            {/* Gender & Nationality */}
            {(alert.gender || alert.nationality) && (
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                {alert.gender && <span className="font-medium">{alert.gender}</span>}
                {alert.gender && alert.nationality && <span>•</span>}
                {alert.nationality && <span className="font-medium">{alert.nationality}</span>}
              </div>
            )}
          </div>
        </div>

        {/* SOS Reason - Prominent */}
        <div className={`flex items-start gap-2 mb-3 p-2 rounded-md ${
          isCritical ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            isCritical ? 'text-red-600' : 'text-orange-600'
          }`} />
          <div>
            <div className="text-xs text-gray-600 font-semibold uppercase">SOS Reason</div>
            <div className={`font-bold ${isCritical ? 'text-red-900' : 'text-orange-900'}`}>
              {reason}
            </div>
          </div>
        </div>

        {/* Location - Prominent */}
        <div className="flex items-start gap-2 mb-2 p-2 bg-blue-50 rounded-md border border-blue-200">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs text-gray-600 font-semibold">LOCATION</div>
            <div className="text-gray-900 font-semibold">{locationName}</div>
          </div>
        </div>

        {/* Emergency Contact Phone */}
        {emergencyPhone && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 rounded-md border border-green-200">
            <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-600 font-semibold">EMERGENCY CONTACT</div>
              <a
                href={`tel:${emergencyPhone}`}
                className="text-green-700 hover:text-green-900 font-bold text-lg"
              >
                {formatPhoneNumber(emergencyPhone)}
              </a>
            </div>
          </div>
        )}

        {/* Medical Alert if present */}
        {(alert.medicalConditions || alert.allergies) && (
          <div className="flex items-start gap-2 mb-3 p-2 bg-yellow-50 rounded-md border border-yellow-300">
            <Activity className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-yellow-900 uppercase mb-1">⚠️ Medical Alert</div>
              {alert.medicalConditions && (
                <div className="text-red-700 font-semibold">Conditions: {alert.medicalConditions}</div>
              )}
              {alert.allergies && (
                <div className="text-orange-700 font-semibold">Allergies: {alert.allergies}</div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onRespond(alert)}
            className={`flex-1 px-4 py-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-105 ${
              isCritical
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            RESPOND NOW
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-3 border-2 border-gray-300 hover:bg-gray-100 rounded-md text-sm font-semibold text-gray-700 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? 'Hide' : 'More'}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Expandable Details Section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t-2 border-gray-300 space-y-4 text-sm">
            {/* Full Tourist Profile */}
            {(alert.age || alert.nationality || alert.gender || alert.bloodGroup) && (
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="font-bold text-gray-900 mb-2 uppercase text-xs">👤 Tourist Profile</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-700">
                  {alert.age && (
                    <div>
                      <span className="text-gray-600">Age:</span>{' '}
                      <span className="font-semibold">{alert.age} years</span>
                    </div>
                  )}
                  {alert.nationality && (
                    <div>
                      <span className="text-gray-600">Nationality:</span>{' '}
                      <span className="font-semibold">{alert.nationality}</span>
                    </div>
                  )}
                  {alert.gender && (
                    <div>
                      <span className="text-gray-600">Gender:</span>{' '}
                      <span className="font-semibold">{alert.gender}</span>
                    </div>
                  )}
                  {alert.bloodGroup && (
                    <div>
                      <span className="text-gray-600">Blood Group:</span>{' '}
                      <span className="font-bold text-red-600">{alert.bloodGroup}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emergency Contact Full Details */}
            {alert.emergencyContact && (
              <div className="bg-green-50 p-3 rounded-md border border-green-200">
                <h4 className="font-bold text-gray-900 mb-2 uppercase text-xs">📞 Emergency Contact</h4>
                <div className="text-gray-700 space-y-1">
                  <div>
                    <span className="text-gray-600">Name:</span>{' '}
                    <span className="font-semibold">{alert.emergencyContact.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Relation:</span>{' '}
                    <span className="font-semibold">{alert.emergencyContact.relation}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>{' '}
                    <a
                      href={`tel:${alert.emergencyContact.phone}`}
                      className="text-green-700 hover:underline font-bold"
                    >
                      {formatPhoneNumber(alert.emergencyContact.phone)}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* GPS Coordinates */}
            {alert.location && (alert.location.lat || alert.location.coordinates) && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <h4 className="font-bold text-gray-900 mb-2 uppercase text-xs">📍 GPS Coordinates</h4>
                <div className="text-gray-700 font-mono text-xs bg-white p-2 rounded border border-gray-300">
                  {alert.location.coordinates
                    ? `${alert.location.coordinates[1]?.toFixed(6)}, ${alert.location.coordinates[0]?.toFixed(6)}`
                    : `${alert.location.lat?.toFixed(6)}, ${alert.location.lng?.toFixed(6)}`}
                </div>
              </div>
            )}

            {/* Safety Score */}
            {typeof alert.safetyScore === 'number' && (
              <div className="text-xs text-gray-500">
                Safety Score: <span className="font-semibold">
                  {alert.safetyScore <= 1 ? (alert.safetyScore * 100).toFixed(0) : alert.safetyScore}/100
                </span>
              </div>
            )}

            {/* Alert ID */}
            <div className="text-xs text-gray-400 font-mono">
              ID: {alert.alertId || alert.id}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
