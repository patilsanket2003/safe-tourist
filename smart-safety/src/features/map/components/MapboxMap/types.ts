
// Defines the structure for messages sent from the WebView
export interface WebViewMessage {
  type: string;
  [key: string]: any;
}

// Defines the structure for a Mapbox style configuration
export interface MapboxStyle {
  name: string;
  url: string;
}

// Defines the structure for formatted coordinates
export interface Coordinates {
  latitude: string;
  longitude: string;
  dms: {
    lat: string;
    lon: string;
  };
}
