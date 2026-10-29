import * as Location from 'expo-location'
import { Platform } from 'react-native'
import { GeoFence, pointInCircle, pointInPolygon, haversineKm, normalizePolygon } from '../../../utils/geofenceLogic'
import { loadCachedFences, saveFences } from '../model/geoFenceModel'
import { fetchDynamicGeofences } from '../../../utils/geofenceApi'
import { isSirenActive, getLastSilencedAt } from '../../../utils/alertHelpers'

// Simple geofence service: loads geofences from server API and bundled assets/geofences-output.json
// Watches user location; emits 'enter' and 'exit' events with { fence, location }
// Note: Fetches from /api/geofence/all-zones-styled endpoint which returns:
//   - dangerZones (static hazard areas with diagonal-stripe patterns)
//   - riskGrids (dynamic incident-based zones with dot patterns)
//   - geofences (tourist destination safe zones with solid patterns)
// All zones include visualStyle metadata for map rendering

// Small in-file EventEmitter replacement (avoids Node 'events' dependency)
const listeners: Record<string, Set<(payload: any) => void>> = {}
const emitter = {
  on(event: string, cb: (payload: any) => void) {
    if (!listeners[event]) listeners[event] = new Set()
    listeners[event].add(cb)
  },
  off(event: string, cb: (payload: any) => void) {
    listeners[event]?.delete(cb)
  },
  emit(event: string, payload: any) {
    const set = listeners[event]
    if (!set) return
    for (const cb of Array.from(set)) {
      try {
        cb(payload)
      } catch (e) {
        console.warn('emitter callback error', e)
      }
    }
  }
}
let watcher: Location.LocationSubscription | null = null
let fences: GeoFence[] = []
let states: Record<string, 'inside' | 'outside' | 'approaching'> = {}
// debounce counters to require N stable reads before committing a transition
const stabilityCounters: Record<string, { candidate?: 'inside' | 'outside' | 'approaching', count: number }> = {}
// per-fence cooldown (ms) to avoid immediate re-entry/exit flapping
const lastTransitionAt: Record<string, number> = {}
const STABILITY_REQUIRED = 2
const TRANSITION_COOLDOWN_MS = 10_000

// Track current primary fence for consumers that need risk context
let currentPrimary: GeoFence | null = null
let lastKnownLocation: Location.LocationObjectCoords | null = null

export async function loadFences(userLat?: number, userLng?: number, userId?: string, forceRefresh = false): Promise<GeoFence[]> {
  try {
    // If userId is provided or forceRefresh is true, skip cache and fetch fresh from server
    const shouldBypassCache = !!userId || forceRefresh
    
    if (!shouldBypassCache) {
      // Try cached fences first for faster startup (only when no userId and not forcing)
      const cached = await loadCachedFences()
      if (cached && cached.length > 0) {
        fences = cached
        fences.forEach(f => { if (!states[f.id]) states[f.id] = 'outside' })
        // Still try to refresh from server in background
        refreshFromServer(userLat, userLng, userId)
        return fences
      }
    }

    // Try server API first
    try {
      const serverFences = await fetchDynamicGeofences(userLat, userLng, 5000, userId)
      if (serverFences && serverFences.length > 0) {
        fences = serverFences
        fences.forEach(f => { if (!states[f.id]) states[f.id] = 'outside' })
        // Cache for offline use
        try { await saveFences(fences) } catch (e) { /* ignore */ }
        if (lastKnownLocation) {
          evaluateFencesAtLocation(lastKnownLocation)
        }
        return fences
      }
    } catch (serverError) {
      console.warn('Server geofence fetch failed, falling back to bundled data:', serverError)
    }

    // Fallback: Load bundled JSON
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('../../../../assets/geofences-output.json')
    fences = data
    // Normalize polygon geometries and default radii
    fences = fences.map((f: GeoFence) => {
      if (f.type === 'polygon' && Array.isArray(f.coords)) {
        const norm = normalizePolygon(f.coords as number[][])
        return { ...f, coords: norm }
      }
      if (f.type === 'circle' && (!f.radiusKm || f.radiusKm <= 0)) {
        return { ...f, radiusKm: 1 }
      }
      return f
    })
    // Initialize states
    states = {}
    fences.forEach(f => { states[f.id] = 'outside' })

    // Persist a cached copy for faster startup
    try { await saveFences(fences) } catch (e) { /* ignore */ }
    return fences
  } catch (e) {
    console.error('Failed to load geofences:', e)
    fences = []
    states = {}
    return []
  }
}

// Background refresh from server (non-blocking)
async function refreshFromServer(userLat?: number, userLng?: number, userId?: string) {
  try {
    const serverFences = await fetchDynamicGeofences(userLat, userLng, 5000, userId)
    if (serverFences && serverFences.length > 0) {
      fences = serverFences
      states = {}
      fences.forEach(f => { states[f.id] = 'outside' })
      try { await saveFences(fences) } catch (e) { /* ignore */ }
    }
  } catch (e) {
    // Silent fail for background refresh
  }
}

