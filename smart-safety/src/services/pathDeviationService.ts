/**
 * Path Deviation Service - Integration with FastAPI Backend
 * API: https://path-deviation.onrender.com
 */

const PATH_DEVIATION_API_URL = 'https://path-deviation.onrender.com/api';

export interface JourneyConfig {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode: 'driving' | 'walking' | 'cycling';
}

export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
  bearing?: number;
  accuracy?: number;
}

export interface RouteInfo {
  route_id: string;
  distance_meters: number;
  duration_seconds: number;
  geometry: [number, number][]; // [lng, lat][]
}

export interface JourneyStartResponse {
  journey_id: string;
  routes: RouteInfo[];
  start_time: string;
  message: string;
}

export interface DeviationStatus {
  spatial: 'ON_ROUTE' | 'NEAR_ROUTE' | 'OFF_ROUTE';
  temporal: 'ON_TIME' | 'DELAYED' | 'SEVERELY_DELAYED' | 'STOPPED';
  directional: 'TOWARD_DEST' | 'PERPENDICULAR' | 'AWAY';
  severity: 'normal' | 'minor' | 'moderate' | 'concerning' | 'major';
}

export interface JourneyState {
  journey_id: string;
  current_status: 'active' | 'completed' | 'abandoned';
  route_probabilities: Record<string, number>;
  progress_percentage: number;
  time_deviation: number;
  last_gps: GPSPoint | null;
  deviation_status: DeviationStatus;
}

class PathDeviationService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = PATH_DEVIATION_API_URL;
  }

  /**
   * Start a new journey
   */
  async startJourney(config: JourneyConfig): Promise<JourneyStartResponse> {
    try {
      console.log('[PathDeviation] Starting journey:', config);
      
      const response = await fetch(`${this.apiUrl}/journey/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: config.origin,
          destination: config.destination,
          travel_mode: config.travelMode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start journey');
      }

      const data: JourneyStartResponse = await response.json();
      console.log('[PathDeviation] Journey started:', data.journey_id);
      
      return data;
    } catch (error) {
      console.error('[PathDeviation] Error starting journey:', error);
      throw error;
    }
  }

  /**
   * Send GPS point for tracking
   */
  async sendGPSPoint(journeyId: string, point: GPSPoint): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/journey/${journeyId}/gps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(point),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send GPS point');
      }

      const result = await response.json();
      
      if (result.batch_processed) {
        console.log('[PathDeviation] Batch processed for journey:', journeyId);
      }
    } catch (error) {
      console.error('[PathDeviation] Error sending GPS point:', error);
      // Don't throw - we don't want to stop tracking if one point fails
    }
  }

  /**
   * Get current journey status
   */
  async getJourneyStatus(journeyId: string): Promise<JourneyState> {
    try {
      const response = await fetch(`${this.apiUrl}/journey/${journeyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get journey status');
      }

      const data: JourneyState = await response.json();
      return data;
    } catch (error) {
      console.error('[PathDeviation] Error getting journey status:', error);
      throw error;
    }
  }

  /**
   * Complete a journey
   */
  async completeJourney(journeyId: string): Promise<void> {
    try {
      console.log('[PathDeviation] Completing journey:', journeyId);
      
      const response = await fetch(`${this.apiUrl}/journey/${journeyId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to complete journey');
      }

      console.log('[PathDeviation] Journey completed successfully');
    } catch (error) {
      console.error('[PathDeviation] Error completing journey:', error);
      throw error;
    }
  }

  /**
   * Get the base WebSocket URL
   */
  getWebSocketUrl(journeyId: string): string {
    // Convert https to wss
    const wsUrl = this.apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${wsUrl.replace('/api', '')}/ws/journey/${journeyId}`;
  }
}

export const pathDeviationService = new PathDeviationService();
