import { WebView } from 'react-native-webview';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  timestamp?: number;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export interface OsmMapProps {
  showCurrentLocation?: boolean;
  onLocationSelect?: (location: LocationData) => void;
  onLocationChange?: (location: LocationData) => void;
  style?: any;
  zoomLevel?: number;
  mapWidth?: number;
  mapHeight?: number;
  geoFences?: any[]; // array of geo-fence objects: { id, type, coords, radiusKm, riskLevel, name }
  // Full-screen support
  isFullScreen?: boolean;
  onToggleFullScreen?: (toFullScreen: boolean) => void;
}

export interface GeoFence {
  id: string;
  type: 'circle' | 'polygon' | 'point';
  coords: number[];
  radiusKm?: number;
  riskLevel?: string;
  name?: string;
  category?: string;
}

export interface Coordinates {
  latitude: string;
  longitude: string;
  dms: {
    lat: string;
    lon: string;
  }
}

export type TileProvider = 'openstreetmap' | 'cartodb' | 'stamen';

export interface TileServerConfig {
  url: string;
  attribution: string;
}

export interface WebViewMessage {
  type: string;
  [key: string]: any;
}

export interface MapRefs {
  webViewRef: React.RefObject<WebView>;
}
