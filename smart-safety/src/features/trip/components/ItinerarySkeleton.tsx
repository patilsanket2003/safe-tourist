import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

/**
 * Skeleton loader component for Solo Itinerary (Trip Cards)
 * Maintains consistent design during data fetch
 */
export default function ItinerarySkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({ 
    width, 
    height, 
    style 
  }: { 
    width: number | string; 
    height: number | string; 
    style?: any 
  }) => (
    <Animated.View
      style={[
        styles.skeletonBox,
        { width, height, opacity },
        style,
      ]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Trip Card 1 */}
      <View style={styles.cardSkeleton}>
        {/* Image Skeleton */}
        <View style={styles.imageSkeleton}>
          <SkeletonBox width={CARD_WIDTH} height={200} style={{ borderRadius: 0 }} />
          
          {/* Status Badge Skeleton */}
          <View style={styles.statusBadgeSkeleton}>
            <SkeletonBox width={80} height={20} style={{ borderRadius: 12 }} />
          </View>

          {/* Title Area Skeleton */}
          <View style={styles.imageContentSkeleton}>
            <SkeletonBox width="70%" height={24} style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SkeletonBox width={16} height={16} style={{ borderRadius: 8 }} />
              <SkeletonBox width="50%" height={16} />
            </View>
          </View>
        </View>

        {/* Progress Section Skeleton */}
        <View style={styles.progressSectionSkeleton}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <SkeletonBox width={80} height={14} />
            <SkeletonBox width={70} height={14} />
          </View>
          <SkeletonBox width="90%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBox width="100%" height={6} style={{ borderRadius: 3 }} />
        </View>

        {/* Action Buttons Skeleton */}
        <View style={styles.actionsSkeleton}>
          <SkeletonBox width="48%" height={40} style={{ borderRadius: 12 }} />
          <SkeletonBox width="48%" height={40} style={{ borderRadius: 12 }} />
        </View>
      </View>

      {/* Trip Card 2 */}
      <View style={styles.cardSkeleton}>
        <View style={styles.imageSkeleton}>
          <SkeletonBox width={CARD_WIDTH} height={200} style={{ borderRadius: 0 }} />
          <View style={styles.statusBadgeSkeleton}>
            <SkeletonBox width={80} height={20} style={{ borderRadius: 12 }} />
          </View>
          <View style={styles.imageContentSkeleton}>
            <SkeletonBox width="65%" height={24} style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SkeletonBox width={16} height={16} style={{ borderRadius: 8 }} />
              <SkeletonBox width="45%" height={16} />
            </View>
          </View>
        </View>

        <View style={styles.progressSectionSkeleton}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <SkeletonBox width={80} height={14} />
            <SkeletonBox width={70} height={14} />
          </View>
          <SkeletonBox width="85%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBox width="100%" height={6} style={{ borderRadius: 3 }} />
        </View>

        <View style={styles.actionsSkeleton}>
          <SkeletonBox width="48%" height={40} style={{ borderRadius: 12 }} />
          <SkeletonBox width="48%" height={40} style={{ borderRadius: 12 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  skeletonBox: {
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  cardSkeleton: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  imageSkeleton: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  statusBadgeSkeleton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  imageContentSkeleton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  progressSectionSkeleton: {
    padding: 16,
    paddingBottom: 12,
  },
  actionsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
