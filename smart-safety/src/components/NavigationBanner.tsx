/**
 * NavigationBanner Component
 * Shows turn-by-turn instructions like Google Maps
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface NavigationBannerProps {
  instruction: string;
  distance?: string;
  direction?: 'north' | 'south' | 'east' | 'west' | 'straight' | 'left' | 'right';
}

export default function NavigationBanner({ 
  instruction, 
  distance, 
  direction = 'straight' 
}: NavigationBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name={getDirectionIcon(direction)} 
          size={40} 
          color="white" 
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.instruction}>{instruction}</Text>
        {distance && (
          <Text style={styles.distance}>{distance}</Text>
        )}
      </View>
    </View>
  );
}

function getDirectionIcon(direction: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (direction) {
    case 'north': return 'arrow-up-bold';
    case 'south': return 'arrow-down-bold';
    case 'east': return 'arrow-right-bold';
    case 'west': return 'arrow-left-bold';
    case 'left': return 'arrow-left-bold';
    case 'right': return 'arrow-right-bold';
    case 'straight': return 'arrow-up-bold';
    default: return 'navigation';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#1E7E5C', // Google Maps green
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1000,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  instruction: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  distance: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
