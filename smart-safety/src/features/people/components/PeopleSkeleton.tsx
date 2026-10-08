import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

/**
 * Skeleton loader component for People list
 * Maintains consistent design during data fetch
 */
export default function PeopleSkeleton() {
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
      {/* Person Card 1 */}
      <View style={styles.cardSkeleton}>
        <View style={styles.cardContent}>
          {/* Avatar Skeleton */}
          <SkeletonBox width={56} height={56} style={styles.avatarSkeleton} />

          {/* Info Section Skeleton */}
          <View style={styles.infoSkeleton}>
            <SkeletonBox width="70%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonBox width="90%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonBox width="80%" height={14} />
          </View>

          {/* Edit Button Skeleton */}
          <SkeletonBox width={36} height={36} style={styles.buttonSkeleton} />
        </View>

        {/* Badges Skeleton */}
        <View style={styles.badgesSkeleton}>
          <SkeletonBox width={60} height={24} style={styles.badgeSkeleton} />
          <SkeletonBox width={80} height={24} style={styles.badgeSkeleton} />
          <SkeletonBox width={50} height={24} style={styles.badgeSkeleton} />
        </View>
      </View>

      {/* Person Card 2 */}
      <View style={styles.cardSkeleton}>
        <View style={styles.cardContent}>
          <SkeletonBox width={56} height={56} style={styles.avatarSkeleton} />
          <View style={styles.infoSkeleton}>
            <SkeletonBox width="65%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonBox width="85%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonBox width="75%" height={14} />
          </View>
          <SkeletonBox width={36} height={36} style={styles.buttonSkeleton} />
        </View>
        <View style={styles.badgesSkeleton}>
          <SkeletonBox width={55} height={24} style={styles.badgeSkeleton} />
          <SkeletonBox width={75} height={24} style={styles.badgeSkeleton} />
        </View>
      </View>

      {/* Person Card 3 */}
      <View style={styles.cardSkeleton}>
        <View style={styles.cardContent}>
          <SkeletonBox width={56} height={56} style={styles.avatarSkeleton} />
          <View style={styles.infoSkeleton}>
            <SkeletonBox width="75%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonBox width="95%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonBox width="85%" height={14} />
          </View>
          <SkeletonBox width={36} height={36} style={styles.buttonSkeleton} />
        </View>
        <View style={styles.badgesSkeleton}>
          <SkeletonBox width={60} height={24} style={styles.badgeSkeleton} />
          <SkeletonBox width={70} height={24} style={styles.badgeSkeleton} />
          <SkeletonBox width={55} height={24} style={styles.badgeSkeleton} />
        </View>
      </View>

      {/* Person Card 4 */}
      <View style={styles.cardSkeleton}>
        <View style={styles.cardContent}>
          <SkeletonBox width={56} height={56} style={styles.avatarSkeleton} />
          <View style={styles.infoSkeleton}>
            <SkeletonBox width="60%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonBox width="80%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonBox width="70%" height={14} />
          </View>
          <SkeletonBox width={36} height={36} style={styles.buttonSkeleton} />
        </View>
        <View style={styles.badgesSkeleton}>
          <SkeletonBox width={65} height={24} style={styles.badgeSkeleton} />
          <SkeletonBox width={85} height={24} style={styles.badgeSkeleton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  skeletonBox: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  cardSkeleton: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarSkeleton: {
    borderRadius: 28,
    marginRight: 12,
  },
  infoSkeleton: {
    flex: 1,
    paddingTop: 2,
  },
  buttonSkeleton: {
    borderRadius: 10,
  },
  badgesSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  badgeSkeleton: {
    borderRadius: 8,
  },
});
