import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, LayoutChangeEvent, Dimensions, Keyboard } from 'react-native';
import { TextInput, Text, IconButton, Card, ActivityIndicator, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { searchLocation, GeocodingResult, getCoordinates } from '../services/mapboxGeocodingService';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationSearchInputProps {
  label?: string;
  placeholder?: string;
  value: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  onUseCurrentLocation?: () => void;
  currentLocation?: { latitude: number; longitude: number };
  icon?: string;
  disabled?: boolean;
  containerStyle?: any;
  inputStyle?: any;
  compact?: boolean;
  showIcon?: boolean;
}

export default function LocationSearchInput({
  label,
  placeholder = 'Search for a location',
  value,
  onLocationSelect,
  onUseCurrentLocation,
  currentLocation,
  icon = 'map-marker',
  disabled = false,
  containerStyle,
  inputStyle,
  compact = false,
  showIcon = true
}: LocationSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // For Portal positioning
  const containerRef = useRef<View>(null);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Sync search query with value change if compact mode
  useEffect(() => {
    if (value && compact) {
      setSearchQuery(value.address);
    } else if (!value && compact) {
      setSearchQuery('');
    }
  }, [value, compact]);

  // Debounced search
  useEffect(() => {
    // Skip search if query matches selected value (avoids re-searching what we just picked)
    if (value && searchQuery === value.address) return;

    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await searchLocation(searchQuery, {
          proximity: currentLocation,
          limit: 5
        });
        setResults(searchResults);
        setShowResults(true);
        measureDropdown(); // Measure position when results are ready
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentLocation]);

  const measureDropdown = () => {
    if (containerRef.current) {
      containerRef.current.measureInWindow((x, y, width, height) => {
        setDropdownLayout({ x, y: y + height, width, height });
      });
    }
  };

  const handleSelectResult = (result: GeocodingResult) => {
    const coords = getCoordinates(result);
    const location: LocationData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: result.place_name
    };
    onLocationSelect(location);
    if (compact) {
      setSearchQuery(result.place_name);
    } else {
      setSearchQuery('');
    }
    setShowResults(false);
    setResults([]);
    Keyboard.dismiss();
  };

  const handleUseCurrentLocation = () => {
    if (onUseCurrentLocation) {
      onUseCurrentLocation();
      if (!compact) setSearchQuery('');
      setShowResults(false);
    }
  };

  const handleClear = () => {
    onLocationSelect(null as any);
    setSearchQuery('');
    setShowResults(false);
    setResults([]);
  };

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        containerStyle,
        { zIndex: showResults ? 2000 : 1 }
      ]}
      onLayout={measureDropdown}
    >
      <View style={styles.inputContainer}>
        <TextInput
          label={label}
          placeholder={value && !compact ? value.address : placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            if (searchQuery.length >= 2) {
              setShowResults(true);
              measureDropdown();
            }
          }}
          onBlur={() => {
            // Optional: delay hiding to allow taps on results
            setTimeout(() => setShowResults(false), 200);
          }}
          disabled={disabled}
          mode="outlined"
          left={showIcon ? <TextInput.Icon icon={icon} /> : undefined}
          right={
            (value || searchQuery.length > 0) ? (
              <TextInput.Icon icon="close" onPress={handleClear} />
            ) : loading ? (
              <TextInput.Icon icon={() => <ActivityIndicator size={20} />} />
            ) : undefined
          }
          style={[
            styles.input,
            compact && styles.compactInput,
            inputStyle
          ]}
          outlineStyle={[
            compact ? { borderWidth: 0 } : undefined,
            showResults ? {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottomWidth: 0, // seamless connection
            } : undefined
          ]}
          contentStyle={compact ? styles.compactInputContent : undefined}
          theme={{
            colors: {
              background: 'transparent',
              outline: 'transparent',
              primary: '#3b82f6',
              onSurfaceVariant: '#9ca3af', // Placeholder color
            }
          }}
        />

        {onUseCurrentLocation && !value && !compact && (
          <IconButton
            icon="crosshairs-gps"
            mode="contained"
            onPress={handleUseCurrentLocation}
            disabled={disabled}
            style={styles.gpsButton}
          />
        )}
      </View>

      {/* Display selected value (Non-compact only) */}
      {value && !searchQuery && !compact && (
        <Card style={styles.selectedCard}>
          <Card.Content style={styles.selectedContent}>
            <MaterialCommunityIcons name={icon as any} size={20} color="#3b82f6" />
            <Text style={styles.selectedText} numberOfLines={2}>
              {value.address}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Search results dropdown via Portal */}
      {showResults && results.length > 0 && (
        <Portal>
          <View
            style={[
              styles.portalOverlay,
              {
                top: dropdownLayout.y +40, // Shift down
                left: dropdownLayout.x - 26, // Shift left
                width: dropdownLayout.width + 35 // Expand width
              }
            ]}
          >
            <Card style={[
              styles.resultsCard,
              {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderTopWidth: 0, // seamless connection
              }
            ]}>
              <ScrollView
                style={styles.resultsList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {results.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectResult(item)}
                    style={[
                      styles.resultItem,
                      index < results.length - 1 && styles.resultItemBorder
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={20}
                      color="#6b7280"
                      style={styles.resultIcon}
                    />
                    <View style={styles.resultTextContainer}>
                      <Text style={styles.resultText} numberOfLines={1}>
                        {item.text}
                      </Text>
                      <Text style={styles.resultSubtext} numberOfLines={1}>
                        {item.place_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          </View>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  compactInput: {
    height: 40,
    fontSize: 16,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  compactInputContent: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
    margin: 0,
  },
  gpsButton: {
    margin: 0,
  },
  selectedCard: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  selectedText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
  },
  portalOverlay: {
    position: 'absolute',
    zIndex: 9999, // Super high z-index
    elevation: 9999,
  },
  resultsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 250,
    width: '100%',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  resultsList: {
    maxHeight: 250,
    width: '100%',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingVertical: 12,
  },
  resultItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  resultSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 12,
  },
});