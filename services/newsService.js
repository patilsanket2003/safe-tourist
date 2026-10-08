const axios = require('axios');
const Incident = require('../models/Incident');
const { NEWS_API_KEY: CONFIG_API_KEY } = require('../config/config');

// Configuration (Move these to .env in production)
const NEWS_API_KEY = CONFIG_API_KEY || 'YOUR_NEWS_API_KEY';
const NEWS_URL = 'https://newsapi.org/v2/everything';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'; // OpenStreetMap Geocoding API

// Default for fallback
const DEFAULT_CITY = {
    name: 'Bangalore',
    lat: 12.9716,
    lng: 77.5946
};

/**
 * Extract location names from text and get coordinates using OpenStreetMap (Nominatim)
 * Returns { lat, lng } or null
 */
async function getCoordinatesFromText(text, cityContext) {
    try {
        // Simple NLP: Heuristic to find potential location words
        // 1. Look for patterns like "in <Place>", "near <Place>", "at <Place>"
        const locationRegex = /(?:in|at|near)\s+([A-Z][a-zA-Z\s]+)/g;
        let match;
        let bestLocation = null;
        
        // Prioritize specific locations mentioned in the text
        while ((match = locationRegex.exec(text)) !== null) {
            const potentialPlace = match[1].trim();
            // Ignore common noise words
            if (['The', 'A', 'An', 'This', 'That', 'India', cityContext.name].includes(potentialPlace)) continue;
            bestLocation = potentialPlace;
            break; // Take the first strong match
        }

        // Search Query Construction
        let query = "";
        if (bestLocation) {
            query = `${bestLocation}, ${cityContext.name}`;
        } else {
            // Fallback: Just return random scatter if no specific place found (handled by caller)
            return null;
        }

        console.log(`🌍 Geocoding search: "${query}"...`);

        // Call Nominatim API (Free, requires User-Agent)
        const geoUsers = await axios.get(NOMINATIM_URL, {
            params: {
                q: query,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': 'TouristSafetyApp/1.0' // Required by Nominatim policy
            }
        });

        if (geoUsers.data && geoUsers.data.length > 0) {
            return {
                lat: parseFloat(geoUsers.data[0].lat),
                lng: parseFloat(geoUsers.data[0].lon)
            };
        } else {
             console.log(`❌ Nominatim found nothing for: "${query}"`);
        }
    } catch (err) {
        console.error("Geocoding Error:", err.message);
    }
    return null;
}

/**
 * Fetch news incidents for a specific city and store them in the database
 * @param {Object} city - { name, lat, lng }
 */
exports.fetchNewsIncidents = async (city = DEFAULT_CITY) => {
    console.log(`📰 Fetching latest news incidents for ${city.name}...`);

    if (NEWS_API_KEY === 'YOUR_NEWS_API_KEY') {
        console.warn("⚠️ No NEWS_API_KEY found. Skipping real API call.");
        return;
    }

    try {
        // Fetch news regarding safety/crime in the target city
        const response = await axios.get(NEWS_URL, {
            params: {
                q: `${city.name} AND (crime OR accident OR riot OR flood OR fire)`,
                sortBy: 'publishedAt',
                apiKey: NEWS_API_KEY,
                language: 'en'
            }
        });

        const articles = response.data.articles;
        console.log(`Found ${articles.length} articles.`);

        let newIncidentsCount = 0;

        for (const article of articles) {
            // Check if incident already exists (by title/url)
            const exists = await Incident.findOne({ title: article.title });
            if (exists) continue;

            // Analyze content for severity (Stricter filtering for Safety only)
            const text = (article.title + " " + (article.description || "")).toLowerCase();
            
            let type = null;
            let severity = 0;

            if (text.includes('riot') || text.includes('protest') || text.includes('mob') || text.includes('unrest')) {
                severity = 0.8; 
                type = 'riot';
            }
            else if (text.includes('murder') || text.includes('assault') || text.includes('rape') || text.includes('attack') || text.includes('shoot')) {
                severity = 0.95;
                type = 'assault';
            }
            else if (text.includes('theft') || text.includes('robbery') || text.includes('burglar') || text.includes('snatch')) {
                severity = 0.4;
                type = 'theft';
            }
            else if (text.includes('accident') || text.includes('crash') || text.includes('collision')) {
                severity = 0.6;
                type = 'accident';
            }
            else if (text.includes('flood') || text.includes('fire') || text.includes('earthquake') || text.includes('cyclone')) {
                severity = 0.9;
                type = 'natural_disaster';
            }

            // FILTER: If it doesn't match our safety categories, SKIP IT.
            // This prevents storing general news that might have been fetched by loose API matching.
            if (!type) {
                // console.log(`Skipping irrelevant article: ${article.title}`);
                continue; 
            }

            // GEOCODING LOGIC
            // 1. Try to find real coordinates using OpenStreetMap (Nominatim)
            let finalCoords = null;
            const geoResult = await getCoordinatesFromText(text, city);
            
            if (geoResult) {
                // Add a small jitter to avoid perfect overlap if multiple events happen at same landmark
                const jitterLat = (Math.random() - 0.5) * 0.001; 
                const jitterLng = (Math.random() - 0.5) * 0.001;
                finalCoords = [geoResult.lng + jitterLng, geoResult.lat + jitterLat];
            } else {
                // 2. Fallback: Scatter around city center if no specific location found
                 // Ensure the city name is relevant is actually mentioned before counting it
                if (!text.includes(city.name.toLowerCase())) {
                    // One last check: if the city name is "Kashmir" or broad region, we might accept articles
                    // that don't explicitly say "Kashmir" if the search query enforced it.
                    // But for safety, let's skip.
                   continue; 
                }
                const randomOffsetLat = (Math.random() - 0.5) * 0.05; 
                const randomOffsetLng = (Math.random() - 0.5) * 0.05;
                finalCoords = [ city.lng + randomOffsetLng, city.lat + randomOffsetLat ];
            }

            const newIncident = new Incident({
                title: article.title,
                type: type,
                location: {
                    type: 'Point',
                    coordinates: finalCoords
                },
                severity: severity,
                timestamp: new Date(article.publishedAt),
                source: 'NewsAPI'
            });

            await newIncident.save();
            newIncidentsCount++;
            
            // Respect Nominatim Rate Limit (1 req/sec)
            if (geoResult) await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Saved ${newIncidentsCount} new incidents from news.`);

    } catch (error) {
        console.error("❌ Error fetching news:", error.message);
    }
};
