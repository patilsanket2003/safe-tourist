import React, { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { StyleSheet, Platform, Alert, Dimensions, View } from "react-native";
import { WebView } from 'react-native-webview';
import * as Location from "expo-location";

// Import sub-components
import MapHeader from './OsmMap/MapHeader';
import ErrorMessage from './OsmMap/ErrorMessage';
import MapContainer from './OsmMap/MapContainer';
import LocationInfo from './OsmMap/LocationInfo';
import MapActionButtons from './OsmMap/MapActionButtons';

// Import types, constants and utilities
import { OsmMapProps, LocationData } from './OsmMap/types';
import { reverseGeocode } from './OsmMap/geoUtils';
import { useLocation } from '../../../context/LocationContext';
import { GeoFence, filterFencesByDistance, haversineKm } from '../../../utils/geofenceLogic';

// Default tile configuration
const DEFAULT_TILE_CONFIG = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors'
};

const NEARBY_FENCE_RADIUS_KM = 20000;
const LOCATION_REFILTER_THRESHOLD_KM = 5;

/*
  Enhanced OsmMap: OpenStreetMap integration with Leaflet
  
  Features:
  - Interactive Leaflet map with OpenStreetMap tiles
  - Location services with Expo Location
  - Nominatim reverse and forward geocoding
  - Multiple map tile providers
  - Marker management and click events
  - Location sharing and external map opening
  - Error handling and retry mechanisms
*/

const OsmMap = forwardRef(({
  showCurrentLocation = true,
  onLocationSelect,
  onLocationChange,
  style,
  zoomLevel = 15,
  mapWidth = Dimensions.get('window').width - 32,
  mapHeight = 300,
  geoFences,
  isFullScreen,
  onToggleFullScreen
}: OsmMapProps, ref: any) => {
  const { setCurrentLocation, setCurrentAddress } = useLocation();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [geoFencesToSend, setGeoFencesToSend] = useState<GeoFence[]>([]);
  const [lastLocationForFilter, setLastLocationForFilter] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);

  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    postMessage: (msg: string) => {
      if (webViewRef.current) {
        if (typeof (webViewRef.current as any).postMessage === 'function') {
          (webViewRef.current as any).postMessage(msg);
        } else {
          webViewRef.current.injectJavaScript(`window.postMessage(${msg}, '*');`);
        }
      }
    }
  }));

  // Load geo-fences based on location permission
  useEffect(() => {
    (async () => {
      if (showCurrentLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === 'granted';
        setLocationPermissionGranted(granted);

        if (!granted) {
          setErrorMsg('Location permission denied. Showing all safety zones.');
          loadAllFencesWithoutFiltering();
          return;
        }

        try {
          const locationResult = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = locationResult.coords;
          setLastLocationForFilter({ lat: latitude, lng: longitude });
          await loadAndFilterFences(latitude, longitude);
        } catch (err) {
          console.warn('Failed to get location for filtering:', err);
          loadAllFencesWithoutFiltering();
        }
      } else {
        loadAllFencesWithoutFiltering();
      }
    })();
  }, [showCurrentLocation]);

  const loadAllFencesWithoutFiltering = async () => {
    try {
      // Import geofenceService to get fences loaded from API
      const geofenceService = require('../services/geofenceService').default;
      
      // Get fences from geofenceService (which loads from API with userId)
      let data = geofenceService.getFences();
      
      // If no fences loaded yet, fallback to local JSON
      if (!data || data.length === 0) {
        data = require('../../../../assets/geofences-output.json');
      }
      
      const fencesWithDistance = data.map((f: GeoFence) => ({
        ...f,
        distanceToUser: undefined
      }));
      setGeoFencesToSend(fencesWithDistance);
      console.log('Loaded all geo-fences (no location permission):', fencesWithDistance.length);
    } catch (err) {
      console.warn('Failed to load geo-fences:', err);
      setGeoFencesToSend([]);
    }
  };

  const loadAndFilterFences = async (userLat: number, userLng: number) => {
    try {
      // Import geofenceService to get fences loaded from API
      const geofenceService = require('../services/geofenceService').default;
      
      // Get fences from geofenceService (which loads from API with userId)
      let data = geofenceService.getFences();
      
      // If no fences loaded yet, fallback to local JSON
      if (!data || data.length === 0) {
        data = require('../../../../assets/geofences-output.json');
      }
      
      const nearby = filterFencesByDistance(data, userLat, userLng, NEARBY_FENCE_RADIUS_KM);
      setGeoFencesToSend(nearby);
      console.log(`Loaded ${data.length} total fences, filtered to ${nearby.length} within ${NEARBY_FENCE_RADIUS_KM}km`);
    } catch (err) {
      console.warn('Failed to load/filter geo-fences:', err);
      setGeoFencesToSend([]);
    }
  };

  // Re-filter fences when location changes significantly
  const refilterFencesIfNeeded = useCallback((newLat: number, newLng: number) => {
    if (lastLocationForFilter) {
      const distance = haversineKm(
        [newLat, newLng],
        [lastLocationForFilter.lat, lastLocationForFilter.lng]
      );

      if (distance >= LOCATION_REFILTER_THRESHOLD_KM) {
        console.log(`User moved ${distance.toFixed(2)}km, re-filtering fences...`);
        setLastLocationForFilter({ lat: newLat, lng: newLng });
        loadAndFilterFences(newLat, newLng);
      }
    } else {
      setLastLocationForFilter({ lat: newLat, lng: newLng });
      loadAndFilterFences(newLat, newLng);
    }
  }, [lastLocationForFilter]);

  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation();
    }
  }, [showCurrentLocation]);

  useEffect(() => {
    if (location && mapReady) {
      updateMapLocation();
    }
  }, [location, mapReady]);

