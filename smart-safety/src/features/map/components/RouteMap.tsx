import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Route, RouteCoordinate } from '../services/mapboxDirectionsService';
import { MAPBOX_ACCESS_TOKEN } from '../../../config';

interface RouteMapProps {
  origin: RouteCoordinate | null;
  destination: RouteCoordinate | null;
  routes: Route[];
  selectedRouteIndex: number;
  onRouteSelect?: (index: number) => void;
  height?: number;
}

export default function RouteMap({
  origin,
  destination,
  routes,
  selectedRouteIndex,
  onRouteSelect,
  height = 400
}: RouteMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  // Generate HTML with route display capabilities
  const generateRouteMapHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Route Map</title>
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.css" rel="stylesheet" />
    <script src="https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [78.9629, 20.5937],
            zoom: 12
        });

        let originMarker = null;
        let destinationMarker = null;

        map.on('load', function () {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'mapReady' }));

            // Add sources for routes
            map.addSource('routes', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add layer for non-selected routes (gray)
            map.addLayer({
                id: 'routes-alternate',
                type: 'line',
                source: 'routes',
                paint: {
                    'line-color': '#9ca3af',
                    'line-width': 6,
                    'line-opacity': 0.5
                },
                filter: ['!=', ['get', 'selected'], true]
            });

            // Add layer for selected route (blue)
            map.addLayer({
                id: 'routes-selected',
                type: 'line',
                source: 'routes',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 8,
                    'line-opacity': 0.9
                },
                filter: ['==', ['get', 'selected'], true]
            });

            // Make alternate routes clickable
            map.on('click', 'routes-alternate', function (e) {
                const routeIndex = e.features[0].properties.routeIndex;
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                    type: 'routeSelected',
                    routeIndex: routeIndex
                }));
            });

            // Change cursor on hover
            map.on('mouseenter', 'routes-alternate', function () {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'routes-alternate', function () {
                map.getCanvas().style.cursor = '';
            });
        });

        // Message handler
        function handleMessageEvent(event) {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'setOrigin':
                    setOrigin(data.latitude, data.longitude);
                    break;
                case 'setDestination':
                    setDestination(data.latitude, data.longitude);
                    break;
                case 'setRoutes':
                    renderRoutes(data.routes, data.selectedIndex);
                    break;
                case 'fitBounds':
                    fitToBounds(data.bounds);
                    break;
            }
        }

        document.addEventListener('message', handleMessageEvent);
        window.addEventListener('message', handleMessageEvent);

        function setOrigin(lat, lng) {
            if (originMarker) {
                originMarker.setLngLat([lng, lat]);
            } else {
                const el = document.createElement('div');
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.borderRadius = '50%';
                el.style.background = '#22c55e';
                el.style.border = '4px solid white';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                originMarker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
            }
        }

        function setDestination(lat, lng) {
            if (destinationMarker) {
                destinationMarker.setLngLat([lng, lat]);
            } else {
                const el = document.createElement('div');
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.borderRadius = '50%';
                el.style.background = '#ef4444';
                el.style.border = '4px solid white';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                destinationMarker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
            }
        }

        function renderRoutes(routes, selectedIndex) {
            if (!routes || routes.length === 0) return;

            const features = routes.map((route, index) => ({
                type: 'Feature',
                geometry: route.geometry,
                properties: {
                    routeIndex: index,
                    selected: index === selectedIndex,
                    distance: route.distance,
                    duration: route.duration
                }
            }));

            const geojson = {
                type: 'FeatureCollection',
                features: features
            };

            const source = map.getSource('routes');
            if (source) {
                source.setData(geojson);
            }
        }

        function fitToBounds(bounds) {
            if (!bounds) return;
            
            map.fitBounds([
                [bounds.minLng, bounds.minLat],
                [bounds.maxLng, bounds.maxLat]
            ], {
                padding: 60,
                duration: 1000
            });
        }
    </script>
</body>
</html>
    `;
  };

  // Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'mapReady':
          setMapReady(true);
          break;
        case 'routeSelected':
          if (onRouteSelect) {
            onRouteSelect(message.routeIndex);
          }
          break;
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  };

  // Update origin marker
  useEffect(() => {
    if (mapReady && origin && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setOrigin',
        latitude: origin.latitude,
        longitude: origin.longitude
      }));
    }
  }, [mapReady, origin]);

  // Update destination marker
  useEffect(() => {
    if (mapReady && destination && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setDestination',
        latitude: destination.latitude,
        longitude: destination.longitude
      }));
    }
  }, [mapReady, destination]);

  // Update routes
  useEffect(() => {
    if (mapReady && routes.length > 0 && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setRoutes',
        routes: routes,
        selectedIndex: selectedRouteIndex
      }));

      // Fit to show entire route
      const selectedRoute = routes[selectedRouteIndex];
      if (selectedRoute) {
        const coords = selectedRoute.geometry.coordinates;
        let minLng = coords[0][0];
        let maxLng = coords[0][0];
        let minLat = coords[0][1];
        let maxLat = coords[0][1];

        coords.forEach(([lng, lat]) => {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });

        webViewRef.current.postMessage(JSON.stringify({
          type: 'fitBounds',
          bounds: { minLat, maxLat, minLng, maxLng }
        }));
      }
    }
  }, [mapReady, routes, selectedRouteIndex]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateRouteMapHTML() }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  webView: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
});
