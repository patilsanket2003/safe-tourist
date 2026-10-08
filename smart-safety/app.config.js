// Load environment variables from .env during config evaluation
// This runs in Node when Expo/Metro reads the config, so it's safe to use dotenv here.
const fs = require('fs');
const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch (e) {
  // dotenv might not be installed in some environments; silently ignore.
}

module.exports = ({ config }) => {
  // Ensure extra exists
  config.extra = config.extra || {};

  // Prefer process.env (loaded by dotenv above) but fall back to any existing value
  if (process.env.MAPBOX_ACCESS_TOKEN) {
    config.extra.MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  }
  if (process.env.MAPBOX_DOWNLOADS_TOKEN) {
    config.extra.MAPBOX_DOWNLOADS_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN;
    // Mirror to the new env name used by @rnmapbox/maps to avoid deprecation warnings
    if (!process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN) {
      process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN;
    }
  }
  
  // Weather API keys
  if (process.env.WEATHERAPI_KEY) {
    config.extra.WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;
  }
  
  if (process.env.OPENWEATHERMAP_KEY) {
    config.extra.OPENWEATHERMAP_KEY = process.env.OPENWEATHERMAP_KEY;
  }
  
  // Groq LLM config - allow injecting API key and model from environment/.env
  if (process.env.GROQ_API_KEY) {
    config.extra.GROQ_API_KEY = process.env.GROQ_API_KEY;
  }
  if (process.env.GROQ_MODEL) {
    config.extra.GROQ_MODEL = process.env.GROQ_MODEL;
  }

  // Backend URLs for runtime network calls (REST + safety service)
  if (process.env.SERVER_URL) {
    config.extra.SERVER_URL = process.env.SERVER_URL;
  }
  if (process.env.PATH_DEVIATION_API_URL) {
    config.extra.PATH_DEVIATION_API_URL = process.env.PATH_DEVIATION_API_URL;
  }

  return config;
};
