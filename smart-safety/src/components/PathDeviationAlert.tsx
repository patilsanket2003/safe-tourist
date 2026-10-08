/**
 * PathDeviationAlert Component
 * Shows animated alerts for path deviations with severity-based styling
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DeviationAlert } from '../context/PathDeviationContext';

interface PathDeviationAlertProps {
  alert: DeviationAlert;
  onDismiss: () => void;
  autoDismissDelay?: number; // milliseconds, default 5000
}

export default function PathDeviationAlert({ 
  alert, 
  onDismiss, 
  autoDismissDelay = 5000 
}: PathDeviationAlertProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  // Animate entrance on mount
  useEffect(() => {
    translateY.value = withSequence(
      withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
      withTiming(-5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    opacity.value = withTiming(1, { duration: 300 });

    // Auto-dismiss after delay
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    translateY.value = withTiming(-100, { 
      duration: 250, 
      easing: Easing.in(Easing.ease) 
    });
    opacity.value = withTiming(0, { duration: 250 });
    
    // Call onDismiss after animation
    setTimeout(() => {
      onDismiss();
    }, 250);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const { icon, color, bgColor } = getSeverityStyle(alert.severity);

  return (
    <Animated.View style={[styles.container, animatedStyle, { backgroundColor: bgColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color="white" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>
          {getSeverityTitle(alert.severity)}
        </Text>
        <Text style={styles.message}>{alert.message}</Text>
        <Text style={styles.timestamp}>
          {formatTimestamp(alert.timestamp)}
        </Text>
      </View>

      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper functions

function getSeverityStyle(severity: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bgColor: string } {
  switch (severity) {
    case 'minor':
      return {
        icon: 'information',
        color: '#f59e0b',
        bgColor: '#fef3c7',
      };
    case 'moderate':
      return {
        icon: 'alert',
        color: '#f97316',
        bgColor: '#fed7aa',
      };
    case 'concerning':
      return {
        icon: 'alert-octagon',
        color: '#ea580c',
        bgColor: '#ffedd5',
      };
    case 'major':
      return {
        icon: 'shield-alert',
        color: '#dc2626',
        bgColor: '#fee2e2',
      };
    default:
      return {
        icon: 'help',
        color: '#6b7280',
        bgColor: '#f3f4f6',
      };
  }
}

function getSeverityTitle(severity: string): string {
  switch (severity) {
    case 'minor':
      return 'Minor Deviation';
    case 'moderate':
      return 'Moderate Deviation';
    case 'concerning':
      return 'Concerning Deviation';
    case 'major':
      return 'Major Deviation!';
    default:
      return 'Route Deviation';
  }
}

function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000); // seconds

  if (diff < 60) {
    return 'Just now';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  closeButton: {
    padding: 4,
  },
});
