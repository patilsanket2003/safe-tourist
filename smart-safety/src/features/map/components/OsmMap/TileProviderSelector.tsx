import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { TileProvider } from './types';

interface TileProviderSelectorProps {
  tileProvider: TileProvider;
  onChangeTileProvider: (provider: TileProvider) => void;
  providers: string[];
}

const TileProviderSelector = ({ 
  tileProvider, 
  onChangeTileProvider, 
  providers 
}: TileProviderSelectorProps) => {
  return (
    <View style={styles.providerContainer}>
      <Text style={styles.providerLabel}>Map Tile Provider:</Text>
      <View style={styles.providerChips}>
        {providers.map((provider) => (
          <Chip
            key={provider}
            selected={tileProvider === provider}
            onPress={() => onChangeTileProvider(provider as TileProvider)}
            compact
            style={styles.chip}
          >
            {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </Chip>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  providerContainer: {
    marginBottom: 16,
  },
  providerLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  providerChips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
  },
});

export default TileProviderSelector;
