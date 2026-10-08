/**
 * NavigationView Component
 * Full-screen navigation view like Google Maps
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathDeviation } from '../context/PathDeviationContext';
import NavigationBanner from './NavigationBanner';
import SpeedIndicator from './SpeedIndicator';
import NavigationInfoBar from './NavigationInfoBar';
import { RightActionButtons } from '../features/map/components/MapboxMap/ui';

interface NavigationViewProps {
  onLayersPress?: () => void;
  onSOSPress?: () => void;
  onLegendPress?: () => void;
}

export default function NavigationView({ onLayersPress, onSOSPress, onLegendPress }: NavigationViewProps) {
  const {
    isTracking,
    currentSpeed,
    distanceRemaining,
    estimatedTimeRemaining,
    currentInstruction,
    alerts,
    alertsMuted,
    dismissAlert,
    stopJourney,
    recenterMap,
    toggleMuteAlerts,
  } = usePathDeviation();

  // Format time remaining
  const formattedTime = useMemo(() => {
    const hours = Math.floor(estimatedTimeRemaining / 3600);
    const minutes = Math.floor((estimatedTimeRemaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }, [estimatedTimeRemaining]);

  // Format distance
  const formattedDistance = useMemo(() => {
    const km = distanceRemaining / 1000;
    if (km >= 1) {
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(distanceRemaining)} m`;
  }, [distanceRemaining]);

  // Calculate ETA
  const formattedETA = useMemo(() => {
    const now = new Date();
    const eta = new Date(now.getTime() + estimatedTimeRemaining * 1000);
    return eta.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }, [estimatedTimeRemaining]);

  if (!isTracking) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top Navigation Banner */}
      <NavigationBanner 
        instruction={currentInstruction?.instruction || "Follow the route"}
        distance={currentInstruction?.distance || formattedDistance}
        direction={currentInstruction?.direction || "straight"}
      />

      {/* Speed Indicator (Bottom Left) */}
      <SpeedIndicator speed={currentSpeed} />

      {/* Recenter/Compass Button - Separate from action buttons */}
      <TouchableOpacity 
        style={styles.recenterButton} 
        onPress={recenterMap}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name="crosshairs-gps" 
          size={24} 
          color="#374151" 
        />
      </TouchableOpacity>

      {/* Right Action Buttons (Layers, SOS) - No compass/directions button during navigation */}
      <RightActionButtons
        onLayersPress={onLayersPress}
        onSOSPress={onSOSPress}
        onLegendPress={onLegendPress}
        hideDirectionsButton={true}
        hideCompassButton={true}
        customBottom={100}
      />

      {/* Bottom Info Bar */}
      <NavigationInfoBar
        duration={formattedTime}
        distance={formattedDistance}
        eta={formattedETA}
        onStopNavigation={stopJourney}
        alertsMuted={alertsMuted}
        onToggleMute={toggleMuteAlerts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill as any,
    zIndex: 100,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 280,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 999,
    zIndex: 999,
  },
});
