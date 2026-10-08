import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { fetchOpenMeteoCurrentHour } from '../../../utils/api';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Weather = () => {
  const [currentData, setCurrentData] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeatherFor = async (lat: number, lon: number) => {
    try {
      setError(null)
      const { compact } = await fetchOpenMeteoCurrentHour(lat, lon)
      setCurrentData(compact)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch weather')
      setCurrentData(null)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Location permission denied')
        await fetchWeatherFor(28.6139, 77.2090)
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      await fetchWeatherFor(loc.coords.latitude, loc.coords.longitude)
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh weather')
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const weatherItems = [
    {
      icon: 'water-percent',
      value: currentData?.humidity != null ? `${currentData.humidity}%` : '—',
      label: 'Humidity',
      color: '#4A90C7',
    },
    {
      icon: 'weather-windy',
      value: currentData?.wind_speed != null ? `${Math.round(currentData.wind_speed * 3.6)} km/h` : '—',
      label: 'Wind',
      color: '#3D9A6A',
    },
    {
      icon: 'eye-outline',
      value: currentData?.visibility != null ? `${Math.round(currentData.visibility / 1000)} km` : '—',
      label: 'Visibility',
      color: '#7A5BA5',
    },
    {
      icon: 'gauge',
      value: currentData?.pressure != null ? `${currentData.pressure}` : '—',
      label: 'Pressure (hPa)',
      color: '#C98E3A',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Weather Information</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6B7280" />
        </View>
      ) : (
        <View style={styles.row}>
          {weatherItems.map((item, index) => (
            <View key={index} style={styles.item}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={24}
                color={item.color}
              />
              <Text style={styles.value}>{item.value}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

export default Weather

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
});
