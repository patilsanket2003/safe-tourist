import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

interface MapActionButtonsProps {
  locationAvailable: boolean;
  loadingLocation: boolean;
  onGetCurrentLocation: () => void;
  onOpenExternalMap: () => void;
  onShareLocation: () => void;
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
  showHazards?: boolean;
  onToggleHazards?: () => void;
}

const MapActionButtons = ({
  locationAvailable,
  loadingLocation,
  onGetCurrentLocation,
  onOpenExternalMap,
  onShareLocation,
  onToggleFullScreen,
  isFullScreen,
  showHazards,
  onToggleHazards
}: MapActionButtonsProps) => {
  return (
    <View style={styles.actionsRow}>
      <Button
        mode="outlined"
        onPress={onGetCurrentLocation}
        disabled={loadingLocation}
        compact
        icon="crosshairs-gps"
      >
        My Location
      </Button>
      
      {/* <Button
        mode="contained"
        onPress={onOpenExternalMap}
        disabled={!locationAvailable}
        compact
        icon="open-in-new"
      >
        Open Map
      </Button> */}

      {onToggleHazards && (
        <Button
          mode="outlined"
          onPress={onToggleHazards}
          compact
          icon={showHazards ? 'eye-off' : 'eye'}
        >
          {showHazards ? 'Hide Zones' : 'Show Zones'}
        </Button>
      )}
      
      {onToggleFullScreen && (
        <Button
          mode="outlined"
          onPress={onToggleFullScreen}
          compact
          icon={isFullScreen ? 'fullscreen-exit' : 'fullscreen'}
        >
          {isFullScreen ? 'Exit Full' : 'Full Screen'}
        </Button>
      )}

      {/* <Button
        mode="outlined"
        onPress={onShareLocation}
        disabled={!locationAvailable}
        compact
        icon="share"
      >
        Share
      </Button> */}
    </View>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
});

export default MapActionButtons;
