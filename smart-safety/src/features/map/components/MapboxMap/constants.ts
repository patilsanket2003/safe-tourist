
import { MapboxStyle } from './types';

// Risk color mapping
export const RISK_COLORS: Record<string, string> = {
  'very high': '#d32f2f', // red
  'high': '#ff9800',      // orange
  'medium': '#ffeb3b',    // yellow
  'standard': '#9e9e9e'   // gray
};

// Mapbox style configurations
export const MAPBOX_STYLES: Record<string, MapboxStyle> = {
  streets: {
    name: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v11'
  },
  outdoors: {
    name: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v11'
  },
  light: {
    name: 'Light',
    url: 'mapbox://styles/mapbox/light-v10'
  },
  dark: {
    name: 'Dark',
    url: 'mapbox://styles/mapbox/dark-v10'
  },
  satellite: {
    name: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9'
  },
  satelliteStreets: {
    name: 'Satellite Streets',
    url: 'mapbox://styles/mapbox/satellite-streets-v11'
  }
};