function computeFenceState(f: GeoFence, location: Location.LocationObjectCoords): 'inside' | 'outside' | 'approaching' {
  const pt: [number, number] = [location.latitude, location.longitude]
  if (f.type === 'circle' && Array.isArray(f.coords)) {
    const center = f.coords as number[]
    const radiusKm = f.radiusKm || 1
    const d = haversineKm(pt, center)
    if (d <= radiusKm) return 'inside'
    if (d <= radiusKm + 1.0) return 'approaching' // Alert when within 1km
    return 'outside'
  }

  if (f.type === 'point' && Array.isArray(f.coords)) {
    const center = f.coords as number[]
    const d = haversineKm(pt, center)
    if (d <= 0.2) return 'inside'
    if (d <= 1.0) return 'approaching' // Alert when within 1km
    return 'outside'
  }

  if (f.type === 'polygon' && Array.isArray(f.coords)) {
    const inside = pointInPolygon(pt, f.coords as number[][])
    return inside ? 'inside' : 'outside'
  }

  return 'outside'
}

export function on(event: 'enter' | 'exit' | 'state' | 'primary' | 'location' | 'approaching', cb: (payload: any) => void) {
  emitter.on(event, cb)
}

export function off(event: 'enter' | 'exit' | 'state' | 'primary' | 'location' | 'approaching', cb: (payload: any) => void) {
  emitter.off(event, cb)
}

export function isRedOrRestrictedZone(f: GeoFence): boolean {
  if (!f) return false;
  const id = (f.id || '').toString().toLowerCase();

  // Strictly exclude false-positive military zone in Anand Nagar / Kasarvadavali, Thane
  if (id === 'osm-area-554975362' || id.includes('554975362')) {
    return false;
  }
  const coords = f.coords;
  if (Array.isArray(coords) && coords.length === 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    const isMil = (f.name || '').toLowerCase().includes('military');
    if (isMil && lat >= 19.23 && lat <= 19.29 && lng >= 72.96 && lng <= 73.01) {
      return false;
    }
  }

  const cat = (f.category || '').toLowerCase();
  const name = (f.name || '').toLowerCase();
  const rl = (f.riskLevel || '').toString().toLowerCase();
  const zoneType = ((f.visualStyle as any)?.zoneType || '').toLowerCase();
  const source = ((f.source as any) || '').toLowerCase();

  // 1. Explicit danger zone or risk grid from database / authority dashboard
  if (
    zoneType === 'danger_zone' ||
    zoneType === 'risk_grid' ||
    id.startsWith('dz-') ||
    id.startsWith('danger') ||
    id.startsWith('grid-') ||
    source.includes('authority') ||
    source.includes('manual')
  ) {
    return true;
  }

  // 2. Risk level is High, Very High, Critical, Red, Severe, Danger
  if (
    rl.includes('high') ||
    rl.includes('critical') ||
    rl.includes('danger') ||
    rl.includes('red') ||
    rl.includes('severe')
  ) {
    return true;
  }

  // 3. Category or name matches danger/restricted/hazard keywords
  return (
    cat.includes('restricted') || cat.includes('no-entry') || cat.includes('red') ||
    cat.includes('danger') || cat.includes('hazard') || cat.includes('flood') ||
    cat.includes('lightning') || cat.includes('thunderstorm') || cat.includes('landslide') ||
    cat.includes('forest fire') || cat.includes('wildlife') || cat.includes('protected') ||
    name.includes('restricted') || name.includes('red') || name.includes('danger') ||
    name.includes('hazard') || name.includes('warning') ||
    rl.includes('medium')
  );
}

export function getActiveRestrictedFences(): GeoFence[] {
  return fences.filter(f => states[f.id] === 'inside' && isRedOrRestrictedZone(f));
}

export function isUserInsideRestrictedZone(): boolean {
  return fences.some(f => states[f.id] === 'inside' && isRedOrRestrictedZone(f));
}

