import { TileServerConfig } from './types';

export const generateMapHTML = (tileConfig: TileServerConfig): string => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
      <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .accuracy-circle { 
              fill: rgba(59, 130, 246, 0.15);
              stroke: rgba(59, 130, 246, 0.6);
              stroke-width: 1.5;
          }
          .user-marker-container {
              position: relative;
              width: 24px;
              height: 24px;
          }
          .location-marker {
              background: #2563eb;
              width: 18px;
              height: 18px;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(37,99,235,0.6);
              position: absolute;
              top: 3px;
              left: 3px;
              z-index: 2;
          }
          .location-marker-pulse {
              position: absolute;
              top: -3px;
              left: -3px;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.35);
              animation: user-marker-pulse-anim 1.8s infinite ease-out;
              z-index: 1;
          }
          @keyframes user-marker-pulse-anim {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(2.2); opacity: 0; }
          }
          /* Family & Friends Live Location Marker */
          .family-marker-wrapper {
              position: relative;
              width: 24px;
              height: 24px;
          }
          .family-dot {
              background: linear-gradient(135deg, #10B981, #059669);
              width: 18px;
              height: 18px;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(16, 185, 129, 0.6);
              position: absolute;
              top: 3px;
              left: 3px;
              z-index: 3;
          }
          .family-pulse {
              position: absolute;
              top: -3px;
              left: -3px;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: rgba(16, 185, 129, 0.35);
              animation: family-marker-pulse-anim 1.8s infinite ease-out;
              z-index: 1;
          }
          @keyframes family-marker-pulse-anim {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(2.2); opacity: 0; }
          }
          .family-name-tag {
              position: absolute;
              top: 24px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(15, 23, 42, 0.90);
              color: #f8fafc;
              padding: 2px 7px;
              border-radius: 8px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.2px;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              border: 1px solid rgba(255, 255, 255, 0.2);
              pointer-events: none;
              z-index: 4;
          }
          /* Enhanced geofence styles */
          .geofence-popup {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .geofence-popup .title {
              font-weight: bold;
              font-size: 14px;
              color: #333;
              margin-bottom: 4px;
          }
          .geofence-popup .category {
              font-size: 12px;
              color: #666;
              margin-bottom: 2px;
          }
          .geofence-popup .risk-level {
              font-size: 12px;
              padding: 2px 6px;
              border-radius: 3px;
              display: inline-block;
          }
          .geofence-popup .risk-very-high {
              background-color: #ffebee;
              color: #c62828;
          }
          .geofence-popup .risk-high {
              background-color: #fff3e0;
              color: #ef6c00;
          }
          .geofence-popup .risk-medium {
              background-color: #fffde7;
              color: #f57f17;
          }
          .geofence-popup .risk-low, .geofence-popup .risk-standard {
              background-color: #f3e5f5;
              color: #7b1fa2;
          }
      </style>
  </head>
  <body>
      <div id="map"></div>
      
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
      <!-- Import Turf.js for geospatial operations -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Turf.js/7.2.0/turf.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js"></script>
      <script>
          let map;
          let locationMarker;
          let accuracyCircle;
          let tileLayer;
          let mapInitialized = false;
          
          // Dictionary to store geofence layers by ID for easy management
          let geoFenceLayers = {};
          let geoFenceLayerGroup = null;
          let poiLayerGroup = null;
          let routeLayerGroup = null;
          
          // Initialize map with proper checks
          function initMap() {
              try {
                  // Check if map is already initialized
                  if (mapInitialized && map) {
                      console.log('Map already initialized, skipping...');
                      return;
                  }
                  
                  // Check if map container exists
                  const mapContainer = document.getElementById('map');
                  if (!mapContainer) {
                      console.error('Map container not found');
                      return;
                  }
                  
                  // Check if Leaflet is loaded
                  if (typeof L === 'undefined') {
                      console.error('Leaflet library not loaded');
                      setTimeout(initMap, 200); // Retry after 200ms
                      return;
                  }
                  
                  // Check if Turf.js is loaded
                  if (typeof turf === 'undefined') {
                      console.error('Turf.js library not loaded');
                      setTimeout(initMap, 200); // Retry after 200ms
                      return;
                  }
                  
                  // Clean up existing map if it exists
                  if (map) {
                      cleanupMap();
                  }
                  
                  // Clear the map container
                  mapContainer.innerHTML = '';
                  
                  map = L.map('map', {
                      center: [20.5937, 78.9629], // Default to India center
                      zoom: 5,
                      zoomControl: true,
                      scrollWheelZoom: true,
                      doubleClickZoom: true,
                      touchZoom: true
                  });
                  
                  // Add initial tile layer
                  tileLayer = L.tileLayer('${tileConfig.url}', {
                      attribution: '${tileConfig.attribution}',
                      maxZoom: 18,
                      subdomains: 'abc'
                  }).addTo(map);

                  // Create dedicated panes for different layer types
                  try {
                      if (!map.getPane('geofences')) {
                          map.createPane('geofences');
                          map.getPane('geofences').style.zIndex = 650; // above overlay panes
                      }
                      if (!map.getPane('geofenceLabels')) {
                          map.createPane('geofenceLabels');
                          map.getPane('geofenceLabels').style.zIndex = 660; // above geofences
                      }
                  } catch (e) { 
                      console.log('Panes not supported, using default rendering'); 
                  }
                  
                  // Initialize geofence and route layer groups
                  geoFenceLayerGroup = L.layerGroup().addTo(map);
                  geoFenceLayers = {};
                  routeLayerGroup = L.layerGroup().addTo(map);
                  poiLayerGroup = L.layerGroup().addTo(map);
                  
                  // Map click handler
                  map.on('click', function(e) {
                      const { lat, lng } = e.latlng;
                      window.ReactNativeWebView?.postMessage(JSON.stringify({
                          type: 'mapClick',
                          lat: lat,
                          lng: lng
                      }));
                  });
                  
                  // Mark as initialized
                  mapInitialized = true;

                  // If any fences were sent before initialization, render them now
                  try {
                      if (window._pendingFences) {
                          renderGeoFences(window._pendingFences);
                          window._pendingFences = null;
                      }
                      if (window._pendingRoute) {
                          renderRoutes(window._pendingRoute.routes, window._pendingRoute.selectedIndex, window._pendingRoute.waypoints);
                          window._pendingRoute = null;
                      }
                  } catch (e) { /* ignore */ }

                  // Notify that map is ready
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                      type: 'mapReady'
                  }));
                  
              } catch (error) {
                  console.error('Map initialization error:', error);
                  mapInitialized = false;
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                      type: 'error',
                      message: 'Map initialization failed: ' + error.message
                  }));
              }
          }
          
          // Enhanced geofence rendering with @turf/circle integration
          function renderGeoFences(fences) {
              try {
                  if (!map || !mapInitialized) {
                      console.log('Map not ready, storing fences for later rendering');
                      window._pendingFences = fences;
                      return;
                  }

                  if (!geoFenceLayerGroup) {
                      console.log('Creating geofence layer group');
                      geoFenceLayerGroup = L.layerGroup().addTo(map);
                  }

                  // Clear existing geofence layers
                  clearAllGeoFences();

                  if (!Array.isArray(fences)) {
                      console.warn('Fences is not an array:', fences);
                      return;
                  }
                  
                  console.log('Rendering ' + fences.length + ' geofences on map using Turf.js');
                  
                  // Log itinerary geofences for debugging
                  const itineraryFences = fences.filter(f => f.category === 'Itinerary Geofence' || (f.visualStyle && f.visualStyle.color === 'green'));
                  if (itineraryFences.length > 0) {
                      console.log('Found ' + itineraryFences.length + ' itinerary geofences to render with green color');
                  }
                  
                  let renderedCount = 0;

                  fences.forEach(fence => {
                      try {
                          if (!fence.id) {
                              console.warn('Fence missing ID, skipping:', fence);
                              return;
                          }

                          let layer = null;
                          const popupContent = createPopupContent(fence);
                          
                          // Handle circle geofences using @turf/circle
                          if (fence.type === 'circle' && Array.isArray(fence.coords) && fence.radiusKm) {
                              layer = createTurfCircleLayer(fence, popupContent);
                          }
                          // Handle point geofences
                          else if (fence.type === 'point' && Array.isArray(fence.coords)) {
                              layer = createPointLayer(fence, popupContent);
                          }
                          // Handle polygon geofences
                          else if (fence.type === 'polygon' && Array.isArray(fence.coords)) {
                              layer = createPolygonLayer(fence, popupContent);
                          }
                          else {
                              console.warn('Unknown or invalid geofence type:', fence.type, fence);
                              return;
                          }

                          if (layer) {
                              // Store layer reference for later management
                              geoFenceLayers[fence.id] = layer;
                              geoFenceLayerGroup.addLayer(layer);
                              renderedCount++;
                              
                              // Auto-zoom to custom fences
                              if (fence.id && fence.id.startsWith('custom')) {
                                  console.log('Zooming to custom fence:', fence.name);
                                  const coords = fence.coords;
                                  map.setView([coords[0], coords[1]], 14);
                              }
                          }
                          
                      } catch (innerError) { 
                          console.warn('Failed to render fence', fence.id, innerError);
                      }
                  });
                  
                  console.log('Successfully rendered ' + renderedCount + ' out of ' + fences.length + ' geofences');
                  
                  // Send message back to React Native about geofence rendering status
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                      type: 'geoFencesRendered',
                      count: renderedCount,
                      total: fences.length
                  }));
                  
              } catch (error) { 
                  console.error('renderGeoFences error:', error);
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                      type: 'error',
                      message: 'Failed to render geofences: ' + error.message
                  }));
              }
          }

          /**
           * Create a circle geofence layer using @turf/circle for accurate GeoJSON polygons
           */
          function createTurfCircleLayer(fence, popupContent) {
              try {
                  const [lat, lon] = fence.coords;
                  const radiusKm = fence.radiusKm || 1;
                  
                  // Create center point for Turf (note: Turf uses [longitude, latitude] order)
                  const center = [lon, lat];
                  
                  // Configure Turf circle options
                  const options = {
                      steps: 64, // Higher number = smoother circle
                      units: 'kilometers'
                  };
                  
                  // Generate GeoJSON circle polygon using Turf.js
                  const turfCircle = turf.circle(center, radiusKm, options);
                  
                  // Determine styling based on risk level
                  const style = getGeofenceStyle(fence);
                  
                  // Create Leaflet GeoJSON layer from Turf circle
                  const layer = L.geoJSON(turfCircle, {
                      style: style,
                      pane: 'geofences'
                  });
                  
                  // Bind popup to the layer
                  layer.bindPopup(popupContent, {
                      maxWidth: 300,
                      className: 'geofence-popup'
                  });
                  
                  console.log('Created Turf circle for:', fence.name, 'with radius:', radiusKm + 'km');
                  return layer;
                  
              } catch (error) {
                  console.error('Error creating Turf circle layer:', error);
                  // Fallback to simple Leaflet circle
                  return createFallbackCircleLayer(fence, popupContent);
              }
          }

          /**
           * Fallback to Leaflet's built-in circle if Turf fails
           */
          function createFallbackCircleLayer(fence, popupContent) {
              try {
                  const [lat, lon] = fence.coords;
                  const radiusKm = fence.radiusKm || 1;
                  const radiusM = radiusKm * 1000; // Convert km to meters
                  
                  const style = getGeofenceStyle(fence);
                  
                  const circle = L.circle([lat, lon], {
                      radius: radiusM,
                      ...style,
                      pane: 'geofences'
                  });
                  
                  circle.bindPopup(popupContent, {
                      maxWidth: 300,
                      className: 'geofence-popup'
                  });
                  
                  console.log('Created fallback Leaflet circle for:', fence.name);
                  return circle;
                  
              } catch (error) {
                  console.error('Error creating fallback circle:', error);
                  return null;
              }
          }

          /**
           * Create a point geofence layer
           */
          function createPointLayer(fence, popupContent) {
              try {
                  const [lat, lon] = fence.coords;
                  const style = getGeofenceStyle(fence);
                  
                  const marker = L.circleMarker([lat, lon], {
                      radius: 8,
                      color: style.color,
                      fillColor: style.fillColor || style.color,
                      fillOpacity: 0.8,
                      weight: 2,
                      pane: 'geofences'
                  });
                  
                  marker.bindPopup(popupContent, {
                      maxWidth: 300,
                      className: 'geofence-popup'
                  });
                  
                  return marker;
                  
              } catch (error) {
                  console.error('Error creating point layer:', error);
                  return null;
              }
          }

          /**
           * Create a polygon geofence layer
           */
          function createPolygonLayer(fence, popupContent) {
              try {
                  // Convert coordinates to Leaflet format [lat, lon]
                  const latlngs = fence.coords.map(coord => [coord[0], coord[1]]);
                  const style = getGeofenceStyle(fence);
                  
                  const polygon = L.polygon(latlngs, {
                      ...style,
                      pane: 'geofences'
                  });
                  
                  polygon.bindPopup(popupContent, {
                      maxWidth: 300,
                      className: 'geofence-popup'
                  });
                  
                  return polygon;
                  
              } catch (error) {
                  console.error('Error creating polygon layer:', error);
                  return null;
              }
          }

          /**
           * Determine styling based on geofence properties
           */
          function getGeofenceStyle(fence) {
              let color = '#9e9e9e'; // default: standard gray
              let fillOpacity = 0.25;
              let weight = 2;
              let opacity = 0.9;
              
              // PRIORITY 1: Check if backend provided visualStyle with color (for itinerary geofences)
              if (fence.visualStyle && fence.visualStyle.color) {
                  const styleColor = String(fence.visualStyle.color).toLowerCase();
                  // Map color names to hex codes
                  const colorMap = {
                      'green': '#4caf50',
                      'blue': '#2196f3',
                      'red': '#f44336',
                      'orange': '#ff9800',
                      'yellow': '#ffeb3b',
                      'purple': '#9c27b0',
                      'pink': '#e91e63',
                      'gray': '#9e9e9e',
                      'grey': '#9e9e9e'
                  };
                  
                  color = colorMap[styleColor] || fence.visualStyle.color; // Use hex if provided directly
                  
                  // Apply other visualStyle properties if provided
                  if (fence.visualStyle.fillOpacity !== undefined) {
                      fillOpacity = fence.visualStyle.fillOpacity;
                  }
                  if (fence.visualStyle.borderWidth !== undefined) {
                      weight = fence.visualStyle.borderWidth;
                  }
                  
                  console.log('Applied visualStyle color for:', fence.name, '-> color:', color);
                  
                  return {
                      color: color,
                      fillColor: color,
                      fillOpacity: fillOpacity,
                      weight: weight,
                      opacity: opacity
                  };
              }
              
              // PRIORITY 2: Determine color by riskLevel (for danger zones)
              if (fence.riskLevel) {
                  const rl = String(fence.riskLevel).toLowerCase();
                  if (rl.includes('very') && rl.includes('high')) {
                      color = '#d32f2f'; // very high -> red
                      fillOpacity = 0.3;
                  } else if (rl.includes('high')) {
                      color = '#ff9800';  // high -> orange
                      fillOpacity = 0.28;
                  } else if (rl.includes('medium') || rl.includes('med')) {
                      color = '#ffeb3b'; // medium -> yellow
                      fillOpacity = 0.25;
                  } else if (rl.includes('standard') || rl.includes('low')) {
                      color = '#9e9e9e'; // standard/low -> gray
                      fillOpacity = 0.2;
                  }
              }
              
              // PRIORITY 3: Adjust styling based on category & military classification
              const checkName = String(fence.name || '').toLowerCase();
              const checkCat = String(fence.category || '').toLowerCase();
              if (
                  checkName.includes('military') ||
                  checkName.includes('air force') ||
                  checkName.includes('cantonment') ||
                  checkName.includes('airbase') ||
                  checkCat.includes('military') ||
                  checkCat.includes('strategic') ||
                  (checkCat.includes('restricted') && (checkName.includes('military') || checkName.includes('zone')))
              ) {
                  color = '#4f46e5'; // Indigo for defense/military zones
                  weight = 2;
                  fillOpacity = 0.22;
              } else if (fence.category) {
                  const cat = String(fence.category).toLowerCase();
                  if (cat.includes('nuclear')) {
                      color = '#e91e63'; // pink for nuclear
                      weight = 3;
                  } else if (cat.includes('border')) {
                      color = '#795548'; // brown for borders
                      weight = 2;
                  } else if (cat.includes('disaster')) {
                      // Keep risk level colors for disaster areas
                  } else if (cat.includes('conflict') || cat.includes('naxal')) {
                      color = '#f44336'; // red for conflict zones
                      fillOpacity = 0.2;
                  }
              }
              
              return {
                  color: color,
                  fillColor: color,
                  fillOpacity: fillOpacity,
                  weight: weight,
                  opacity: opacity
              };
          }

