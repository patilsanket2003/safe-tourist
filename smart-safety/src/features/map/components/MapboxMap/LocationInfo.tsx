
import React from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import * as Location from 'expo-location';
import { formatCoordinates } from './geoUtils';

interface LocationInfoProps {
  location: Location.LocationObject | null;
  address: string | null;
  loadingAddress: boolean;
}

const LocationInfo = ({ location, address, loadingAddress }: LocationInfoProps) => {
  if (!location) return null;

  return (
    <View style={styles.locationInfo}>

      {/* DMS Coordinates */}
      <View style={styles.dmsContainer}>
        <Text style={styles.dmsText}>
          {formatCoordinates(location.coords.latitude, location.coords.longitude).dms.lat}
        </Text>
        <Text style={styles.dmsText}>
          {formatCoordinates(location.coords.latitude, location.coords.longitude).dms.lon}
        </Text>
      </View>

      {/* Address */}
      {loadingAddress ? (
        <View style={styles.addressLoading}>
          <ActivityIndicator size="small" />
          <Text>Resolving address...</Text>
        </View>
      ) : address ? (
        <Text style={styles.addressText}>{address}</Text>
      ) : (
        <Text style={styles.noteText}>Address not available</Text>
      )}

      <Text style={styles.timestamp}>
        Last updated: {new Date(location.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  locationInfo: {
    marginBottom: 16,
  },
  coordinates: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
  },
  coordText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  dmsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    backgroundColor: "#fff3e0",
    padding: 8,
    borderRadius: 6,
  },
  dmsText: {
    fontSize: 11,
    color: "#e65100",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  addressLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 8,
  },
  addressText: {
    fontSize: 13,
    color: "#2e7d32",
    textAlign: "center",
    backgroundColor: "#e8f5e8",
    padding: 12,
    borderRadius: 8,
    lineHeight: 18,
  },
  noteText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: 8,
  },
  timestamp: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
});

export default LocationInfo;