export function evaluateFencesAtLocation(coords: Location.LocationObjectCoords | { latitude: number, longitude: number, accuracy?: number }) {
  const locCoords = coords as Location.LocationObjectCoords;
  lastKnownLocation = locCoords;

  try { emitter.emit('location', { coords: locCoords, timestamp: Date.now(), primary: currentPrimary }) } catch (e) { /* ignore */ }

  // evaluate all fences
  fences.forEach(f => {
    try {
      const newState = computeFenceState(f, locCoords)
      const prev = states[f.id] || 'outside'

      const isHazard = isRedOrRestrictedZone(f);
      const requiredStability = (isHazard && (newState === 'inside' || newState === 'approaching')) ? 1 : STABILITY_REQUIRED;

      // quick cooldown: ignore transitions that happen too soon after previous transition
      const now = Date.now()
      const lastAt = lastTransitionAt[f.id] || 0
      if (now - lastAt < TRANSITION_COOLDOWN_MS && newState !== prev) {
        if (!isHazard) {
          return;
        }
      }

      // stability/debounce: only commit when same candidate state is seen required times
      const s = stabilityCounters[f.id] || { count: 0 }
      if (s.candidate === newState) {
        s.count = (s.count || 0) + 1
      } else {
        s.candidate = newState
        s.count = 1
      }
      stabilityCounters[f.id] = s

      if (s.count >= requiredStability && s.candidate && s.candidate !== prev) {
        // commit transition
        states[f.id] = s.candidate
        stabilityCounters[f.id] = { count: 0 }
        lastTransitionAt[f.id] = now
        emitter.emit('state', { fence: f, prev, current: s.candidate, location: locCoords })
        if (prev !== 'inside' && s.candidate === 'inside') {
          console.log(`🚨 [geofenceService] Committing ENTER event for fence: ${f.name} (hazard=${isHazard})`);
          emitter.emit('enter', { fence: f, location: locCoords })
        }
        if (prev === 'inside' && s.candidate !== 'inside') {
          console.log(`🟢 [geofenceService] Committing EXIT event for fence: ${f.name}`);
          emitter.emit('exit', { fence: f, location: locCoords })
        }
        if (prev === 'outside' && s.candidate === 'approaching') {
          emitter.emit('approaching', { fence: f, location: locCoords })
        }
      }
    } catch (e) {
      console.warn('fence eval error', e)
    }
  })

  // overlapping/primary fence selection: choose highest riskLevel (if numeric) else smallest radius
  try {
    const insideFences = fences.filter(f => states[f.id] === 'inside')
    let primary: GeoFence | null = null
    if (insideFences.length > 0) {
      insideFences.sort((a, b) => {
        const ra = parseFloat((a.riskLevel || '') as any) || 0
        const rb = parseFloat((b.riskLevel || '') as any) || 0
        if (ra !== rb) return rb - ra
        const rka = a.radiusKm || Infinity
        const rkb = b.radiusKm || Infinity
        return rka - rkb
      })
      primary = insideFences[0]
    }
    const prevPrimaryId = (getFences() as any[]).find(x => x && (x as any)._isPrimary)?.id
    // annotate fences with _isPrimary locally (not persisted)
    fences.forEach(x => { delete (x as any)._isPrimary })
    if (primary) (primary as any)._isPrimary = true
    const newPrimaryId = primary ? primary.id : null
    if (newPrimaryId !== prevPrimaryId) {
      currentPrimary = primary || null
      emitter.emit('primary', { primary: currentPrimary })
    }
  } catch (e) {
    // non-critical
  }
}

export function evaluateUserLocation(coords: { latitude: number, longitude: number, accuracy?: number }) {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return;
  evaluateFencesAtLocation(coords as any);
}

export async function startMonitoring(options?: { accuracy?: Location.LocationAccuracy, intervalMs?: number, distance?: number }) {
  const accuracy = options?.accuracy || Location.Accuracy.Balanced
  const interval = options?.intervalMs || 5000
  const distance = options?.distance || 0

  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      console.warn('[geofenceService] Location permission not granted for startMonitoring')
    }
  } catch (e) {
    console.warn('[geofenceService] requestForegroundPermissionsAsync error:', e)
  }

  if (!fences || fences.length === 0) {
    await loadFences()
  }

  if (watcher) {
    watcher.remove()
    watcher = null
  }

  try {
    watcher = await Location.watchPositionAsync({ accuracy, timeInterval: interval, distanceInterval: distance }, (loc) => {
      evaluateFencesAtLocation(loc.coords)
    })
  } catch (err) {
    console.warn('[geofenceService] Location.watchPositionAsync error (web fallback enabled):', err)
  }

  // Web fallback: Use HTML5 Geolocation API directly if running on web
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => evaluateFencesAtLocation(pos.coords),
        (err) => console.warn('[geofenceService] Web getCurrentPosition error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      if ((window as any).__geofenceWatchId) {
        navigator.geolocation.clearWatch((window as any).__geofenceWatchId);
      }
      (window as any).__geofenceWatchId = navigator.geolocation.watchPosition(
        (pos) => evaluateFencesAtLocation(pos.coords),
        (err) => console.warn('[geofenceService] Web watchPosition error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    } catch (e) {
      console.warn('[geofenceService] Web geolocation watch setup failed:', e);
    }
  }

  return watcher
}

export function stopMonitoring() {
  if (watcher) {
    watcher.remove()
    watcher = null
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).__geofenceWatchId && navigator.geolocation) {
    try {
      navigator.geolocation.clearWatch((window as any).__geofenceWatchId);
      (window as any).__geofenceWatchId = null;
    } catch (_) {}
  }
}

export function getFences() {
  return fences
}

export function filterFencesByDistance(userLat: number, userLng: number, radiusKm: number = 15) {
  const { filterFencesByDistance: filterFn } = require('../../../utils/geofenceLogic')
  const filtered = filterFn(fences, userLat, userLng, radiusKm)
  return filtered
}

export function getAllFencesFiltered(
  userLat?: number,
  userLng?: number,
  radiusKm: number = 15
): GeoFence[] {
  if (userLat === undefined || userLng === undefined) {
    return fences
  }
  return filterFencesByDistance(userLat, userLng, radiusKm)
}

export default { loadFences, startMonitoring, stopMonitoring, on, off, getFences, filterFencesByDistance, getAllFencesFiltered, evaluateUserLocation, isRedOrRestrictedZone }
