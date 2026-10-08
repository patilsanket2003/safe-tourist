import { TileServerConfig } from './types';

// Risk color mapping
export const RISK_COLORS: Record<string, string> = {
  'very high': '#d32f2f', // red
  'high': '#ff9800',      // orange
  'medium': '#ffeb3b',    // yellow
  'standard': '#9e9e9e'   // gray
};

// Tile server configurations
export const TILE_SERVERS: Record<string, TileServerConfig> = {
  openstreetmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  cartodb: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  stamen: {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
    attribution: 'Map tiles by Stamen Design, CC BY 3.0 — Map data © OpenStreetMap contributors'
  }
};
