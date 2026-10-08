import React, { useEffect, useState } from 'react'
import IncidentReportModal from '../../report/components/IncidentReportModal'
import { View, StyleSheet, Dimensions, Alert, StatusBar, Text, Platform } from 'react-native'
import * as Location from 'expo-location'
import { WebView } from 'react-native-webview'
import { GeoFence, haversineKm } from '../../../utils/geofenceLogic'
import { useApp } from '../../../context/AppContext'
import { useLocation } from '../../../context/LocationContext'
import { usePathDeviation } from '../../../context/PathDeviationContext'
import { reverseGeocode } from '../../map/components/MapboxMap/geoUtils'
import { loadFences } from '../../map/services/geofenceService'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  Route,
  RouteCoordinate,
  RoutingProfile,
  fetchDirectionsForWaypoints,
} from '../../map/services/mapboxDirectionsService'
import { fetchPOIsAlongRoute, POI } from '../../map/services/overpassService'


// Import map components
import MapContainer from '../../map/components/MapboxMap/MapContainer'
import { WebViewMessage } from '../../map/components/MapboxMap/types'
import touristSocketService from '../../../services/touristSocketService'
import { showToast } from '../../../utils/toast'

// Import overlay UI components
import DaminiAssistant from '../../ai/components/DaminiAssistant'
import {
  TopLocationCard,
  WarningBanner,
  RightActionButtons,
  MapBottomSheet,
  StyleBottomSheet,
  DirectionsBottomSheet,
  LegendBottomSheet
  
} from '../../map/components/MapboxMap/ui'
import DirectionsTopPanel from '../../map/components/MapboxMap/ui/DirectionsTopPanel'
import NavigationView from '../../../components/NavigationView'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

// Configuration for auto-refresh
const REFRESH_INTERVAL_MS = 60000 // 60 seconds

