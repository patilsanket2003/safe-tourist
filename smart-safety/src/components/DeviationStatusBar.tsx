/**
 * DeviationStatusBar Component
 * Shows real-time path deviation status with color-coded indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DeviationStatus } from '../services/pathDeviationService';

interface DeviationStatusBarProps {
  status: DeviationStatus;
}

export default function DeviationStatusBar({ status }: DeviationStatusBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Path Deviation Status</Text>
      <View style={styles.statusGrid}>
        <StatusIndicator 
          label="Route" 
          value={status.spatial}
          color={getSpatialColor(status.spatial)}
          icon={getSpatialIcon(status.spatial)}
        />
        <StatusIndicator 
          label="Time" 
          value={status.temporal}
          color={getTemporalColor(status.temporal)}
          icon={getTemporalIcon(status.temporal)}
        />
        <StatusIndicator 
          label="Direction" 
          value={status.directional}
          color={getDirectionalColor(status.directional)}
          icon={getDirectionalIcon(status.directional)}
        />
      </View>
      
      {/* Overall Severity Badge */}
      {status.severity !== 'normal' && (
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(status.severity) }]}>
          <MaterialCommunityIcons 
            name={getSeverityIcon(status.severity)} 
            size={16} 
            color="white" 
          />
          <Text style={styles.severityText}>
            {status.severity.toUpperCase()} DEVIATION
          </Text>
        </View>
      )}
    </View>
  );
}

interface StatusIndicatorProps {
  label: string;
  value: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

function StatusIndicator({ label, value, color, icon }: StatusIndicatorProps) {
  return (
    <View style={styles.indicator}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={16} color="white" />
      </View>
      <Text style={styles.indicatorLabel}>{label}</Text>
      <Text style={[styles.indicatorValue, { color }]}>
        {formatValue(value)}
      </Text>
    </View>
  );
}

// Helper functions for colors and icons

function getSpatialColor(spatial: string): string {
  switch (spatial) {
    case 'ON_ROUTE': return '#15803d'; // Green
    case 'NEAR_ROUTE': return '#f59e0b'; // Orange
    case 'OFF_ROUTE': return '#dc2626'; // Red
    default: return '#6b7280'; // Gray
  }
}

function getSpatialIcon(spatial: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (spatial) {
    case 'ON_ROUTE': return 'check-circle';
    case 'NEAR_ROUTE': return 'alert-circle';
    case 'OFF_ROUTE': return 'close-circle';
    default: return 'help-circle';
  }
}

function getTemporalColor(temporal: string): string {
  switch (temporal) {
    case 'ON_TIME': return '#15803d'; // Green
    case 'DELAYED': return '#f59e0b'; // Orange
    case 'SEVERELY_DELAYED': return '#dc2626'; // Red
    case 'STOPPED': return '#dc2626'; // Red
    default: return '#6b7280'; // Gray
  }
}

function getTemporalIcon(temporal: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (temporal) {
    case 'ON_TIME': return 'clock-check';
    case 'DELAYED': return 'clock-alert';
    case 'SEVERELY_DELAYED': return 'clock-alert-outline';
    case 'STOPPED': return 'pause-circle';
    default: return 'clock';
  }
}

function getDirectionalColor(directional: string): string {
  switch (directional) {
    case 'TOWARD_DEST': return '#15803d'; // Green
    case 'PERPENDICULAR': return '#f59e0b'; // Orange
    case 'AWAY': return '#dc2626'; // Red
    default: return '#6b7280'; // Gray
  }
}

function getDirectionalIcon(directional: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (directional) {
    case 'TOWARD_DEST': return 'arrow-up-bold';
    case 'PERPENDICULAR': return 'arrow-right-bold';
    case 'AWAY': return 'arrow-down-bold';
    default: return 'navigation';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'minor': return '#f59e0b'; // Orange
    case 'moderate': return '#f97316'; // Dark Orange
    case 'concerning': return '#ea580c'; // Red-Orange
    case 'major': return '#dc2626'; // Red
    default: return '#6b7280'; // Gray
  }
}

function getSeverityIcon(severity: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (severity) {
    case 'minor': return 'information';
    case 'moderate': return 'alert';
    case 'concerning': return 'alert-octagon';
    case 'major': return 'shield-alert';
    default: return 'help';
  }
}

function formatValue(value: string): string {
  // Convert SNAKE_CASE to Title Case
  return value
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  indicator: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  indicatorLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  indicatorValue: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});
