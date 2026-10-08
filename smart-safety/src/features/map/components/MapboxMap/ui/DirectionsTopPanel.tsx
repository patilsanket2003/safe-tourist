import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocation } from '../../../../../context/LocationContext';
import LocationSearchInput, { LocationData } from '../../LocationSearchInput';
import {
  fetchDirections,
  Route,
  RoutingProfile,
} from '../../../services/mapboxDirectionsService';

interface DirectionsTopPanelProps {
  onBack: () => void;
  onRoutesCalculated: (routes: Route[], profile: RoutingProfile) => void;
  onClearRoute: () => void;
}

export default function DirectionsTopPanel({
  onBack,
  onRoutesCalculated,
  onClearRoute,
}: DirectionsTopPanelProps) {
  const { currentLocation } = useLocation();

  // Location state
  const [origin, setOrigin] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Routing profile
  const [routingProfile, setRoutingProfile] = useState<RoutingProfile>('driving');
  const distanceLimitAlertShownRef = React.useRef(false);

  // Initialize with current location as origin
  useEffect(() => {
    if (currentLocation && !origin) {
      setOrigin({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: 'Your location',
      });
    }
  }, [currentLocation]);

  const handleUseCurrentLocationOrigin = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setOrigin({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: 'Your location',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetDirections = async () => {
    if (!origin || !destination) {
      // Don't alert yet, wait for user to fill both
      return;
    }

    setLoadingRoutes(true);

    try {
      const response = await fetchDirections(
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
        routingProfile,
        { alternatives: true, steps: true }
      );

      const newRoutes = response.routes;

      if (newRoutes.length > 0) {
        onRoutesCalculated(newRoutes, routingProfile);
      }
    } catch (err: any) {
      console.error('Error fetching directions:', err);
      Alert.alert('Error', 'Failed to fetch directions. Please try again.');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Auto-calculate when both points are set or profile changes
  useEffect(() => {
    if (origin && destination) {
      handleGetDirections();
    }
  }, [origin, destination, routingProfile]);

  const straightLineDistanceKm = React.useMemo(() => {
    if (!origin || !destination) return 0;

    const R = 6371; // km
    const dLat = (destination.latitude - origin.latitude) * Math.PI / 180;
    const dLon = (destination.longitude - origin.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(origin.latitude * Math.PI / 180) * Math.cos(destination.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [origin, destination]);

  const isDistanceLimited = straightLineDistanceKm > 1000;

  useEffect(() => {
    const isUnsupportedMode =
      isDistanceLimited && (routingProfile === 'walking' || routingProfile === 'cycling');

    if (!isUnsupportedMode) {
      distanceLimitAlertShownRef.current = false;
      return;
    }

    setRoutingProfile('driving');

    if (!distanceLimitAlertShownRef.current) {
      Alert.alert(
        'Distance Limit',
        `The selected route is too long for ${routingProfile}. Switched to driving mode.`,
      );
      distanceLimitAlertShownRef.current = true;
    }
  }, [isDistanceLimited, routingProfile]);

  const handleSwapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => {
            onClearRoute();
            onBack();
          }} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>

          <View style={styles.inputsContainer}>
            {/* Decorator */}
            <View style={styles.decoratorContainer}>
              <View style={styles.dotOrigin} />
              <View style={styles.connectorLine} />
              <View style={styles.dotDest} />
            </View>

            {/* Inputs */}
            <View style={styles.inputsWrapper}>
              <View style={{ zIndex: 2000 }}>
                <LocationSearchInput
                  placeholder="Choose start location"
                  value={origin}
                  onLocationSelect={setOrigin}
                  onUseCurrentLocation={handleUseCurrentLocationOrigin}
                  currentLocation={currentLocation?.coords}
                  containerStyle={styles.inputFieldContainer}
                  inputStyle={styles.inputField}
                  showIcon={false}
                  compact={true}
                />
              </View>
              <View style={styles.divider} />
              <View style={{ zIndex: 1000 }}>
                <LocationSearchInput
                  placeholder="Choose destination"
                  value={destination}
                  onLocationSelect={setDestination}
                  currentLocation={currentLocation?.coords}
                  containerStyle={styles.inputFieldContainer}
                  inputStyle={styles.inputField}
                  showIcon={false}
                  compact={true}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.swapButton} onPress={handleSwapLocations}>
            <MaterialCommunityIcons name="swap-vertical" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeRow}>
          {(['driving', 'walking', 'cycling'] as const).map((mode) => {
            let iconName: any = 'car';
            if (mode === 'walking') iconName = 'walk';
            if (mode === 'cycling') iconName = 'bike';

            const isSelected = routingProfile === mode;
            const isDisabled = isDistanceLimited && (mode === 'walking' || mode === 'cycling');

            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeItem,
                  isSelected && styles.modeItemSelected,
                  isDisabled && { opacity: 0.3 }
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    setRoutingProfile(mode as RoutingProfile);
                  } else {
                    Alert.alert('Unavailable', 'Distance is too far for this travel mode.');
                  }
                }}
                disabled={isDisabled}
              >
                <MaterialCommunityIcons
                  name={iconName}
                  size={24}
                  color={isSelected ? '#ffffff' : (isDisabled ? '#9ca3af' : '#6b7280')}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {loadingRoutes && (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 10,
    right: 10,
    zIndex: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  inputsContainer: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  decoratorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingVertical: 4,
  },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3b82f6',
    backgroundColor: 'white',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#d1d5db',
    marginVertical: 3,
    minHeight: 20,
  },
  dotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  inputsWrapper: {
    flex: 1,
    gap: 2,
  },
  inputFieldContainer: {
    marginBottom: 0,
    height: 32,
    justifyContent: 'center',
  },
  inputField: {
    fontSize: 14,
    height: 32,
    fontWeight: '500',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 2,
  },
  swapButton: {
    padding: 8,
    marginTop: 28,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
    paddingBottom: 2,
    gap: 8,
  },
  modeItem: {
    width: 48,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modeItemSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  loadingBar: {
    height: 2,
    marginTop: 8,
    alignItems: 'center',
  }
});
