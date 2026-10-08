const axios = require('axios');
const { MAPBOX_ACCESS_TOKEN } = require('../config/config');

/**
 * Get human-readable place name from coordinates using Mapbox
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string>}
 */
async function getGridName(lat, lng) {
    // If no token, return fallback
    if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN.startsWith('YOUR_')) {
        return `Zone [${lat.toFixed(3)}, ${lng.toFixed(3)}]`;
    }

    try {
        // Types: neighborhood, locality, poi, place
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
        const params = {
            access_token: MAPBOX_ACCESS_TOKEN,
            types: 'neighborhood,locality,place,poi',
            limit: 1
        };

        const response = await axios.get(url, { params });
        
        if (response.data && response.data.features && response.data.features.length > 0) {
            return response.data.features[0].text; // e.g., "Adajan"
        }
    } catch (error) {
        console.error("Mapbox Error:", error.message);
    }
    
    return `Zone [${lat.toFixed(3)}, ${lng.toFixed(3)}]`;
}

module.exports = { getGridName };
