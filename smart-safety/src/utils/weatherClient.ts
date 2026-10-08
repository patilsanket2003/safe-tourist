/**
 * Weather API Client with Automatic Failover
 * 
 * Implements a 2-tier fallback system:
 * 1. Primary: Open-Meteo (unlimited, no key)
 * 2. Backup: WeatherAPI.com (1M calls/month)
 * 
 * NOTE: OpenWeatherMap is available but currently disabled due to invalid API keys.
 * To enable it, add a valid OpenWeatherMap API key and uncomment the fallback logic.
 * 
 * Features:
 * - Automatic failover on errors
 * - Consistent data format across all providers
 * - Circuit breaker pattern to prevent overwhelming failed providers
 * - Provider health tracking
 * - Detailed logging for debugging
 */

import { WEATHERAPI_KEY, OPENWEATHERMAP_KEY } from "../config";

// Types
export interface WeatherData {
  temperature: number;
  apparent_temperature: number | null;
  humidity: number;
  wind_speed: number;
  wind_bearing: number | null;
  visibility: number;
  cloud_cover: number;
  pressure: number;
}

export interface WeatherFeatures {
  temperature: number;
  humidity: number;
  wind_speed: number;
  wind_bearing: number;
  visibility: number;
  cloud_cover: number;
  pressure: number;
}

export interface WeatherAPIResponse {
  compact: WeatherData;
  modelFeatures: WeatherFeatures;
  provider: string;
  timestamp: string;
}

// Provider status tracking
interface ProviderStatus {
  name: string;
  lastError: Date | null;
  errorCount: number;
  lastSuccess: Date | null;
  consecutiveErrors: number;
}

const providerStatus: Record<string, ProviderStatus> = {
  'open-meteo': {
    name: 'Open-Meteo',
    lastError: null,
    errorCount: 0,
    lastSuccess: null,
    consecutiveErrors: 0,
  },
  'weatherapi': {
    name: 'WeatherAPI.com',
    lastError: null,
    errorCount: 0,
    lastSuccess: null,
    consecutiveErrors: 0,
  },
  'openweathermap': {
    name: 'OpenWeatherMap',
    lastError: null,
    errorCount: 0,
    lastSuccess: null,
    consecutiveErrors: 0,
  },
};

// Helper: Mark provider success
function markSuccess(providerId: string) {
  const status = providerStatus[providerId];
  if (status) {
    status.lastSuccess = new Date();
    status.consecutiveErrors = 0;
  }
}

// Helper: Mark provider error
function markError(providerId: string, error: Error) {
  const status = providerStatus[providerId];
  if (status) {
    status.lastError = new Date();
    status.errorCount += 1;
    status.consecutiveErrors += 1;
  }
  console.warn(`[WeatherAPI] ${status?.name || providerId} failed:`, error.message);
}