// Send geo-fences to the WebView when map is ready or when geoFences prop changes
  useEffect(() => {
    if (!webViewRef.current || !mapReady) return;

    const fences = geoFences || geoFencesToSend;
    if (!Array.isArray(fences)) return;

    try {
      console.log(`Sending ${fences.length} geofences to WebView, including custom fences:`, 
        fences.filter(f => f.id && f.id.startsWith('custom')).map(f => f.name));
      webViewRef.current.postMessage(JSON.stringify({ type: 'setGeoFences', fences }));
    } catch (e) {
      console.warn('failed to post geoFences to webview', e);
    }
  }, [mapReady, geoFences, geoFencesToSend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Reset map ready state when component unmounts
      setMapReady(false);
    };
  }, []);

  const getCurrentLocation = async (highAccuracy: boolean = true) => {
    try {
      setLoadingLocation(true);
      setErrorMsg(null);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Location permission denied. Please enable location access in settings.");
        return;
      }

      // Get current position
      const locationOptions: Location.LocationOptions = {
        accuracy: highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
        timeInterval: 1000,
        distanceInterval: 1,
      };

const currentLocation = await Location.getCurrentPositionAsync(locationOptions);
      setLocation(currentLocation);
      setCurrentLocation(currentLocation); // Store in context

      // Re-filter fences if user moved significantly
      if (locationPermissionGranted) {
        refilterFencesIfNeeded(currentLocation.coords.latitude, currentLocation.coords.longitude);
      }

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
        timestamp: currentLocation.timestamp,
      };

      if (onLocationChange) {
        onLocationChange(locationData);
      }

      if (onLocationSelect) {
        onLocationSelect(locationData);
      }

      // Get address for current location
      setLoadingAddress(true);
      const addressResult = await reverseGeocode(
        currentLocation.coords.latitude, 
        currentLocation.coords.longitude
      );
      
      if (addressResult) {
        setAddress(addressResult);
        setCurrentAddress(addressResult); // Store in context
      } else {
        const fallbackAddress = "Address lookup failed";
        setAddress(fallbackAddress);
        setCurrentAddress(fallbackAddress); // Store in context
      }
      setLoadingAddress(false);

    } catch (err: any) {
      console.error("Location error:", err);
      setErrorMsg(`Failed to get location: ${err.message}`);
      
      // Try with lower accuracy if high accuracy failed
      if (highAccuracy) {
        setTimeout(() => getCurrentLocation(false), 1000);
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const updateMapLocation = () => {
    if (!location || !webViewRef.current) return;

    const { latitude, longitude } = location.coords;
    const accuracy = location.coords.accuracy || 0;
    
    webViewRef.current.postMessage(JSON.stringify({
      type: 'updateLocation',
      latitude,
      longitude,
      accuracy,
      zoomLevel
    }));
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          setMapReady(true);
          break;
          
        case 'mapClick':
          const { lat, lng } = data;
          // Handle map click - you can add custom logic here
          const clickedLocation: LocationData = {
            latitude: lat,
            longitude: lng,
            timestamp: Date.now(),
          };
          
          if (onLocationSelect) {
            onLocationSelect(clickedLocation);
          }
          
          // Start loading address indicator
          setLoadingAddress(true);
          
          // Reverse geocode the clicked location
          reverseGeocode(lat, lng)
            .then(result => {
              if (result) {
                setAddress(result);
              } else {
                setAddress("Address lookup failed");
              }
            })
            .finally(() => {
              setLoadingAddress(false);
            });
          break;
          
        case 'error':
          console.error('Map error:', data.message);
          setErrorMsg(data.message);
          break;
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  };

  const openExternalMap = () => {
    if (!location) return;

    const { latitude, longitude } = location.coords;
    
    const urls = {
      openstreetmap: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
      googlemaps: `https://www.google.com/maps?q=${latitude},${longitude}`,
      applemaps: `https://maps.apple.com/?q=${latitude},${longitude}`,
    };

    Alert.alert(
      "Open in External Map",
      "Choose a map application:",
      [
        { text: "OpenStreetMap", onPress: () => console.log("Open:", urls.openstreetmap) },
        { text: "Google Maps", onPress: () => console.log("Open:", urls.googlemaps) },
        ...(Platform.OS === 'ios' ? [{ text: "Apple Maps", onPress: () => console.log("Open:", urls.applemaps) }] : []),
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const shareLocation = () => {
    if (!location) return;
    
    const { latitude, longitude } = location.coords;
    const message = `My location: https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
    
    console.log("Share location:", message);
    // You can integrate with Expo Sharing API here
  };

  return (
    <View style={[styles.container, isFullScreen ? styles.fullscreenContainer : undefined, style]}>
        {/* Header Component */}
        <MapHeader
          title="Map"
          loading={loadingLocation}
          onRefresh={getCurrentLocation}
        />

        {/* Error Message Component */}
        <ErrorMessage 
          errorMsg={errorMsg}
          onRetry={getCurrentLocation}
        />

        {/* Map Container */}
        <MapContainer
          webViewKey={webViewKey}
          height={mapHeight}
          tileConfig={DEFAULT_TILE_CONFIG}
          onWebViewMessage={handleWebViewMessage}
          webViewRef={webViewRef}
          isFullScreen={!!isFullScreen}
        />

        {/* Location Information */}
        <LocationInfo
          location={location}
          address={address}
          loadingAddress={loadingAddress}
        />

        {/* Action Buttons */}
        <MapActionButtons
          locationAvailable={!!location}
          loadingLocation={loadingLocation}
          onGetCurrentLocation={getCurrentLocation}
          onOpenExternalMap={openExternalMap}
          onShareLocation={shareLocation}
          onToggleFullScreen={onToggleFullScreen ? () => onToggleFullScreen(!isFullScreen) : undefined}
          isFullScreen={!!isFullScreen}
        />
    </View>
  );
});

export default OsmMap;

const styles = StyleSheet.create({
  container: {
    margin: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fullscreenContainer: {
    margin: 0,
    borderRadius: 0,
  }
});
