import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Route, RoutingProfile, getRouteSummary } from '../../../services/mapboxDirectionsService';
import { usePathDeviation } from '../../../../../context/PathDeviationContext';

interface DirectionsBottomSheetProps {
  route: Route | null;
  profile?: RoutingProfile;
  onClearRoute: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export default function DirectionsBottomSheet({
  route,
  profile = 'driving',
  onClearRoute,
  onVisibilityChange,
}: DirectionsBottomSheetProps) {
  const translateY = useSharedValue(300);

  const { isTracking } = usePathDeviation();

  useEffect(() => {
    // Hide bottom sheet when tracking starts
    const isVisible = route && !isTracking;
    translateY.value = withTiming(isVisible ? 0 : 300, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    // Notify parent of visibility change
    onVisibilityChange?.(isVisible);
  }, [route, isTracking, onVisibilityChange]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!route) return null;

  const routeSummary = getRouteSummary(route);

  const isEcoFriendly = profile === 'walking' || profile === 'cycling';

  let routeDescription = 'Fastest route, usual traffic';
  if (profile === 'walking') routeDescription = 'Shortest path';
  if (profile === 'cycling') routeDescription = 'Best cycling route';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Drag Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header with Close */}
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Route to Destination</Text>
        <TouchableOpacity onPress={onClearRoute}>
          <MaterialCommunityIcons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.routeDetails}>
        {/* Time & Leaf */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{routeSummary.durationText}</Text>
          {isEcoFriendly && (
            <View style={styles.ecoBadge}>
              <MaterialCommunityIcons name="leaf" size={14} color="#15803d" />
              <Text style={styles.ecoText}>Eco-friendly</Text>
            </View>
          )}
        </View>

        {/* Distance & ETA Details */}
        <Text style={styles.metaText}>
          {routeSummary.distanceText} • {routeDescription}
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={async () => {
              try {
                const coords = route.geometry.coordinates;
                const dest = coords[coords.length - 1]; // [lng, lat]
                // Use standard Google Maps URL format
                const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest[1]},${dest[0]}`;
                const message = `I'm on my way! ETA: ${routeSummary.durationText} (${routeSummary.distanceText}).\n\nTrack my route: ${mapUrl}`;

                await Share.share({
                  message,
                  title: 'Share Route'
                });
              } catch (error) {
                console.error('Error sharing:', error);
              }
            }}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color="#1f2937" />
            <Text style={styles.actionBtnTextSecondary}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 300,
    paddingHorizontal: 16,
    paddingBottom: 100, // Increased to avoid overlap with bottom tab bar
    paddingTop: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  routeDetails: {
    // flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#15803d',
  },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ecoText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnTextSecondary: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 14,
  },
});