// Helper: Check if provider should be skipped
function shouldSkipProvider(providerId: string): boolean {
  const status = providerStatus[providerId];
  if (!status) return false;
  
  // Skip if too many consecutive errors (circuit breaker)
  if (status.consecutiveErrors >= 3) {
    const timeSinceError = status.lastError 
      ? Date.now() - status.lastError.getTime() 
      : Infinity;
    
    // Reset after 5 minutes
    if (timeSinceError > 5 * 60 * 1000) {
      status.consecutiveErrors = 0;
      return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Fetch from Open-Meteo (Primary)
 */
async function fetchOpenMeteo(
  latitude: number,
  longitude: number,
  timeout: number = 10000
): Promise<WeatherAPIResponse> {
  const providerId = 'open-meteo';
  
  if (shouldSkipProvider(providerId)) {
    throw new Error('Open-Meteo temporarily unavailable (circuit breaker)');
  }

  try {
    const hourlyParams = [
      "temperature_2m",
      "relativehumidity_2m",
      "windspeed_10m",
      "winddirection_10m",
      "pressure_msl",
      "visibility",
      "cloudcover",
      "apparent_temperature",
    ].join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${encodeURIComponent(
      hourlyParams,
    )}&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
    const data = await res.json();

    const times: string[] = data.hourly?.time || [];
    const now = new Date();
    let idx = times.findIndex((t: string) => {
      const dt = new Date(t);
      return (
        dt.getFullYear() === now.getFullYear() &&
        dt.getMonth() === now.getMonth() &&
        dt.getDate() === now.getDate() &&
        dt.getHours() === now.getHours()
      );
    });
    if (idx === -1) idx = 0;

    const h = data.hourly || {};

    const compact: WeatherData = {
      temperature: h.temperature_2m?.[idx] ?? null,
      apparent_temperature: h.apparent_temperature?.[idx] ?? null,
      humidity: h.relativehumidity_2m?.[idx] ?? null,
      wind_speed: h.windspeed_10m?.[idx] ?? null,
      wind_bearing: h.winddirection_10m?.[idx] ?? null,
      visibility: h.visibility?.[idx] ?? null,
      cloud_cover: h.cloudcover?.[idx] ?? null,
      pressure: h.pressure_msl?.[idx] ?? null,
    };

    const modelFeatures: WeatherFeatures = {
      temperature: compact.temperature ?? 20.0,
      humidity: compact.humidity ?? 50,
      wind_speed: compact.wind_speed ?? 5.0,
      wind_bearing: compact.wind_bearing ?? 0.0,
      visibility: compact.visibility != null ? compact.visibility / 1000.0 : 10.0,
      cloud_cover: compact.cloud_cover != null ? compact.cloud_cover / 100.0 : 0.5,
      pressure: compact.pressure ?? 1013.0,
    };

    markSuccess(providerId);

    return {
      compact,
      modelFeatures,
      provider: 'Open-Meteo',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    markError(providerId, error);
    throw error;
  }
}

/**
 * Fetch from WeatherAPI.com (Backup)
 */
async function fetchWeatherAPI(
  latitude: number,
  longitude: number,
  timeout: number = 10000
): Promise<WeatherAPIResponse> {
  const providerId = 'weatherapi';
  
  if (shouldSkipProvider(providerId)) {
    throw new Error('WeatherAPI.com temporarily unavailable (circuit breaker)');
  }

  if (!WEATHERAPI_KEY) {
    throw new Error('WeatherAPI.com API key not configured');
  }

  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${latitude},${longitude}&aqi=no`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`WeatherAPI error: ${res.status}`);
    const data = await res.json();

    const current = data.current || {};
    
    // WeatherAPI.com returns:
    // - temp_c (°C)
    // - humidity (%)
    // - wind_kph (km/h)
    // - wind_degree (°)
    // - pressure_mb (hPa)
    // - vis_km (km)
    // - cloud (%)
    // - feelslike_c (°C)

    const compact: WeatherData = {
      temperature: current.temp_c ?? null,
      apparent_temperature: current.feelslike_c ?? null,
      humidity: current.humidity ?? null,
      wind_speed: current.wind_kph ?? null,
      wind_bearing: current.wind_degree ?? null,
      visibility: current.vis_km != null ? current.vis_km * 1000 : null, // Convert km to meters
      cloud_cover: current.cloud ?? null,
      pressure: current.pressure_mb ?? null,
    };

    const modelFeatures: WeatherFeatures = {
      temperature: compact.temperature ?? 20.0,
      humidity: compact.humidity ?? 50,
      wind_speed: compact.wind_speed ?? 5.0,
      wind_bearing: compact.wind_bearing ?? 0.0,
      visibility: compact.visibility != null ? compact.visibility / 1000.0 : 10.0,
      cloud_cover: compact.cloud_cover != null ? compact.cloud_cover / 100.0 : 0.5,
      pressure: compact.pressure ?? 1013.0,
    };

    markSuccess(providerId);

    return {
      compact,
      modelFeatures,
      provider: 'WeatherAPI.com',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    markError(providerId, error);
    throw error;
  }
}

/**
 * Fetch from OpenWeatherMap (Fallback)
 */
async function fetchOpenWeatherMap(
  latitude: number,
  longitude: number,
  timeout: number = 10000
): Promise<WeatherAPIResponse> {
  const providerId = 'openweathermap';
  
  if (shouldSkipProvider(providerId)) {
    throw new Error('OpenWeatherMap temporarily unavailable (circuit breaker)');
  }

  if (!OPENWEATHERMAP_KEY) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHERMAP_KEY}&units=metric`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`);
    const data = await res.json();

    // OpenWeatherMap returns:
    // - main.temp (°C)
    // - main.feels_like (°C)
    // - main.humidity (%)
    // - main.pressure (hPa)
    // - wind.speed (m/s) - need to convert to km/h
    // - wind.deg (°)
    // - visibility (meters)
    // - clouds.all (%)

    const main = data.main || {};
    const wind = data.wind || {};
    const clouds = data.clouds || {};

    const compact: WeatherData = {
      temperature: main.temp ?? null,
      apparent_temperature: main.feels_like ?? null,
      humidity: main.humidity ?? null,
      wind_speed: wind.speed != null ? wind.speed * 3.6 : null, // Convert m/s to km/h
      wind_bearing: wind.deg ?? null,
      visibility: data.visibility ?? null,
      cloud_cover: clouds.all ?? null,
      pressure: main.pressure ?? null,
    };

    const modelFeatures: WeatherFeatures = {
      temperature: compact.temperature ?? 20.0,
      humidity: compact.humidity ?? 50,
      wind_speed: compact.wind_speed ?? 5.0,
      wind_bearing: compact.wind_bearing ?? 0.0,
      visibility: compact.visibility != null ? compact.visibility / 1000.0 : 10.0,
      cloud_cover: compact.cloud_cover != null ? compact.cloud_cover / 100.0 : 0.5,
      pressure: compact.pressure ?? 1013.0,
    };

    markSuccess(providerId);

    return {
      compact,
      modelFeatures,
      provider: 'OpenWeatherMap',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    markError(providerId, error);
    throw error;
  }
}

/**
 * Main function: Fetch weather with automatic failover
 * 
 * NOTE: OpenWeatherMap is disabled due to invalid API keys.
 * Currently using 2-provider system: Open-Meteo (primary) + WeatherAPI.com (backup)
 */
export async function fetchWeatherWithFailover(
  latitude: number,
  longitude: number
): Promise<WeatherAPIResponse> {
  const errors: Array<{ provider: string; error: Error }> = [];

  // Try Open-Meteo first (Primary)
  try {
    console.log('[WeatherAPI] Attempting Open-Meteo (primary)...');
    const result = await fetchOpenMeteo(latitude, longitude);
    console.log('[WeatherAPI] Success with Open-Meteo');
    return result;
  } catch (error: any) {
    errors.push({ provider: 'Open-Meteo', error });
    console.warn('[WeatherAPI] Open-Meteo failed, trying backup...');
  }

  // Try WeatherAPI.com second (Backup)
  try {
    console.log('[WeatherAPI] Attempting WeatherAPI.com (backup)...');
    const result = await fetchWeatherAPI(latitude, longitude);
    console.log('[WeatherAPI] Success with WeatherAPI.com');
    return result;
  } catch (error: any) {
    errors.push({ provider: 'WeatherAPI.com', error });
    console.warn('[WeatherAPI] WeatherAPI.com failed.');
  }

  // OpenWeatherMap disabled - API key invalid
  // Uncomment when valid API key is available:
  // try {
  //   console.log('[WeatherAPI] Attempting OpenWeatherMap (fallback)...');
  //   const result = await fetchOpenWeatherMap(latitude, longitude);
  //   console.log('[WeatherAPI] ✅ Success with OpenWeatherMap');
  //   return result;
  // } catch (error: any) {
  //   errors.push({ provider: 'OpenWeatherMap', error });
  // }

  // All providers failed
  console.error('[WeatherAPI] All weather providers failed:', errors);
  
  const errorMessages = errors.map(e => `${e.provider}: ${e.error.message}`).join('; ');
  throw new Error(`All weather providers failed: ${errorMessages}`);
}

/**
 * Get provider health status (for debugging/monitoring)
 */
export function getProviderStatus() {
  return { ...providerStatus };
}

/**
 * Reset provider status (for testing)
 */
export function resetProviderStatus() {
  Object.values(providerStatus).forEach(status => {
    status.lastError = null;
    status.errorCount = 0;
    status.lastSuccess = null;
    status.consecutiveErrors = 0;
  });
}
