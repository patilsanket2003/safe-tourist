/**
 * Map Tracking Enhancement
 * Additional JavaScript to inject into the map for path deviation tracking
 */

export const getTrackingEnhancementScript = (): string => {
  return `
    // Path Deviation Tracking State
    let trackingActive = false;
    let lastTrackedLocation = null;
    let deviationCircle = null;
    let userTrailLine = null;
    let userTrailPoints = [];
    
    /**
     * Initialize tracking visualization
     */
    function initializeTracking() {
      // Add source for user trail (breadcrumb trail)
      if (!map.getSource('user-trail')) {
        map.addSource('user-trail', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });

        // User trail line (blue trail behind user)
        map.addLayer({
          id: 'user-trail-line',
          type: 'line',
          source: 'user-trail',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 4,
            'line-opacity': 0.6
          }
        });
      }

      // Add source for deviation circle
      if (!map.getSource('deviation-circle')) {
        map.addSource('deviation-circle', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        });

        // Deviation warning circle (red circle when off-route)
        map.addLayer({
          id: 'deviation-circle-layer',
          type: 'circle',
          source: 'deviation-circle',
          paint: {
            'circle-radius': 50,
            'circle-color': '#DC2626',
            'circle-opacity': 0.2,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#DC2626',
            'circle-stroke-opacity': 0.8
          }
        });
      }

      // No extra marker here: keep a single location marker from the base map layer.
    }

    /**
     * Start tracking mode
     */
    function startTracking() {
      trackingActive = true;
      initializeTracking();
      userTrailPoints = [];
      console.log('[Map] Tracking mode activated');
    }

    /**
     * Stop tracking mode
     */
    function stopTracking() {
      trackingActive = false;
      lastTrackedLocation = null;
      hideDeviationCircle();
      clearUserTrail();
      console.log('[Map] Tracking mode deactivated');
    }

    /**
     * Update user tracking position
     */
    function updateUserTracking(lng, lat, bearing, speed) {
      if (!trackingActive) return;

      lastTrackedLocation = { lng, lat };

      // Add to trail
      userTrailPoints.push([lng, lat]);
      if (userTrailPoints.length > 100) {
        userTrailPoints.shift(); // Keep last 100 points
      }

      // Update trail line
      const trailSource = map.getSource('user-trail');
      if (trailSource) {
        trailSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: userTrailPoints
          }
        });
      }

      // Smoothly follow user (don't jump camera too aggressively)
      const currentCenter = map.getCenter();
      const distance = turf.distance(
        [currentCenter.lng, currentCenter.lat],
        [lng, lat],
        { units: 'meters' }
      );

      // Only recenter if user moves more than 100 meters from center
      if (distance > 100) {
        map.easeTo({
          center: [lng, lat],
          duration: 1000,
          essential: true
        });
      }
    }

    /**
     * Show deviation warning circle
     */
    function showDeviationCircle(lng, lat, radius) {
      const deviationSource = map.getSource('deviation-circle');
      if (deviationSource) {
        // Create circle using turf
        const center = turf.point([lng, lat]);
        const buffered = turf.buffer(center, radius / 1000, { units: 'kilometers' });
        
        deviationSource.setData(buffered);
        
        // Make layer visible
        map.setLayoutProperty('deviation-circle-layer', 'visibility', 'visible');
      }
    }

    /**
     * Hide deviation circle
     */
    function hideDeviationCircle() {
      if (map.getLayer('deviation-circle-layer')) {
        map.setLayoutProperty('deviation-circle-layer', 'visibility', 'none');
      }
    }

    /**
     * Clear user trail
     */
    function clearUserTrail() {
      userTrailPoints = [];
      const trailSource = map.getSource('user-trail');
      if (trailSource) {
        trailSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        });
      }
    }

    /**
     * Re-center map on user's current location
     */
    function recenterOnUser() {
      if (!trackingActive || !lastTrackedLocation) {
        return;
      }

      map.easeTo({
        center: [lastTrackedLocation.lng, lastTrackedLocation.lat],
        zoom: 16,
        duration: 800,
        essential: true
      });
      console.log('[Map] Re-centered on user location');
    }

    /**
     * Highlight route probability
     */
    function highlightRouteProbability(routeIndex, probability) {
      // Update route opacity based on probability
      // This would update the route layer to show which route the user is likely on
      // Implementation depends on how routes are stored
    }

    // Add separate message handler for tracking commands
    // This is added as a NEW listener, not overriding the original
    function handleTrackingMessage(event) {
      try {
        const data = JSON.parse(event.data);
        
        // Only handle tracking-related messages
        const trackingTypes = ['startTracking', 'stopTracking', 'updateUserTracking', 
                               'showDeviation', 'hideDeviation', 'clearTrail', 'recenterOnUser'];
        
        if (!trackingTypes.includes(data.type)) {
          return; // Let other handlers deal with non-tracking messages
        }
        
        // Debug logging for tracking messages
        console.log('[Map Tracking] Received:', data.type, data.lat?.toFixed(4), data.lng?.toFixed(4));
        
        switch (data.type) {
          case 'startTracking':
            console.log('[Map Tracking] Starting tracking mode...');
            startTracking();
            break;
          case 'stopTracking':
            stopTracking();
            break;
          case 'updateUserTracking':
            console.log('[Map Tracking] Updating position:', data.lat, data.lng, 'active:', trackingActive);
            updateUserTracking(
              data.lng, 
              data.lat, 
              data.bearing, 
              data.speed
            );
            break;
          case 'showDeviation':
            showDeviationCircle(data.lng, data.lat, data.radius || 50);
            break;
          case 'hideDeviation':
            hideDeviationCircle();
            break;
          case 'clearTrail':
            clearUserTrail();
            break;
          case 'recenterOnUser':
            recenterOnUser();
            break;
        }
      } catch(e) {
        // Silently ignore parse errors - let the main handler deal with them
      }
    }
    
    // Register the tracking message handler
    document.addEventListener('message', handleTrackingMessage);
    window.addEventListener('message', handleTrackingMessage);
    console.log('[Map Tracking] Handler registered');

  `;
};
