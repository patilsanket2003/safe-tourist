/**
 * SpeedIndicator Component
 * Shows current speed like Google Maps
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SpeedIndicatorProps {
  speed: number; // in km/h
}

export default function SpeedIndicator({ speed }: SpeedIndicatorProps) {
  const displaySpeed = Math.round(speed);
  
  return (
    <View style={styles.container}>
      <Text style={styles.speed}>{displaySpeed}</Text>
      <Text style={styles.unit}>km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above the NavigationInfoBar
    left: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 999,
    elevation: 999,
  },
  speed: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  unit: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: -2,
  },
});