/**
           * Create enhanced popup content for geofences
           */
          function createPopupContent(fence) {
              const title = escapeHtml(fence.name || 'Unnamed Geofence');
              const category = escapeHtml(fence.category || 'Unknown Category');
              const riskLevel = fence.riskLevel ? escapeHtml(fence.riskLevel) : null;
              const state = fence.state ? escapeHtml(fence.state) : null;
              const source = fence.source ? escapeHtml(fence.source) : null;
              
              let content = '<div class="geofence-popup">';
              content += '<div class="title">' + title + '</div>';
              content += '<div class="category">' + category + '</div>';
              
              if (state) {
                  content += '<div class="category">State: ' + state + '</div>';
              }
              
              if (riskLevel) {
                  const riskClass = 'risk-' + riskLevel.toLowerCase().replace(/\s+/g, '-');
                  content += '<div class="risk-level ' + riskClass + '">Risk: ' + riskLevel + '</div>';
              }
              
              if (fence.distanceToUser !== undefined && fence.distanceToUser !== null) {
                  content += '<div class="category" style="color: #666;">Distance: ' + fence.distanceToUser + ' km</div>';
              }
              
              if (fence.radiusKm) {
                  content += '<div class="category">Radius: ' + fence.radiusKm + ' km</div>';
              }
              
              if (source) {
                  content += '<div class="category" style="font-size: 10px; color: #999; margin-top: 6px;">Source: ' + source + '</div>';
              }
              
              content += '</div>';
              return content;
          }

          /**
           * Clear all geofence layers
           */
          function clearAllGeoFences() {
              try {
                  if (geoFenceLayerGroup) {
                      geoFenceLayerGroup.clearLayers();
                  }
                  geoFenceLayers = {};
                  console.log('Cleared all geofence layers');
              } catch (error) {
                  console.error('Error clearing geofences:', error);
              }
          }

          /**
           * Remove a specific geofence by ID
           */
          function removeGeoFence(fenceId) {
              try {
                  if (geoFenceLayers[fenceId]) {
                      geoFenceLayerGroup.removeLayer(geoFenceLayers[fenceId]);
                      delete geoFenceLayers[fenceId];
                      console.log('Removed geofence:', fenceId);
                  }
              } catch (error) {
                  console.error('Error removing geofence:', fenceId, error);
              }
          }

          function escapeHtml(str) {
              if (!str) return '';
              return String(str).replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;');
          }
          
          // Cleanup existing map
          function cleanupMap() {
              try {
                  if (map) {
                      // Remove layers
                      if (locationMarker) {
                          map.removeLayer(locationMarker);
                          locationMarker = null;
                      }
                      if (accuracyCircle) {
                          map.removeLayer(accuracyCircle);
                          accuracyCircle = null;
                      }
                      if (tileLayer) {
                          map.removeLayer(tileLayer);
                          tileLayer = null;
                      }
                      if (geoFenceLayerGroup) {
                          map.removeLayer(geoFenceLayerGroup);
                          geoFenceLayerGroup = null;
                      }
                      
                      // Clear geofence references
                      geoFenceLayers = {};
                      
                      // Remove the map instance
                      map.remove();
                      map = null;
                  }
                  mapInitialized = false;
              } catch (error) {
                  console.error('Error cleaning up map:', error);
              }
          }
          
          let lastUserLatLng = null;
          let currentTileStyle = 'streets';

          // Tile styles definition using reliable open access providers
          const TILE_STYLES = {
              streets: {
                  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  attribution: '© OpenStreetMap contributors',
                  maxZoom: 19
              },
              satellite: {
                  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                  attribution: '© Esri, Maxar, Earthstar Geographics',
                  maxZoom: 19
              },
              satelliteStreets: {
                  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                  attribution: '© Esri, Maxar, Earthstar Geographics',
                  maxZoom: 19
              },
              outdoors: {
                  url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                  attribution: '© OpenTopoMap contributors',
                  maxZoom: 17
              },
              light: {
                  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                  attribution: '© OpenStreetMap, © CARTO',
                  maxZoom: 19
              },
              dark: {
                  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                  attribution: '© OpenStreetMap, © CARTO',
                  maxZoom: 19
              }
          };

          function setStyle(styleKey) {
              try {
                  const key = String(styleKey || 'streets').toLowerCase();
                  let matched = TILE_STYLES.streets;
                  if (key.includes('sat')) {
                      matched = TILE_STYLES.satellite;
                  } else if (key.includes('out') || key.includes('topo')) {
                      matched = TILE_STYLES.outdoors;
                  } else if (key.includes('dark')) {
                      matched = TILE_STYLES.dark;
                  } else if (key.includes('light')) {
                      matched = TILE_STYLES.light;
                  }
                  currentTileStyle = styleKey;
                  changeTileProvider(matched.url, matched.attribution, matched.maxZoom);
              } catch (e) {
                  console.error('setStyle error:', e);
              }
          }

          // Update location marker with pulsing dot
          function updateLocation(lat, lng, accuracy, zoom, forceCenter) {
              try {
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                  if (!map || !mapInitialized) {
                      window._pendingLocation = { lat, lng, accuracy, zoom, forceCenter };
                      return;
                  }
                  
                  const latlng = L.latLng(lat, lng);
                  lastUserLatLng = latlng;
                  
                  // Remove existing markers
                  if (locationMarker) {
                      map.removeLayer(locationMarker);
                      locationMarker = null;
                  }
                  if (accuracyCircle) {
                      map.removeLayer(accuracyCircle);
                      accuracyCircle = null;
                  }
                  
                  // Add accuracy circle if accuracy is available
                  if (accuracy && accuracy > 0) {
                      accuracyCircle = L.circle(latlng, {
                          radius: Math.min(accuracy, 200),
                          className: 'accuracy-circle'
                      }).addTo(map);
                  }
                  
                  // Add pulsing location marker
                  const customIcon = L.divIcon({
                      html: '<div class="user-marker-container"><div class="location-marker-pulse"></div><div class="location-marker"></div></div>',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                      className: ''
                  });
                  
                  locationMarker = L.marker(latlng, { icon: customIcon, zIndexOffset: 1000 }).addTo(map);
                  
                  // Center map if requested or initial
                  if (forceCenter || !window._hasCenteredOnce) {
                      map.setView(latlng, zoom || 15);
                      window._hasCenteredOnce = true;
                  }
                  
              } catch (error) {
                  console.error('Error updating location:', error);
              }
          }
          
          // Change tile provider
          function changeTileProvider(url, attribution, maxZoom) {
              try {
                  if (!map || !mapInitialized) return;
                  
                  if (tileLayer) {
                      map.removeLayer(tileLayer);
                      tileLayer = null;
                  }
                  
                  tileLayer = L.tileLayer(url, {
                      attribution: attribution || '',
                      maxZoom: maxZoom || 19,
                      subdomains: 'abc'
                  }).addTo(map);
                  
                  if (tileLayer.bringToBack) {
                      tileLayer.bringToBack();
                  }
                  
              } catch (error) {
                  console.error('Error changing tile provider:', error);
              }
          }

          // Render routes with turn-by-turn lines and pins
          function renderRoutes(routes, selectedIndex, waypoints) {
              try {
                  if (!map || !mapInitialized) {
                      window._pendingRoute = { routes, selectedIndex, waypoints };
                      return;
                  }

                  clearRoutes();

                  if (!Array.isArray(routes) || routes.length === 0) return;

                  const allPoints = [];

                  routes.forEach((route, idx) => {
                      const isSelected = idx === (selectedIndex || 0);
                      const coords = route?.geometry?.coordinates;
                      if (!Array.isArray(coords) || coords.length === 0) return;

                      // GeoJSON has [lng, lat] -> convert to Leaflet [lat, lng]
                      const latLngs = coords.map(c => [c[1], c[0]]);
                      allPoints.push(...latLngs);

                      // Casing / glow line
                      L.polyline(latLngs, {
                          color: isSelected ? '#1e3a8a' : '#64748b',
                          weight: isSelected ? 8 : 4,
                          opacity: 0.7,
                          lineCap: 'round',
                          lineJoin: 'round'
                      }).addTo(routeLayerGroup);

                      // Primary line
                      L.polyline(latLngs, {
                          color: isSelected ? '#3b82f6' : '#94a3b8',
                          weight: isSelected ? 5 : 3,
                          opacity: 0.95,
                          lineCap: 'round',
                          lineJoin: 'round'
                      }).addTo(routeLayerGroup);

                      // Start & End markers for the selected route
                      if (isSelected && latLngs.length > 0) {
                          const startPt = latLngs[0];
                          const startIcon = L.divIcon({
                              html: '<div style="background:#16a34a;color:#ffffff;font-weight:bold;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:12px;font-family:sans-serif;">S</div>',
                              iconSize: [28, 28],
                              iconAnchor: [14, 14],
                              className: ''
                          });
                          L.marker(startPt, { icon: startIcon, zIndexOffset: 800 }).addTo(routeLayerGroup);

                          const endPt = latLngs[latLngs.length - 1];
                          const endIcon = L.divIcon({
                              html: '<div style="background:#dc2626;color:#ffffff;font-weight:bold;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:12px;font-family:sans-serif;">E</div>',
                              iconSize: [28, 28],
                              iconAnchor: [14, 14],
                              className: ''
                          });
                          L.marker(endPt, { icon: endIcon, zIndexOffset: 800 }).addTo(routeLayerGroup);
                      }
                  });

                  // Render intermediate waypoints if provided
                  if (Array.isArray(waypoints)) {
                      waypoints.forEach((wp, i) => {
                          if (!wp || !Number.isFinite(wp.latitude) || !Number.isFinite(wp.longitude)) return;
                          if (wp.kind === 'start' || wp.kind === 'end') return; // already rendered
                          const wpIcon = L.divIcon({
                              html: '<div style="background:#2563eb;color:#ffffff;font-weight:bold;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.3);font-size:11px;font-family:sans-serif;">' + (wp.label || (i + 1)) + '</div>',
                              iconSize: [24, 24],
                              iconAnchor: [12, 12],
                              className: ''
                          });
                          L.marker([wp.latitude, wp.longitude], { icon: wpIcon, zIndexOffset: 700 }).addTo(routeLayerGroup);
                      });
                  }

                  // Fit route bounds nicely
                  if (allPoints.length > 0) {
                      try {
                          map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50], maxZoom: 16 });
                      } catch (e) {
                          console.warn('fitBounds error:', e);
                      }
                  }
              } catch (e) {
                  console.error('renderRoutes error:', e);
              }
          }

          function clearRoutes() {
              try {
                  if (routeLayerGroup) {
                      routeLayerGroup.clearLayers();
                  }
              } catch (e) {
                  console.error('clearRoutes error:', e);
              }
          }

          function renderPOIs(pois) {
              try {
                  if (!map || !mapInitialized) return;
                  if (!poiLayerGroup) {
                      poiLayerGroup = L.layerGroup().addTo(map);
                  }
                  poiLayerGroup.clearLayers();
                  
                  if (!Array.isArray(pois)) return;
                  
                  pois.forEach(poi => {
                      let emoji = '📍';
                      let label = 'POI';
                      if (poi.type === 'hill') { emoji = '⛰️'; label = 'Hill'; }
                      else if (poi.type === 'lake') { emoji = '🌊'; label = 'Lake'; }
                      else if (poi.type === 'hospital') { emoji = '🏥'; label = 'Hospital'; }
                      else if (poi.type === 'police') { emoji = '🚓'; label = 'Police'; }
                      
                      const name = poi.tags?.name || label;
                      const icon = L.divIcon({
                          html: '<div style="font-size: 20px; text-shadow: 0 0 2px white; text-align: center;">' + emoji + '</div>',
                          iconSize: [24, 24],
                          iconAnchor: [12, 12],
                          className: ''
                      });
                      const marker = L.marker([poi.lat, poi.lon], { icon, zIndexOffset: 600 }).addTo(poiLayerGroup);
                      marker.bindPopup('<b>' + name + '</b><br/>' + poi.type);
                  });
              } catch (e) {
                  console.error('Error rendering POIs:', e);
              }
          }

          // Unified message handler for messages from React Native (support both Android, iOS, and Web)
          function handleMessageEvent(event) {
              try {
                  const payload = event && event.data ? event.data : event;
                  const data = typeof payload === 'string' ? JSON.parse(payload) : (payload && payload.data ? JSON.parse(payload.data) : payload);

                  switch (data.type) {
                      case 'updateLocation':
                          updateLocation(
                              data.latitude ?? data.lat,
                              data.longitude ?? data.lng,
                              data.accuracy,
                              data.zoomLevel,
                              !!data.forceCenter
                          );
                          break;
                      case 'setLocation':
                          if (data.location) {
                              updateLocation(
                                  data.location.latitude ?? data.location.lat,
                                  data.location.longitude ?? data.location.lng,
                                  data.location.accuracy || 0,
                                  data.zoomLevel || 15,
                                  true
                              );
                          }
                          break;
                      case 'setStyle':
                          if (data.style) {
                              setStyle(data.style);
                          }
                          break;
                      case 'setRoute':
                          if (data.route) {
                              renderRoutes([data.route], 0, data.waypoints);
                          } else if (data.routes) {
                              renderRoutes(data.routes, data.selectedIndex || 0, data.waypoints);
                          }
                          break;
                      case 'clearRoute':
                          clearRoutes();
                          break;
                      case 'changeTileProvider':
                          changeTileProvider(data.url, data.attribution);
                          break;
                      case 'setGeoFences':
                      case 'updateGeoFences':
                          console.log('Received geofences update:', data.fences ? data.fences.length : 0, 'items');
                          renderGeoFences(data.fences || []);
                          break;
                      case 'clearGeoFences':
                          clearAllGeoFences();
                          break;
                      case 'removeGeoFence':
                          if (data.fenceId) {
                              removeGeoFence(data.fenceId);
                          }
                          break;
                      case 'recenter':
                          if (lastUserLatLng) {
                              map.setView(lastUserLatLng, map.getZoom() || 15);
                          }
                          break;
                      case 'updateUserTracking':
                          if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
                              updateLocation(data.lat, data.lng, 10, map.getZoom() || 15, true);
                          }
                          break;
                      case 'startTracking':
                          break;
                      case 'setPOIs':
                          renderPOIs(data.pois || []);
                          break;
                      case 'UPDATE_EMERGENCY_VEHICLE':
                          if (data.data && data.data.location) {
                              renderEmergencyVehicle(data.data);
                          }
                          break;
                      case 'FAMILY_LOCATION_UPDATE':
                          renderFamilyMember(data.data || data);
                          break;
                      case 'SET_FAMILY_LOCATIONS':
                          if (Array.isArray(data.locations)) {
                              Object.values(familyMarkers).forEach(function(m) { if (m) map.removeLayer(m); });
                              familyMarkers = {};
                              data.locations.forEach(function(loc) { renderFamilyMember(loc); });
                          }
                          break;
                      default:
                          console.log('Unknown message type:', data.type);
                  }
              } catch (error) {
                  console.error('Error handling message:', error);
              }
          }

          let emergencyMarkers = {};
          function renderEmergencyVehicle(vehicle) {
              const vehicleId = vehicle.vehicleId;
              const location = vehicle.location;
              if (!vehicleId || !location) return;

              if (!map || !mapInitialized) return;

              if (emergencyMarkers[vehicleId]) {
                  emergencyMarkers[vehicleId].setLatLng([location.lat, location.lng]);
              } else {
                  let emoji = '🚨'; // default
                  if (vehicle.type === 'ambulance') emoji = '🚑';
                  else if (vehicle.type === 'fire') emoji = '🚒';
                  else if (vehicle.type === 'police') emoji = '🚓';
                  
                  const customIcon = L.divIcon({
                      html: '<div style="font-size: 36px; text-shadow: 0 0 15px red; line-height: 1;">' + emoji + '</div>',
                      iconSize: [40, 40],
                      iconAnchor: [20, 20],
                      className: 'emergency-vehicle-marker'
                  });
                  
                  emergencyMarkers[vehicleId] = L.marker([location.lat, location.lng], { icon: customIcon, zIndexOffset: 9999 })
                      .addTo(map)
                      .bindPopup('<b>Emergency Vehicle</b><br/>' + vehicleId);
              }
          }

          let familyMarkers = {};
          function renderFamilyMember(data) {
              if (!map || !mapInitialized) return;
              const sharerId = data.sharerId;
              if (!sharerId) return;

              if (data.active === false) {
                  if (familyMarkers[sharerId]) {
                      map.removeLayer(familyMarkers[sharerId]);
                      delete familyMarkers[sharerId];
                  }
                  return;
              }

              const lat = Number(data.location?.lat ?? data.lat);
              const lng = Number(data.location?.lng ?? data.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

              const name = data.name || 'Circle Member';

              if (familyMarkers[sharerId]) {
                  familyMarkers[sharerId].setLatLng([lat, lng]);
                  const tagEl = familyMarkers[sharerId].getElement()?.querySelector('.family-name-tag');
                  if (tagEl) tagEl.textContent = name;
              } else {
                  const customIcon = L.divIcon({
                      html: '<div class="family-marker-wrapper">' +
                            '<div class="family-pulse"></div>' +
                            '<div class="family-dot"></div>' +
                            '<div class="family-name-tag">' + name + '</div>' +
                            '</div>',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                      className: ''
                  });

                  const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 950 }).addTo(map);
                  marker.bindPopup('<b>' + name + '</b><br/><span style="color:#10b981">🟢 Sharing Live Location</span>');
                  familyMarkers[sharerId] = marker;
              }
          }

          // Attach handler for both document (Android) and window (iOS)
          document.addEventListener && document.addEventListener('message', handleMessageEvent);
          window.addEventListener && window.addEventListener('message', handleMessageEvent);
          
          // Single initialization call with proper order
          let initAttempts = 0;
          const maxInitAttempts = 30; // Increased timeout for better network handling
          
          function tryInitMap() {
              if (mapInitialized) {
                  return;
              }
              
              if (typeof L !== 'undefined' && typeof turf !== 'undefined' && document.getElementById('map')) {
                  initMap();
              } else if (initAttempts < maxInitAttempts) {
                  initAttempts++;
                  setTimeout(tryInitMap, 200); // Increased interval for slower networks
                  
                  // Log what's missing for debugging
                  if (initAttempts % 5 === 0) {
                      const missing = [];
                      if (typeof L === 'undefined') missing.push('Leaflet');
                      if (typeof turf === 'undefined') missing.push('Turf.js');
                      if (!document.getElementById('map')) missing.push('DOM element');
                      console.log('Waiting for:', missing.join(', '), '- Attempt', initAttempts, '/', maxInitAttempts);
                  }
              } else {
                  console.error('Failed to initialize map after maximum attempts. Missing dependencies or DOM element.');
                  window.ReactNativeWebView?.postMessage(JSON.stringify({
                      type: 'error',
                      message: 'Map initialization timeout - check network connection and try again'
                  }));
              }
          }
          
          // Initialize when DOM is ready
          if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', tryInitMap);
          } else {
              tryInitMap();
          }
          
          // Cleanup on page unload
          window.addEventListener('beforeunload', function() {
              cleanupMap();
          });
      </script>
  </body>
  </html>
  `;
};