import React, {useEffect, useState} from 'react'
import {View, Text, ScrollView, StyleSheet, ActivityIndicator} from 'react-native'
import Slider from '@react-native-community/slider'
import {GeoFence, pointInCircle, pointInPolygon, haversineKm} from '../../../utils/geofenceLogic'
import * as FileSystem from 'expo-file-system'
import * as Location from 'expo-location'
import OsmMap from '../components/OsmMap'

// Simple debug screen to load pre-bundled JSON geo-fences (created by importer script)
export default function GeoFenceDebugScreen() {
  const [zones, setZones] = useState<GeoFence[]>([])
  const [filteredZones, setFilteredZones] = useState<GeoFence[]>([])
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true)
  const [showOnlyNearby, setShowOnlyNearby] = useState<boolean>(false)
  const [maxDistance, setMaxDistance] = useState<number>(5) // 5 km radius
  const [isMapFullScreen, setIsMapFullScreen] = useState<boolean>(false)
  
  const [loadError, setLoadError] = useState<string | null>(null)

  // Update filtered zones whenever the user's location changes
  useEffect(() => {
    if (userLocation && zones.length > 0) {
      filterZones(zones, showOnlyNearby);
    }
  }, [userLocation, showOnlyNearby, maxDistance]);

  useEffect(() => {
    // Load geofences
    const load = async () => {
      try {
        // Load generated output from assets
        try {
          const bundled = require('../../../../assets/geofences-output.json')
          console.log('Loaded geofences:', bundled.length, 
            bundled.filter(f => f.id && f.id.startsWith('custom')).map(f => f.name))
          setZones(bundled as any)
          filterZones(bundled, showOnlyNearby)
          setLoadError(null)
          return
        } catch (err) {
          console.warn('geofences-output.json not found in assets', err)
          setZones([])
          setLoadError('No generated geo-fence JSON found in assets. Run the converter to generate `assets/geofences-output.json`.')
        }
      } catch (e) {
        console.warn('error reading geofences', e)
        setZones([])
        setLoadError('Failed to load geo-fence data.')
      }
    }
    load()
  }, [])
  
  // Function to filter zones based on distance
  const filterZones = (zones: GeoFence[], filterByDistance: boolean) => {
    if (!userLocation) {
      setFilteredZones(zones);
      return;
    }
    
    const currentLocation = [userLocation.latitude, userLocation.longitude];
    
    // Add distance property to each zone
    const zonesWithDistance = zones
      .filter(zone => zone.type !== 'polygon' && zone.coords) // Filter out polygons without coords
      .map(zone => {
        const distance = haversineKm(zone.coords as number[], currentLocation);
        return { ...zone, distanceToUser: distance };
      });
      
    // Sort by distance
    zonesWithDistance.sort((a, b) => a.distanceToUser - b.distanceToUser);
    
    // Filter by maximum distance if needed
    const finalZones = filterByDistance 
      ? zonesWithDistance.filter(zone => zone.distanceToUser <= maxDistance)
      : zonesWithDistance;
    
    setFilteredZones(finalZones);
  };

  // Function to refresh location
  const refreshLocation = async () => {
    try {
      setLoadingLocation(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      console.log('Updated location for distance calculations:', location.coords.latitude, location.coords.longitude);
      
      // Re-filter zones with the new location
      filterZones(zones, showOnlyNearby);
    } catch (error) {
      console.error("Error getting location:", error);
    } finally {
      setLoadingLocation(false);
    }
  };

  // Get current user location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setLoadingLocation(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          setLoadingLocation(false);
          return;
        }

        await refreshLocation();
      } catch (error) {
        console.error("Error getting location:", error);
        setLoadingLocation(false);
      }
    };

    getCurrentLocation();
  }, []);

  // Function to reload geofences
  const reloadGeofences = async () => {
    try {
      const bundled = require('../../../../assets/geofences-output.json')
      console.log('Reloaded geofences:', bundled.length, 
        bundled.filter(f => f.id && f.id.startsWith('custom')).map(f => f.name))
      setZones(bundled as any)
      filterZones(bundled, showOnlyNearby)
      setLoadError(null)
    } catch (err) {
      console.warn('Error reloading geofences:', err)
      setLoadError('Failed to reload geo-fence data.')
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>GeoFence Debug</Text>
        <View style={styles.headerControls}>
          <Text style={styles.subtitle}>Loaded zones: <Text style={styles.subtitleValue}>{zones.length}</Text></Text>
          <Text onPress={reloadGeofences} style={styles.reloadButton}>Reload Geofences</Text>
        </View>
        
        {loadingLocation ? (
          <View style={styles.locationLoadingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.locationLoadingText}>Getting your location...</Text>
          </View>
        ) : userLocation ? (
          <View style={styles.currentLocationContainer}>
            <View style={styles.locationContentRow}>
              <Text style={styles.currentLocationText}>
                Your location: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
              </Text>
              <Text onPress={refreshLocation} style={styles.refreshLocationButton}>
                Refresh
              </Text>
            </View>
            
            <View style={styles.filterContainer}>
              <Text 
                style={[styles.filterButton, showOnlyNearby ? styles.filterButtonActive : {}]} 
                onPress={() => {
                  const newValue = !showOnlyNearby;
                  setShowOnlyNearby(newValue);
                  filterZones(zones, newValue);
                }}
              >
                {showOnlyNearby ? '✓ ' : ''}Show only nearby ({maxDistance} km)
              </Text>
              
              {showOnlyNearby && (
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeaderRow}>
                    <Text style={styles.sliderLabel}>Radius: {maxDistance} km</Text>
                    <Text 
                      style={styles.resetButton} 
                      onPress={() => {
                        setShowOnlyNearby(false);
                        filterZones(zones, false);
                      }}
                    >
                      Reset Filter
                    </Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={50}
                    step={1}
                    value={maxDistance}
                    minimumTrackTintColor="#2196F3"
                    maximumTrackTintColor="#d3d3d3"
                    thumbTintColor="#2196F3"
                    onValueChange={(value) => setMaxDistance(value)}
                    onSlidingComplete={(value) => filterZones(zones, true)}
                  />
                </View>
              )}
            </View>
          </View>
        ) : null}
      </View>
      
      <View >
        <OsmMap 
          geoFences={showOnlyNearby ? filteredZones : zones}
          isFullScreen={isMapFullScreen}
          onToggleFullScreen={(to) => setIsMapFullScreen(to)}
        />
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          Geofence Details {showOnlyNearby && filteredZones.length > 0 ? `(${filteredZones.length} nearby)` : ''}
        </Text>
      </View>
      <View style={styles.zoneList}>
        {(showOnlyNearby || userLocation ? filteredZones : zones).map((z, index) => {
          const isNearest = index === 0 && (showOnlyNearby || userLocation);
          const distance = z.distanceToUser !== undefined 
            ? z.distanceToUser.toFixed(2)
            : (userLocation && z.coords && z.type !== 'polygon')
              ? haversineKm(z.coords as number[], [userLocation.latitude, userLocation.longitude]).toFixed(2)
              : null;
              
          return (
            <View key={z.id} style={[styles.zone, isNearest && styles.nearestZone]}>
              <Text style={styles.zoneTitle}>
                {z.name}
                {isNearest && <Text style={styles.nearestBadge}> (Nearest)</Text>}
              </Text>
              <View style={styles.zoneBadgeRow}>
                <View style={styles.zoneBadge}>
                  <Text style={styles.zoneBadgeText}>{z.category}</Text>
                </View>
                {distance && (
                  <View style={[styles.distanceBadge, parseFloat(distance) < 1 ? styles.closeDistanceBadge : {}]}>
                    <Text style={styles.distanceBadgeText}>{distance} km</Text>
                  </View>
                )}
              </View>
              <View style={styles.zoneDetails}>
                <Text style={styles.zoneDetailItem}>Type: <Text style={styles.zoneDetailValue}>{z.type} {z.radiusKm ? `– radius ${z.radiusKm} km` : ''}</Text></Text>
                {z.state && <Text style={styles.zoneDetailItem}>State: <Text style={styles.zoneDetailValue}>{z.state}</Text></Text>}
                {z.riskLevel && <Text style={styles.zoneDetailItem}>Risk Level: <Text style={[styles.zoneDetailValue, {color: z.riskLevel.toLowerCase().includes('high') ? '#ff6b6b' : '#4caf50'}]}>{z.riskLevel}</Text></Text>}
              </View>
            </View>
          );
        })}
      </View>
      {loadError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your current location is visible as a blue dot on the map.
          Geofences are displayed as circles or polygons based on their type.
          {'\n\n'}
          • Tap "Refresh" to update your current location
          • Use "Show only nearby" to filter geofences within a certain radius
          • Adjust the radius slider to change the distance filter
          • The nearest geofence is highlighted in blue
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16},
  header: {
    marginBottom: 16,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  title: {fontSize: 22, fontWeight: '700', color: '#212121'},
  subtitle: {fontSize: 14, color: '#666'},
  subtitleValue: {fontSize: 14, fontWeight: '600', color: '#333'},
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  locationLoadingText: {
    marginLeft: 8,
    color: '#1976d2',
    fontSize: 13,
  },
  currentLocationContainer: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  currentLocationText: {
    color: '#2e7d32',
    fontSize: 13,
  },
  zoneList: {
    marginTop: 16,
  },
  zone: {
    padding: 12, 
    backgroundColor: '#f5f5f5', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  zoneBadge: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8
  },
  zoneBadgeText: {
    fontSize: 12,
    color: '#1976d2'
  },
  zoneDetails: {
    marginTop: 4
  },
  zoneDetailItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  zoneDetailValue: {
    color: '#333',
    fontWeight: '500'
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 6,
    marginVertical: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336'
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14
  },
  footer: {
    marginTop: 24,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 6
  },
  footerText: {
    color: '#2e7d32',
    fontSize: 13,
    lineHeight: 18
  },
  note: {marginTop: 12},
  reloadButton: {
    color: '#2196F3',
    fontWeight: '600',
    padding: 8
  },
  locationContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  refreshLocationButton: {
    color: '#2196F3',
    fontWeight: '600',
    padding: 4,
    fontSize: 13
  },
  filterContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  filterButton: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    fontSize: 12
  },
  filterButtonActive: {
    backgroundColor: '#bbdefb',
    fontWeight: '600'
  },
  sliderContainer: {
    marginTop: 8,
    width: '100%',
    paddingHorizontal: 8
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  slider: {
    width: '100%',
    height: 40
  },
  nearestZone: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#f5f9ff'
  },
  nearestBadge: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  zoneBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  distanceBadge: {
    backgroundColor: '#e8eaf6',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
    marginLeft: 8
  },
  closeDistanceBadge: {
    backgroundColor: '#e8f5e9'
  },
  distanceBadgeText: {
    fontSize: 12,
    color: '#3949ab',
    fontWeight: '500'
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resetButton: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '600'
  }
})
