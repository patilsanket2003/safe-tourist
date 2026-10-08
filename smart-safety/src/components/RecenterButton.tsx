/**
 * RecenterButton Component
 * Floating button to re-center map on user's location
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RecenterButtonProps {
  onPress: () => void;
}

export default function RecenterButton({ onPress }: RecenterButtonProps) {
  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons 
        name="crosshairs-gps" 
        size={24} 
        color="#1f2937" 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 260, // Below the RightActionButtons
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
    elevation: 5,
    zIndex: 1000,
  },
});
