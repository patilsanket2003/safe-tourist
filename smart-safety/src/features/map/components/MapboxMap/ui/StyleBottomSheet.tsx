import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAPBOX_STYLES } from '../constants';

interface StyleBottomSheetProps {
  isExpanded: boolean;
  onToggle: () => void;
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 450; // Slightly reduced for compact feel
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 140,
  mass: 0.6,
};

const STYLE_DISPLAY_CONFIG: Record<string, {
  icon: keyof typeof MaterialCommunityIcons.glyphMap,
  label: string,
  subtitle: string,
}> = {
  streets: {
    icon: 'map-outline',
    label: 'Streets',
    subtitle: 'Standard View',
  },
  outdoors: {
    icon: 'hiking',
    label: 'Outdoors',
    subtitle: 'Trails & Nature',
  },
  satellite: {
    icon: 'satellite-variant',
    label: 'Satellite',
    subtitle: 'Detailed Imagery',
  },
  satelliteStreets: {
    icon: 'layers-triple-outline',
    label: 'Hybrid',
    subtitle: 'Satellite + Labels',
  },
  default: {
    icon: 'map',
    label: 'Map',
    subtitle: 'Standard',
  }
};

const THEME = {
    primary: '#0077CC',
    text: '#0F172A',
    subtext: '#64748B',
    background: '#FFFFFF',
    itemBg: '#FFFFFF',
    itemBorder: '#E2E8F0',
    selectedBg: '#F0F9FF',
    iconUnselected: '#64748B',
};

export default function StyleBottomSheet({
  isExpanded,
  onToggle,
  selectedStyle,
  onSelectStyle,
}: StyleBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);

  const bottomPadding = Math.max(insets.bottom, 20);

  useEffect(() => {
    if (isExpanded) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, { ...SPRING_CONFIG, stiffness: 100 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isExpanded]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: isExpanded ? 'auto' : 'none',
  }));

  const availableStyles = Object.keys(MAPBOX_STYLES).filter(
    key => key !== 'light' && key !== 'dark'
  );

  const renderStyleItem = (key: string) => {
    const isSelected = selectedStyle === key;
    const config = STYLE_DISPLAY_CONFIG[key] || { ...STYLE_DISPLAY_CONFIG.default, label: MAPBOX_STYLES[key]?.name || 'Unknown' };

    return (
      <TouchableOpacity
        key={key}
        onPress={() => onSelectStyle(key)}
        activeOpacity={0.8}
        style={[
            styles.listItem,
            isSelected && styles.listItemSelected
        ]}
      >
        <View style={[
            styles.iconContainer, 
            isSelected && styles.iconContainerSelected
        ]}>
          <MaterialCommunityIcons
            name={config.icon}
            size={24}
            color={isSelected ? THEME.primary : '#6B7280'}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[
              styles.itemTitle,
              isSelected && styles.itemTitleSelected
          ]}>
            {config.label}
          </Text>
          <Text style={styles.itemSubtitle}>{config.subtitle}</Text>
        </View>

        <View style={styles.selectionIndicator}>
            {isSelected ? (
                 <MaterialCommunityIcons name="check-circle" size={24} color={THEME.primary} />
            ) : (
                <View style={styles.radioUnselected} />
            )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {isExpanded && (
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onToggle} />
        </Animated.View>
      )}

      <Animated.View style={[styles.container, animatedSheetStyle, { paddingBottom: bottomPadding }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBackground]} />
        )}

        <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.9}>
          <View style={styles.handle} />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Map Style</Text>

          <ScrollView
            contentContainerStyle={{ paddingBottom: bottomPadding + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {availableStyles.map(key => renderStyleItem(key))}
          </ScrollView>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 200,
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
    zIndex: 9999,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  androidBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    width: '100%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 100,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  listItemSelected: {
    backgroundColor: `${THEME.primary}15`,
    borderColor: THEME.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerSelected: {
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemTitleSelected: {
    color: THEME.primary,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
});
