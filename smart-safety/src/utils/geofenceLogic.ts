// Geo-fencing data types and basic utilities

export type GeoFenceType = 'point' | 'circle' | 'polygon' | 'area'

export type VisualStyle = {
  zoneType?: string
  borderStyle?: string
  borderWidth?: number
  fillOpacity?: number
  fillPattern?: string
  iconType?: string
  renderPriority?: number
  gridSize?: number
  color?: string
}

export type GeoFence = {
  id: string
  name: string
  type: GeoFenceType
  coords: number[] | number[][] // [lat, lon] for point/circle center, or array of [lat, lon] for polygon
  radiusKm?: number
  category?: string
  state?: string
  riskLevel?: string
  source?: string
  metadata?: Record<string, any>
  version?: string
  distanceToUser?: number // Distance from user's location in km
  visualStyle?: VisualStyle
}

// Haversine distance in kilometers between two coordinates
export function haversineKm([lat1, lon1]: number[], [lat2, lon2]: number[]): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371 // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Point-in-circle check
export function pointInCircle(point: number[], center: number[], radiusKm: number): boolean {
  return haversineKm(point, center) <= radiusKm
}

// Normalize a coordinate pair to [lat, lon]. Some datasets use [lon, lat].
export function normalizeLatLon(pair: number[]): [number, number] {
  if (!Array.isArray(pair) || pair.length < 2) return [0, 0]
  const a = Number(pair[0])
  const b = Number(pair[1])
  // If first value is within lat-range and second within lon-range, assume [lat, lon]
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b]
  // If values seem flipped, swap
  if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return [b, a]
  // fallback
  return [a, b]
}

// Ensure polygon is an array of [lat, lon] points and closed (first === last).
export function normalizePolygon(poly: number[][]): number[][] {
  if (!Array.isArray(poly)) return []
  const out: number[][] = poly.map(p => normalizeLatLon(p))
  if (out.length === 0) return out
  // ensure at least 3 distinct vertices
  const distinct = out.filter((v, i, arr) => i === 0 || v[0] !== arr[i - 1][0] || v[1] !== arr[i - 1][1])
  if (distinct.length < 3) return []
  // close polygon
  const first = distinct[0]
  const last = distinct[distinct.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) distinct.push([first[0], first[1]])
  return distinct
}

// Robust ray-casting point-in-polygon algorithm
export function pointInPolygon(point: number[], polygon: number[][]): boolean {
  if (!Array.isArray(polygon) || polygon.length < 3) return false
  const x = point[1] // lon
  const y = point[0] // lat
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0], xi = polygon[i][1]
    const yj = polygon[j][0], xj = polygon[j][1]
    // skip invalid vertices
    if (typeof xi !== 'number' || typeof yi !== 'number' || typeof xj !== 'number' || typeof yj !== 'number') continue
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Basic CSV row mappers for the provided datasets
export function mapDisasterRowToGeoFence(row: Record<string, string>, idx: number): GeoFence {
  const id = `disaster-${idx}`
  const lat = parseFloat(row.Latitude || row.Lat || '0')
  const lon = parseFloat(row.Longitude || row.Lon || '0')
  // Many records are area/region points; treat as circle with small radius by default
  return {
    id,
    name: row.Name || 'unnamed',
    type: 'circle',
    coords: [lat, lon],
    radiusKm: 5,
    category: row.Category,
    state: row.State,
    riskLevel: (row.Additional_Info || '').replace('Risk Level: ', '').trim() || undefined,
    source: row.Source,
    metadata: row
  }
}

export function mapSecurityRowToGeoFence(row: Record<string, string>, idx: number): GeoFence {
  const id = `security-${row.ID || idx}`
  const lat = parseFloat(row.Latitude || '0')
  const lon = parseFloat(row.Longitude || '0')
  const bufferKm = parseFloat(row.Buffer_Zone_Km || '0') || 0
  return {
    id,
    name: row.Name || 'unnamed',
    type: bufferKm > 0 ? 'circle' : 'point',
    coords: [lat, lon],
    radiusKm: bufferKm > 0 ? bufferKm : undefined,
    category: row.Category,
    state: row.State,
    riskLevel: row.Security_Level,
    source: row.Source,
    metadata: row
  }
}

export function mapWildlifeRowToGeoFence(row: Record<string, string>, idx: number): GeoFence {
  const id = `wildlife-${idx}`
  const lat = parseFloat(row.Latitude || '0')
  const lon = parseFloat(row.Longitude || '0')
  return {
    id,
    name: row.Name || 'unnamed',
    type: 'point',
    coords: [lat, lon],
    category: row.Category,
    state: row.State,
    source: row.Source,
    metadata: row
  }
}

export function getDistanceToFence(fence: GeoFence, userLat: number, userLng: number): number {
  const userPoint: [number, number] = [userLat, userLng]

  if (fence.type === 'point' && Array.isArray(fence.coords)) {
    const center = normalizeLatLon(fence.coords as number[])
    return haversineKm(userPoint, center)
  }

  if (fence.type === 'circle' && Array.isArray(fence.coords)) {
    const center = normalizeLatLon(fence.coords as number[])
    return haversineKm(userPoint, center)
  }

  if (fence.type === 'polygon' && Array.isArray(fence.coords)) {
    const polygon = normalizePolygon(fence.coords as number[][])
    if (polygon.length < 3) {
      const center = polygon[0] || [0, 0]
      return haversineKm(userPoint, center)
    }
    if (pointInPolygon(userPoint, polygon)) {
      return 0
    }
    let minDist = Infinity
    for (let i = 0; i < polygon.length - 1; i++) {
      const dist = pointToSegmentDistance(
        userPoint,
        polygon[i] as [number, number],
        polygon[i + 1] as [number, number]
      )
      if (dist < minDist) minDist = dist
    }
    return minDist
  }

  return Infinity
}

function pointToSegmentDistance(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): number {
  const [px, py] = point
  const [x1, y1] = segStart
  const [x2, y2] = segEnd

  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) {
    return haversineKm(point, segStart)
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))

  const nearestX = x1 + t * dx
  const nearestY = y1 + t * dy

  return haversineKm(point, [nearestX, nearestY])
}

export function filterFencesByDistance(
  fences: GeoFence[],
  userLat: number,
  userLng: number,
  radiusKm: number = 15
): GeoFence[] {
  return fences
    .map(fence => {
      const distance = getDistanceToFence(fence, userLat, userLng)
      let isWithinRange = false

      if (fence.type === 'circle' && fence.radiusKm) {
        isWithinRange = distance <= radiusKm + fence.radiusKm
      } else if (fence.type === 'point') {
        isWithinRange = distance <= radiusKm
      } else if (fence.type === 'polygon') {
        isWithinRange = distance <= radiusKm
      } else {
        isWithinRange = distance <= radiusKm
      }

      return {
        ...fence,
        distanceToUser: Math.round(distance * 100) / 100
      }
    })
    .filter(fence => {
      if (fence.type === 'circle' && fence.radiusKm) {
        const distance = fence.distanceToUser ?? Infinity
        return distance <= radiusKm + fence.radiusKm
      }
      const distance = fence.distanceToUser ?? Infinity
      return distance <= radiusKm
    })
}
