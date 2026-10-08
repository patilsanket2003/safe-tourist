/**
 * NavigationInfoBar Component
 * Shows ETA, distance, and time like Google Maps bottom bar
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface NavigationInfoBarProps {
  duration: string; // e.g., "2 hr 35 min"
  distance: string; // e.g., "110 km"
  eta: string; // e.g., "02:49"
  onStopNavigation: () => void;
  alertsMuted?: boolean;
  onToggleMute?: () => void;
}

export default function NavigationInfoBar({
  duration,
  distance,
  eta,
  onStopNavigation,
  alertsMuted = false,
  onToggleMute,
}: NavigationInfoBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={onStopNavigation}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="close" size={32} color="white" />
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.duration}>{duration}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.distance}>{distance}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.eta}>{eta}</Text>
          <MaterialCommunityIcons 
            name="leaf" 
            size={16} 
            color="#34D399" 
            style={styles.leafIcon}
          />
        </View>
      </View>

      {onToggleMute && (
        <TouchableOpacity 
          style={styles.muteButton} 
          onPress={onToggleMute}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons 
            name={alertsMuted ? "volume-off" : "volume-high"} 
            size={28} 
            color={alertsMuted ? "#EF4444" : "white"} 
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, // At the very bottom
    left: 0,
    right: 0,
    backgroundColor: '#1F1F1F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  duration: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34D399', // Green like Google Maps
    marginBottom: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  separator: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 8,
  },
  eta: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  leafIcon: {
    marginLeft: 6,
  },
  muteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