export default function EmergencyScreen({ navigation }: any) {
  const { state } = useApp()
  const { currentLocation, setCurrentLocation, setCurrentAddress } = useLocation()
  const { isTracking, setMapRef, startJourney } = usePathDeviation()

  // Map state
  const [mapReady, setMapReady] = useState(false)
  const [webViewKey, setWebViewKey] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState('streets')
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [loadingGeofences, setLoadingGeofences] = useState(false)

  // UI state
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const [showWarningBanner, setShowWarningBanner] = useState(true)
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [isStyleSheetExpanded, setIsStyleSheetExpanded] = useState(false)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const [isLegendExpanded, setIsLegendExpanded] = useState(false)
  const [showHazards, setShowHazards] = useState(true)

  // Directions Mode State
  const [directionsMode, setDirectionsMode] = useState(false)
  const [allRoutes, setAllRoutes] = useState<Route[]>([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [currentProfile, setCurrentProfile] = useState<RoutingProfile>('driving')
  const [isDirectionsSheetVisible, setIsDirectionsSheetVisible] = useState(false)
  const [itineraryRoute, setItineraryRoute] = useState<Route | null>(null)
  const [itineraryWaypoints, setItineraryWaypoints] = useState<any[]>([])

  const itineraryRouteKeyRef = React.useRef<string | null>(null)
  const autoStartInFlightRef = React.useRef(false)
  const lastStartedRouteKeyRef = React.useRef<string | null>(null)
  const lastFailedRouteKeyRef = React.useRef<string | null>(null)
  const itineraryProfile: RoutingProfile = 'driving'

  const currentRoute = allRoutes[selectedRouteIndex] || null
  
  const activeRouteRef = React.useRef(currentRoute || itineraryRoute)
  useEffect(() => {
    activeRouteRef.current = currentRoute || itineraryRoute
  }, [currentRoute, itineraryRoute])
  const activeTrip = React.useMemo(() => selectActiveTrip(state.trips), [state.trips])
  const autoStartSource: 'directions' | 'itinerary' | null =
    directionsMode && currentRoute ? 'directions' : itineraryRoute ? 'itinerary' : null
  const autoStartRoute = autoStartSource === 'directions' ? currentRoute : itineraryRoute
  const autoStartProfile = autoStartSource === 'directions' ? currentProfile : itineraryProfile

  // Geofences
  const [geoFences, setGeoFences] = useState<GeoFence[]>([])
  const [dangerZoneCount, setDangerZoneCount] = useState(0)
  const [riskGridCount, setRiskGridCount] = useState(0)
  const [geofenceCount, setGeofenceCount] = useState(0)

  // POIs and Terrain Notification
  const [routePOIs, setRoutePOIs] = useState<POI[]>([])
  const [upcomingTerrain, setUpcomingTerrain] = useState<{type: string, name: string, distanceKm: number} | null>(null)

  const webViewRef = React.useRef<WebView>(null)

  // Set map reference for path deviation tracking AFTER map is ready
  useEffect(() => {
    if (mapReady && webViewRef.current) {
      setMapRef(webViewRef)
    }
    return () => {
      setMapRef(null)
    }
  }, [setMapRef, mapReady])

  // Load geofences on mount using service (tries server first, then bundled)
  useEffect(() => {
    const loadGeoFencesFromService = async () => {
      setLoadingGeofences(true)
      try {
        const userId = state.user?.touristId
        const fences = await loadFences(undefined, undefined, userId)
        setGeoFences(fences)
      } catch (err) {
        console.warn('Failed to load geofences:', err)
        setGeoFences([])
      } finally {
        setLoadingGeofences(false)
      }
    }
    loadGeoFencesFromService()
  }, [])

  // Live GPS tracking: watch real-time position and stream to backend & map
  useEffect(() => {
    let watchId: any = null;
    let sub: any = null;

    const handleNewPos = (lat: number, lng: number, accuracy?: number | null, speed?: number | null, heading?: number | null, timestamp?: number) => {
      const loc = {
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy ?? 5,
          speed: speed ?? null,
          heading: heading ?? null,
          altitude: null,
          altitudeAccuracy: null,
        },
        timestamp: timestamp || Date.now(),
      };
      setCurrentLocation(loc);

      // Send to backend via Socket.IO
      touristSocketService.updateLocation({
        lat,
        lng,
        accuracy,
        speed,
        heading,
        timestamp: new Date(loc.timestamp).toISOString(),
      });

      // Update map marker
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'updateLocation',
            latitude: lat,
            longitude: lng,
            accuracy: accuracy || 5,
          })
        );
      }
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      console.log('📍 Starting HTML5 GPS watch in Chrome/Web');
      navigator.geolocation.getCurrentPosition(
        (pos) => handleNewPos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed, pos.coords.heading, pos.timestamp),
        (err) => {
          console.warn('HTML5 Geo error (HTTP origin blocked in Chrome):', err);
          // Only fall back if no valid position has been obtained yet
          if (!currentLocation?.coords) {
            handleNewPos(19.0760, 72.8777, 10, 0, 0);
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
      watchId = navigator.geolocation.watchPosition(
        (pos) => handleNewPos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed, pos.coords.heading, pos.timestamp),
        (err) => console.warn('HTML5 watch error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    } else {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            sub = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 2000,
                distanceInterval: 1,
              },
              (loc) => handleNewPos(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy, loc.coords.speed, loc.coords.heading, loc.timestamp)
            );
          }
        } catch (e) {
          console.warn('Native Location watch error:', e);
        }
      })();
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
      if (sub && sub.remove) {
        sub.remove();
      }
    };
  }, [mapReady]);

  // Send geofences to WebView when ready
  useEffect(() => {
    if (!webViewRef.current || !mapReady) return

    try {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setGeoFences',
        fences: showHazards ? geoFences : []
      }))
    } catch (e) {
      console.warn('Failed to send geofences to WebView', e)
    }
  }, [mapReady, geoFences, showHazards])

  // Fetch POIs when route changes
  useEffect(() => {
    if (!autoStartRoute) {
      setRoutePOIs([]);
      return;
    }
    fetchPOIsAlongRoute(autoStartRoute).then(pois => {
      setRoutePOIs(pois);
    });
  }, [autoStartRoute]);

  // Send POIs to WebView
  useEffect(() => {
    if (!webViewRef.current || !mapReady || routePOIs.length === 0) return;
    try {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setPOIs',
        pois: routePOIs
      }));
    } catch (e) {
      console.warn('Failed to send POIs to WebView', e);
    }
  }, [mapReady, routePOIs]);

  // Terrain proximity detection
  useEffect(() => {
    if (!currentLocation || !routePOIs.length) {
      setUpcomingTerrain(null);
      return;
    }
    
    const lat = currentLocation.coords.latitude;
    const lng = currentLocation.coords.longitude;
    
    let nearest: POI | null = null;
    let minDistance = Infinity;
    
    routePOIs.forEach(poi => {
      const dist = haversineKm([lat, lng], [poi.lat, poi.lon]);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = poi;
      }
    });
    
    if (nearest && minDistance < 2.0) { // If within 2km
      setUpcomingTerrain({
        type: (nearest as any).type,
        name: (nearest as any).tags?.name || ((nearest as any).type === 'hill' ? 'Hill' : 'Lake'),
        distanceKm: minDistance
      });
    } else {
      setUpcomingTerrain(null);
    }
  }, [currentLocation, routePOIs]);

  // Update map when routes change
  useEffect(() => {
    if (!webViewRef.current || !mapReady) return

    if (directionsMode && allRoutes.length > 0) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setRoute',
        routes: allRoutes,
        selectedIndex: selectedRouteIndex,
        profile: currentProfile
      }))
      return
    }

    if (itineraryRoute || itineraryWaypoints.length > 0) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setRoute',
        routes: itineraryRoute ? [itineraryRoute] : [],
        selectedIndex: 0,
        profile: itineraryProfile,
        waypoints: itineraryWaypoints,
      }))
      return
    }

    webViewRef.current.postMessage(JSON.stringify({
      type: 'clearRoute'
    }))
  }, [allRoutes, selectedRouteIndex, currentProfile, itineraryRoute, itineraryWaypoints, itineraryProfile, directionsMode, mapReady])

  // Send location updates to WebView when current location changes
  useEffect(() => {
    const cleanup = touristSocketService.onEmergencyVehicleUpdate((data) => {
      console.log("[EmergencyScreen] Received emergencyVehicleUpdate:", data);
      
      if (webViewRef.current && mapReady) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'UPDATE_EMERGENCY_VEHICLE',
          data: data
        }))
      }

      // If the current user is not an emergency vehicle/admin, show a banner
      if (state.user?.role !== 'emergency_vehicle' && state.user?.role !== 'tour-admin') {
        if (currentLocation?.coords && data.location) {
          const R = 6371e3 // metres
          const φ1 = (currentLocation.coords.latitude * Math.PI) / 180
          const φ2 = (data.location.lat * Math.PI) / 180
          const Δφ = ((data.location.lat - currentLocation.coords.latitude) * Math.PI) / 180
          const Δλ = ((data.location.lng - currentLocation.coords.longitude) * Math.PI) / 180

          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const dist = R * c
          
          console.log(`[EmergencyScreen] Distance to emergency vehicle: ${dist}m`);

          // If within 2km, show toast
          if (dist < 2000) {
            let isOnRoute = false;
            
            // Check if user has an active route using the latest ref
            const activeRouteToCheck = activeRouteRef.current;
            
            if (!activeRouteToCheck) {
              console.log("[EmergencyScreen] No active route to check");
            } else if (!activeRouteToCheck.geometry || !activeRouteToCheck.geometry.coordinates) {
              console.log("[EmergencyScreen] Active route missing geometry.coordinates", activeRouteToCheck);
            } else {
               // Check if the emergency vehicle is close to any point on our route (within 150 meters)
               const routeCoords = activeRouteToCheck.geometry.coordinates;
               console.log(`[EmergencyScreen] Checking ${routeCoords.length} route coordinates`);
               for (let i = 0; i < routeCoords.length; i++) {
                 const [rLng, rLat] = routeCoords[i];
                 const rΦ1 = (rLat * Math.PI) / 180;
                 const rΦ2 = (data.location.lat * Math.PI) / 180;
                 const rΔφ = ((data.location.lat - rLat) * Math.PI) / 180;
                 const rΔλ = ((data.location.lng - rLng) * Math.PI) / 180;
                 const rA = Math.sin(rΔφ / 2) * Math.sin(rΔφ / 2) + Math.cos(rΦ1) * Math.cos(rΦ2) * Math.sin(rΔλ / 2) * Math.sin(rΔλ / 2);
                 const rC = 2 * Math.atan2(Math.sqrt(rA), Math.sqrt(1 - rA));
                 const distToRoute = R * rC;
                 
                 if (distToRoute < 150) {
                   isOnRoute = true;
                   console.log(`[EmergencyScreen] EV is ON ROUTE! Distance: ${distToRoute}m at index ${i}`);
                   break;
                 }
               }
            }

            const distStr = dist > 1000 ? `${(dist/1000).toFixed(1)}km` : `${Math.round(dist)}m`;
            
            if (isOnRoute) {
              showToast(`🚨 ${data.type ? data.type.toUpperCase() : 'EMERGENCY VEHICLE'} ON YOUR ROUTE! (${distStr} away) Please give way!`, 5000);
            } else {
              showToast(`🚨 Emergency Vehicle (${data.type || 'Police'}) nearby (${distStr} away)!`, 4000);
            }
          }
        } else {
          console.log("[EmergencyScreen] Missing currentLocation or data.location");
        }
      } else {
        console.log("[EmergencyScreen] User is emergency vehicle or admin, ignoring alert");
      }
    })
    
    return cleanup
  }, [mapReady, currentLocation, state.user?.role])

  useEffect(() => {
    if (mapReady && webViewRef.current && currentLocation) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'updateLocation',
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          heading: currentLocation.coords.heading || 0,
          isTracking: isTracking
        }),
      )
    }
  }, [currentLocation, mapReady, isTracking])

  // Heartbeat: Broadcast location every 5 seconds so new users joining late still receive it
  useEffect(() => {
    if (!currentLocation) return;
    
    const interval = setInterval(() => {
      touristSocketService.updateLocation({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        speed: currentLocation.coords.speed,
        heading: currentLocation.coords.heading,
        timestamp: new Date().toISOString()
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentLocation]);

  function getCurrentDayIndex(tripStartDate: string, totalDays: number): number {
    const tripStart = new Date(tripStartDate)
    const today = new Date()

    tripStart.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const daysDiff = Math.floor((today.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24))

    return Math.max(0, Math.min(daysDiff, totalDays - 1))
  }

  function selectActiveTrip(trips: any[]) {
    const tripsWithDays = (trips || []).filter((trip) => Array.isArray(trip?.dayWiseItinerary) && trip.dayWiseItinerary.length > 0)
    if (tripsWithDays.length === 0) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const trip of tripsWithDays) {
      const totalDays = trip.dayWiseItinerary.length
      const start = new Date(trip.date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + totalDays - 1)

      if (today >= start && today <= end) {
        return trip
      }
    }

    return tripsWithDays[0]
  }

  const toFiniteNumber = (value: any): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.trim())
      if (Number.isFinite(parsed)) return parsed
    }
    return null
  }

  const extractDayCoordinates = (nodes: any[]): RouteCoordinate[] => {
    return (nodes || [])
      .map((node) => {
        const locationCoords = Array.isArray(node?.location?.coordinates)
          ? node.location.coordinates
          : Array.isArray(node?.coordinates)
            ? node.coordinates
            : null

        const latitude = toFiniteNumber(
          node?.lat ?? node?.latitude ?? (locationCoords ? locationCoords[1] : null)
        )

        const longitude = toFiniteNumber(
          node?.lng ?? node?.longitude ?? (locationCoords ? locationCoords[0] : null)
        )

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

        return { latitude, longitude }
      })
      .filter((coord): coord is RouteCoordinate => !!coord)
  }

  const extractDayWaypoints = (nodes: any[]) => {
    let stopCounter = 1
    return (nodes || [])
      .map((node) => {
        const locationCoords = Array.isArray(node?.location?.coordinates)
          ? node.location.coordinates
          : Array.isArray(node?.coordinates)
            ? node.coordinates
            : null

        const latitude = toFiniteNumber(
          node?.lat ?? node?.latitude ?? (locationCoords ? locationCoords[1] : null)
        )

        const longitude = toFiniteNumber(
          node?.lng ?? node?.longitude ?? (locationCoords ? locationCoords[0] : null)
        )

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

        const kind: 'start' | 'end' | 'stop' = node?.type === 'start'
          ? 'start'
          : node?.type === 'end'
            ? 'end'
            : 'stop'

        const label = kind === 'start'
          ? 'Start'
          : kind === 'end'
            ? 'End'
            : `${stopCounter++}`

        return {
          latitude,
          longitude,
          label,
          kind,
          name: node?.name || '',
        }
      })
      .filter(Boolean)
  }

  const buildAutoStartRouteKey = (
    route: Route,
    source: 'directions' | 'itinerary',
  ): string | null => {
    const coords = route.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return null

    const first = coords[0]
    const last = coords[coords.length - 1]
    if (!first || !last) return null

    const [firstLng, firstLat] = first
    const [lastLng, lastLat] = last
    if (![firstLng, firstLat, lastLng, lastLat].every((value) => Number.isFinite(value))) {
      return null
    }

    return [
      source,
      route.distance.toFixed(2),
      route.duration.toFixed(2),
      `${firstLng.toFixed(6)},${firstLat.toFixed(6)}`,
      `${lastLng.toFixed(6)},${lastLat.toFixed(6)}`,
    ].join(':')
  }

  useEffect(() => {
    if (isTracking || !autoStartSource || !autoStartRoute) {
      return
    }

    if (autoStartInFlightRef.current) {
      return
    }

    const routeKey = buildAutoStartRouteKey(autoStartRoute, autoStartSource)
    if (!routeKey) {
      console.warn('[EmergencyScreen] Skipping auto-start: invalid route geometry')
      return
    }

    if (
      lastStartedRouteKeyRef.current === routeKey ||
      lastFailedRouteKeyRef.current === routeKey
    ) {
      return
    }

    const coords = autoStartRoute.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) {
      console.warn('[EmergencyScreen] Skipping auto-start: route has fewer than 2 coordinates')
      return
    }

    const origin = coords[0]
    const destination = coords[coords.length - 1]
    const travelMode =
      autoStartProfile === 'walking'
        ? 'walking'
        : autoStartProfile === 'cycling'
          ? 'cycling'
          : 'driving'

    autoStartInFlightRef.current = true
    ;(async () => {
      try {
        await startJourney(
          {
            origin: { lat: origin[1], lng: origin[0] },
            destination: { lat: destination[1], lng: destination[0] },
            travelMode,
          },
          autoStartRoute,
        )
        lastStartedRouteKeyRef.current = routeKey
        lastFailedRouteKeyRef.current = null
      } catch (error) {
        lastFailedRouteKeyRef.current = routeKey
        console.warn('[EmergencyScreen] Auto-start journey failed:', error)
      } finally {
        autoStartInFlightRef.current = false
      }
    })()
  }, [isTracking, autoStartSource, autoStartRoute, autoStartProfile, startJourney])

  useEffect(() => {
    if (!mapReady || directionsMode) return

    if (!activeTrip || !Array.isArray(activeTrip.dayWiseItinerary)) {
      setItineraryRoute(null)
      itineraryRouteKeyRef.current = null
      return
    }

    const totalDays = activeTrip.dayWiseItinerary.length
    const dayIndex = getCurrentDayIndex(activeTrip.date, totalDays)
    const day = activeTrip.dayWiseItinerary[dayIndex]
    let coordinates = extractDayCoordinates(day?.nodes)
    let waypoints = extractDayWaypoints(day?.nodes)

    // Route from tourist's actual CURRENT GPS location instead of a static/extra start point
    if (currentLocation?.coords) {
      const userCoord: RouteCoordinate = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      }
      const firstNodeIsStart = day?.nodes?.[0]?.type === 'start'
      if (firstNodeIsStart) {
        // Replace the static start coordinate with user's live position
        coordinates = [userCoord, ...coordinates.slice(1)]
        // Remove the extra 'S' marker so starting point is the user's blue live GPS dot
        waypoints = waypoints.filter((wp) => wp.kind !== 'start')
      } else if (coordinates.length > 0) {
        // Prepend current location as the starting point towards destination stops
        coordinates = [userCoord, ...coordinates]
      }
    }

    if (coordinates.length === 0 && waypoints.length === 0) {
      setItineraryRoute(null)
      itineraryRouteKeyRef.current = null
      setItineraryWaypoints([])
      return
    }

    const startCoordStr = currentLocation?.coords
      ? `${currentLocation.coords.longitude.toFixed(4)},${currentLocation.coords.latitude.toFixed(4)}`
      : 'static'
    const routeKey = `${activeTrip.id}:${dayIndex}:${startCoordStr}:${waypoints
      .map((wp) => `${wp.longitude.toFixed(5)},${wp.latitude.toFixed(5)}`)
      .join('|')}`

    if (routeKey === itineraryRouteKeyRef.current) return

    itineraryRouteKeyRef.current = routeKey

    if (coordinates.length < 2) {
      setItineraryRoute(null)
      setItineraryWaypoints(waypoints)

      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'setRoute',
          routes: [],
          selectedIndex: 0,
          profile: itineraryProfile,
          waypoints,
        }))
      }
      return
    }

    setItineraryWaypoints(waypoints)
    let cancelled = false

    const loadRoute = async () => {
      try {
        const response = await fetchDirectionsForWaypoints(
          coordinates,
          itineraryProfile,
          { alternatives: false, steps: true, geometries: 'geojson', overview: 'full' }
        )

        if (!cancelled) {
          setItineraryRoute(response.routes?.[0] || null)

          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'setRoute',
              routes: response.routes || [],
              selectedIndex: 0,
              profile: itineraryProfile,
              waypoints,
            }))
          }
        }
      } catch (error) {
        console.warn('[ItineraryRoute] Failed to load route:', error)
        if (!cancelled) {
          setItineraryRoute(null)
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'setRoute',
              routes: [],
              selectedIndex: 0,
              profile: itineraryProfile,
              waypoints,
            }))
          }
        }
      }
    }

    loadRoute()

    return () => {
      cancelled = true
    }
  }, [mapReady, directionsMode, activeTrip, itineraryProfile, currentLocation?.coords?.latitude, currentLocation?.coords?.longitude])

  // Calculate legend statistics whenever geofences change
  useEffect(() => {
    if (!Array.isArray(geoFences)) return

    const danger = geoFences.filter(f =>
      f.visualStyle?.zoneType === 'danger_zone' ||
      (f.category && f.category.toLowerCase().includes('danger'))
    ).length

    const risk = geoFences.filter(f =>
      f.visualStyle?.zoneType === 'risk_grid' ||
      f.category === 'Risk Grid'
    ).length

    const geofences = geoFences.filter(f =>
      f.visualStyle?.zoneType === 'geofence' ||
      f.visualStyle?.zoneType === 'itinerary_geofence' ||
      f.category === 'Tourist Destination' ||
      f.category === 'Itinerary Geofence' ||
      f.metadata?.sourceType === 'itinerary'
    ).length

    setDangerZoneCount(danger)
    setRiskGridCount(risk)
    setGeofenceCount(geofences)
  }, [geoFences])

  // Refresh geofences function
  const refreshGeofences = async () => {
    try {
      setIsBackgroundRefreshing(true)
      const userLat = currentLocation?.coords.latitude
      const userLng = currentLocation?.coords.longitude
      const userId = state.user?.touristId

      const fences = await loadFences(userLat, userLng, userId)
      setGeoFences(fences)
    } catch (err) {
      console.warn('Failed to refresh geofences:', err)
      // Don't show error to user - fail silently for background refresh
    } finally {
      setIsBackgroundRefreshing(false)
    }
  }

  // Set up auto-refresh polling
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshGeofences()
    }, REFRESH_INTERVAL_MS)

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId)
    }
  }, [currentLocation]) // Re-create interval if location changes

  const getCurrentLocation = async () => {
    setLoadingLocation(true)
    try {
      // Recenter quickly with last known location if available
      if (currentLocation?.coords && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'setLocation',
          location: currentLocation.coords,
          forceCenter: true,
        }))
      }

      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = {
                coords: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy || 10,
                  speed: pos.coords.speed || 0,
                  heading: pos.coords.heading || 0,
                  altitude: null,
                  altitudeAccuracy: null,
                },
                timestamp: pos.timestamp,
              };
              setCurrentLocation(loc);
              touristSocketService.updateLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: new Date().toISOString(),
              });
              webViewRef.current?.postMessage(JSON.stringify({
                type: 'setLocation',
                location: loc.coords,
                forceCenter: true,
              }));
              setLoadingLocation(false);
            },
            () => {
              // Insecure origin fallback
              const demoLoc = {
                coords: {
                  latitude: 19.0760,
                  longitude: 72.8777,
                  accuracy: 10,
                  speed: 0,
                  heading: 0,
                  altitude: null,
                  altitudeAccuracy: null,
                },
                timestamp: Date.now(),
              };
              setCurrentLocation(demoLoc);
              touristSocketService.updateLocation({
                lat: 19.0760,
                lng: 72.8777,
                accuracy: 10,
                timestamp: new Date().toISOString(),
              });
              webViewRef.current?.postMessage(JSON.stringify({
                type: 'setLocation',
                location: demoLoc.coords,
                forceCenter: true,
              }));
              setLoadingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
          return;
        }
      }

      // Check permission first (native)
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to use this feature',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
              onPress: async () => {
                await Location.requestForegroundPermissionsAsync()
              }
            }
          ]
        )
        setLoadingLocation(false)
        return
      }

      // Try fast last-known location first to reduce delay
      const lastKnown = await Location.getLastKnownPositionAsync()
      const location = lastKnown || await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      setCurrentLocation(location)

      // Reverse geocode
      const address = await reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      )
      if (address) {
        setCurrentAddress(address)
      }

      // Send to WebView
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'setLocation',
          location: location.coords,
          forceCenter: true,
        }))
      }
    } catch (err: any) {
      console.error('Location error:', err)
      Alert.alert('Location Error', err.message || 'Failed to get current location')
    } finally {
      setLoadingLocation(false)
    }
  }

  const handleWebViewMessage = (event: any) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data)

      switch (message.type) {
        case 'mapReady':
          setMapReady(true)
          break
        case 'mapClick':
          if (typeof (message as any).lat === 'number' && typeof (message as any).lng === 'number') {
            setCurrentLocation({
              coords: {
                latitude: (message as any).lat,
                longitude: (message as any).lng,
                accuracy: 5,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
              },
              timestamp: Date.now(),
            });
          }
          break
        case 'error':
          console.error('Map error:', message.message)
          break
        case 'routeSelected':
          if (directionsMode && message.index !== undefined) {
            setSelectedRouteIndex(message.index)
          }
          break
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err)
    }
  }

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style)
    setIsStyleSheetExpanded(false)

    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setStyle',
        style: style,
      }))
    }
  }

  const handleShareLocation = () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'Location not available yet')
      return
    }

    const { latitude, longitude } = currentLocation.coords
    const message = `My location: https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}`
    Alert.alert('Share Location', message)
  }

  const handleSOS = () => {
    setShowIncidentModal(true)
  }

  const handleIncidentSubmitted = () => {
    refreshGeofences()
  }

  const handleDirectionsPress = () => {
    // Enable Directions Mode
    setDirectionsMode(true)

    // Close other sheets
    setIsBottomSheetExpanded(false)
    setIsStyleSheetExpanded(false)
    setIsLegendExpanded(false)
    setShowWarningBanner(false)
  }

  const handleExitDirections = () => {
    setDirectionsMode(false)
    setAllRoutes([])
    setSelectedRouteIndex(0)
    setShowWarningBanner(true)
  }

  const wasTracking = React.useRef(isTracking);
  useEffect(() => {
    if (wasTracking.current && !isTracking) {
      handleExitDirections();
    }
    wasTracking.current = isTracking;
  }, [isTracking]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Full-screen Map */}
      <MapContainer
        webViewKey={webViewKey}
        height={SCREEN_HEIGHT}
        onWebViewMessage={handleWebViewMessage}
        webViewRef={webViewRef}
        isFullScreen={true}
      />

      {/* Conditional Top UI - Hide when navigation is active */}
      {!isTracking && directionsMode ? (
        <DirectionsTopPanel
          onBack={handleExitDirections}
          onRoutesCalculated={(routes, profile) => {
            setAllRoutes(routes)
            setSelectedRouteIndex(0)
            setCurrentProfile(profile)
          }}
          onClearRoute={() => {
            setAllRoutes([])
            setSelectedRouteIndex(0)
          }}
        />
      ) : !isTracking ? (
        <TopLocationCard />
      ) : null}

      {/* Terrain Notification */}
      {upcomingTerrain && (
        <View style={{
          position: 'absolute',
          top: 140,
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 100,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>
            {upcomingTerrain.type === 'hill' ? '⛰️' : 
             upcomingTerrain.type === 'lake' ? '🌊' : 
             upcomingTerrain.type === 'hospital' ? '🏥' : '🚓'}
          </Text>
          <View>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {upcomingTerrain.type === 'hill' ? 'Hilly Region Ahead' : 
               upcomingTerrain.type === 'lake' ? 'Water Body Ahead' : 
               upcomingTerrain.type === 'hospital' ? 'Hospital Nearby' : 'Police Station Nearby'}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 12 }}>
              {upcomingTerrain.name} • {(upcomingTerrain.distanceKm * 1000).toFixed(0)}m
            </Text>
          </View>
        </View>
      )}

      {/* Warning Banner (if applicable and not in directions mode) */}
      {showWarningBanner && !directionsMode && (
        <WarningBanner onDismiss={() => setShowWarningBanner(false)} />
      )}

      {/* Background Refresh Indicator */}
      {isBackgroundRefreshing && (
        <View style={styles.refreshIndicator}>
          <View style={styles.refreshContent}>
            <MaterialCommunityIcons name="reload" size={16} color="#3B82F6" />
            <Text style={styles.refreshText}>Updating map...</Text>
          </View>
        </View>
      )}

      {/* Right Side Action Buttons - Hide when navigation is active or directions sheet is visible */}
      {!isTracking && (
        <RightActionButtons
          onCompassPress={getCurrentLocation}
          onDirectionsPress={handleDirectionsPress}
          onLayersPress={() => {
            setIsStyleSheetExpanded(prev => !prev)
            setIsBottomSheetExpanded(false)
            setIsLegendExpanded(false)
          }}
          onSOSPress={() => {
            setIsStyleSheetExpanded(false)
            setIsLegendExpanded(false)
            setIsBottomSheetExpanded(prev => !prev)
          }}
          onLegendPress={() => {
            setIsStyleSheetExpanded(false)
            setIsBottomSheetExpanded(false)
            setIsLegendExpanded(prev => !prev)
          }}
          hideDirectionsButton={directionsMode}
          visible={!isDirectionsSheetVisible}
          showHazards={showHazards}
          onToggleHazards={() => setShowHazards(prev => !prev)}
        />
      )}

      <StyleBottomSheet
        isExpanded={isStyleSheetExpanded}
        onToggle={() => setIsStyleSheetExpanded(prev => !prev)}
        selectedStyle={selectedStyle}
        onSelectStyle={handleStyleChange}
      />

      {/* Directions Bottom Sheet (Summary) - Only visible when route exists */}
      <DirectionsBottomSheet
        route={currentRoute}
        profile={currentProfile}
        onClearRoute={() => {
          setAllRoutes([])
          setSelectedRouteIndex(0)
        }}
        onVisibilityChange={setIsDirectionsSheetVisible}
      />

      {/* Navigation View - Shows when tracking is active */}
      <NavigationView 
        onLayersPress={() => {
          setIsStyleSheetExpanded(prev => !prev)
          setIsBottomSheetExpanded(false)
          setIsLegendExpanded(false)
        }}
        onSOSPress={handleSOS}
        onLegendPress={() => {
          setIsStyleSheetExpanded(false)
          setIsBottomSheetExpanded(false)
          setIsLegendExpanded(prev => !prev)
        }}
      />

      <MapBottomSheet
        isExpanded={isBottomSheetExpanded && !directionsMode}
        onToggle={() => {
          setIsLegendExpanded(false)
          setIsBottomSheetExpanded(prev => !prev)
        }}
        onShareLive={handleShareLocation}
        onSOS={handleSOS}
      />

      <LegendBottomSheet
        isExpanded={isLegendExpanded}
        onToggle={() => {
          setIsBottomSheetExpanded(false)
          setIsLegendExpanded(prev => !prev)
        }}
        dangerZoneCount={dangerZoneCount}
        riskGridCount={riskGridCount}
        geofenceCount={geofenceCount}
      />

      {/* Incident Report Modal */}
      <IncidentReportModal
        visible={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        onIncidentSubmitted={handleIncidentSubmitted}
        latitude={currentLocation?.coords?.latitude ?? 0}
        longitude={currentLocation?.coords?.longitude ?? 0}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  refreshIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    alignSelf: 'center',
    zIndex: 100,
  },
  refreshContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
})
