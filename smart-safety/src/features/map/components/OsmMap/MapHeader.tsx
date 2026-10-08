import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';

interface MapHeaderProps {
  title: string;
  loading: boolean;
  onRefresh: () => void;
}

const MapHeader = ({ title, loading, onRefresh }: MapHeaderProps) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Button
        mode="outlined"
        onPress={onRefresh}
        disabled={loading}
        compact
        icon="refresh"
      >
        {loading ? "Locating..." : "Refresh"}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default MapHeader;
