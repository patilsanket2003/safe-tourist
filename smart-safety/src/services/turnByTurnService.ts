/**
 * Turn-by-Turn Navigation Service
 * Calculates next instruction based on current GPS position and route steps
 */

import { RouteStep } from '../features/map/services/mapboxDirectionsService';

export interface CurrentInstruction {
  instruction: string;
  distance: string; // e.g. "500 m" or "1.2 km"
  direction: 'north' | 'south' | 'east' | 'west' | 'straight' | 'left' | 'right';
  maneuverType: string;
  stepIndex: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Get direction from maneuver type and modifier
 */
function getDirection(
  maneuverType: string,
  modifier?: string,
  bearing?: number
): 'north' | 'south' | 'east' | 'west' | 'straight' | 'left' | 'right' {
  const type = maneuverType.toLowerCase();
  const mod = modifier?.toLowerCase() || '';

  // Check modifier first
  if (mod.includes('sharp left') || mod.includes('left')) {
    return 'left';
  }
  if (mod.includes('sharp right') || mod.includes('right')) {
    return 'right';
  }
  if (mod.includes('straight') || type === 'continue' || type === 'new name') {
    return 'straight';
  }

  // Check maneuver type
  if (type === 'turn') {
    if (mod.includes('left')) return 'left';
    if (mod.includes('right')) return 'right';
    return 'straight';
  }

  if (type === 'depart' || type === 'arrive') {
    return 'straight';
  }

  // Use bearing if available
  if (bearing !== undefined) {
    if (bearing >= 315 || bearing < 45) return 'north';
    if (bearing >= 45 && bearing < 135) return 'east';
    if (bearing >= 135 && bearing < 225) return 'south';
    if (bearing >= 225 && bearing < 315) return 'west';
  }

  return 'straight';
}

/**
 * Find the next instruction based on current GPS position
 */
export function getNextInstruction(
  currentLat: number,
  currentLng: number,
  steps: RouteStep[],
  lastStepIndex: number = 0
): CurrentInstruction | null {
  if (!steps || steps.length === 0) {
    return null;
  }

  // Find the closest upcoming step
  let closestStepIndex = lastStepIndex;
  let closestDistance = Infinity;

  // Check steps starting from last known step
  for (let i = Math.max(0, lastStepIndex - 1); i < steps.length; i++) {
    const step = steps[i];
    const [lng, lat] = step.maneuver.location;
    const distance = calculateDistance(currentLat, currentLng, lat, lng);

    // If we're within 50m of a maneuver, skip to next one
    if (distance < 50 && i < steps.length - 1) {
      continue;
    }

    // If this is closer and ahead of us
    if (distance < closestDistance) {
      closestDistance = distance;
      closestStepIndex = i;
    }

    // If we found a step within 5km, stop searching
    if (distance < 5000) {
      break;
    }
  }

  // Get the next instruction
  const nextStep = steps[closestStepIndex];
  if (!nextStep) {
    // Return final instruction
    return {
      instruction: 'Continue to destination',
      distance: formatDistance(closestDistance),
      direction: 'straight',
      maneuverType: 'continue',
      stepIndex: steps.length - 1,
    };
  }

  const [lng, lat] = nextStep.maneuver.location;
  const distanceToManeuver = calculateDistance(currentLat, currentLng, lat, lng);

  return {
    instruction: nextStep.maneuver.instruction || nextStep.instruction,
    distance: formatDistance(distanceToManeuver),
    direction: getDirection(
      nextStep.maneuver.type,
      nextStep.maneuver.modifier,
      nextStep.maneuver.bearing_after
    ),
    maneuverType: nextStep.maneuver.type,
    stepIndex: closestStepIndex,
  };
}

/**
 * Check if we've reached the destination
 */
export function hasReachedDestination(
  currentLat: number,
  currentLng: number,
  destinationLat: number,
  destinationLng: number,
  threshold: number = 50 // meters
): boolean {
  const distance = calculateDistance(
    currentLat,
    currentLng,
    destinationLat,
    destinationLng
  );
  return distance <= threshold;
}

/**
 * Calculate ETA based on remaining distance and current speed
 */
export function calculateETA(
  distanceRemaining: number, // meters
  currentSpeed: number // km/h
): number {
  // If speed is too low, use average speed of 30 km/h
  const speed = currentSpeed > 5 ? currentSpeed : 30;
  
  // Convert speed to m/s
  const speedMps = (speed * 1000) / 3600;
  
  // Calculate time in seconds
  return distanceRemaining / speedMps;
}
