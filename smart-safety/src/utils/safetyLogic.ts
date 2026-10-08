import { getGeoPrediction, getWeatherPrediction, fetchOpenMeteoCurrentHour } from './api'

// API Response Schemas
export interface GeoPredictionResponse {
  predicted_safety_score?: number
  safety_score_100?: number
  predicted_risk_label?: string
  [key: string]: any // Allow additional properties
}

export interface WeatherPredictionResponse {
  safety_score_100?: number
  safety_score?: number
  safety_category?: string
  confidence?: number
  [key: string]: any // Allow additional properties
}

export interface OpenMeteoCompact {
  temperature: number | null
  apparent_temperature: number | null
  humidity: number | null
  wind_speed: number | null
  wind_bearing: number | null
  visibility: number | null
  cloud_cover: number | null
  pressure: number | null
}

export interface OpenMeteoModelFeatures {
  temperature: number | null
  humidity: number | null
  wind_speed: number | null
  wind_bearing: number | null
  visibility: number | null
  cloud_cover: number | null
  pressure: number | null
}

export interface OpenMeteoResponse {
  compact: OpenMeteoCompact
  modelFeatures: OpenMeteoModelFeatures
}

// Input/Output Schemas
export interface SafetyScoreInput {
  latitude: number
  longitude: number
}

export interface SafetyScoreResult {
  score: number // 0 to 100
  status?: string
  geoScore?: number
  weatherScore?: number
  geoLabel?: string
  weatherCategory?: string
  nearestThreat?: string
  weatherCondition?: string
  geofenceScore?: number
}

// Compute safety score using real API predictions
export async function computeSafetyScore(input: SafetyScoreInput): Promise<SafetyScoreResult> {
  const { latitude, longitude } = input

  let geoScore: number | null = null
  let weatherScore: number | null = null
  let geoLabel: string | null = null
  let weatherCategory: string | null = null

  // Fetch geo prediction
  try {
    const geoData: GeoPredictionResponse = await getGeoPrediction(latitude, longitude)
    geoScore = geoData.predicted_safety_score ?? geoData.safety_score_100 ?? null
    geoLabel = geoData.predicted_risk_label ?? null
  } catch (error) {
    console.warn('Failed to fetch geo prediction:', error)
  }

  // Fetch weather prediction
  try {
    const openMeteoData: OpenMeteoResponse = await fetchOpenMeteoCurrentHour(latitude, longitude)
    const { compact, modelFeatures } = openMeteoData

    if (modelFeatures && modelFeatures.temperature != null) {
      const weatherData: WeatherPredictionResponse = await getWeatherPrediction(modelFeatures as any)
      weatherScore = weatherData.safety_score_100 ?? weatherData.safety_score ?? null
      weatherCategory = weatherData.safety_category ?? null
    }
  } catch (error) {
    console.warn('Failed to fetch weather prediction:', error)
  }

  // Combine scores with weights (geo: 60%, weather: 40%)
  let combinedScore: number
  if (geoScore !== null && weatherScore !== null) {
    combinedScore = Math.round(geoScore * 0.6 + weatherScore * 0.4)
  } else if (geoScore !== null) {
    combinedScore = geoScore
  } else if (weatherScore !== null) {
    combinedScore = weatherScore
  } else {
    // Fallback if both APIs fail
    combinedScore = 50 // Neutral score
  }

  // Ensure score is within 0-100 range
  combinedScore = Math.max(0, Math.min(100, combinedScore))

  // Determine status based on score
  let status: string
  if (combinedScore >= 80) {
    status = 'Safe'
  } else if (combinedScore >= 60) {
    status = 'Moderate'
  } else if (combinedScore >= 40) {
    status = 'Caution'
  } else {
    status = 'High Risk'
  }

  return {
    score: combinedScore,
    status,
    geoScore: geoScore ?? undefined,
    weatherScore: weatherScore ?? undefined,
    geoLabel: geoLabel ?? undefined,
    weatherCategory: weatherCategory ?? undefined,
  }
}