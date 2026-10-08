
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MAPBOX_STYLES } from './constants';

interface StyleSelectorProps {
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
}

const StyleSelector = ({ 
  selectedStyle, 
  onSelectStyle, 
}: StyleSelectorProps) => {
  const stylesKeys = Object.keys(MAPBOX_STYLES);

  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Map Style:</Text>
      <View style={styles.selectorChips}>
        {stylesKeys.map((styleKey) => (
          <Chip
            key={styleKey}
            selected={selectedStyle === styleKey}
            onPress={() => onSelectStyle(styleKey)}
            compact
            style={styles.chip}
          >
            {MAPBOX_STYLES[styleKey].name}
          </Chip>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorContainer: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  selectorChips: {
    flexDirection: "row",
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
  },
});

export default StyleSelector;
