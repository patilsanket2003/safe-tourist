const axios = require('axios');
const GlobalHazard = require('../models/GlobalHazard');

class HazardDataImporter {
  constructor() {
    this.USGS_API = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson';
    // Using a reliable overpass instance
    this.OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  }

  async importAll() {
    console.log('🌍 Starting worldwide hazard data import...');
    try {
      await this.importUSGSEarthquakes();
      // We do a limited OSM import to avoid killing the Overpass server
      await this.importOSMVolcanoes();
      await this.importNASAHazards();
      await this.importOSMRestrictedAndProtected();
      console.log('✅ Hazard data import completed successfully.');
    } catch (error) {
      console.error('❌ Error during hazard data import:', error.message);
    }
  }

  /**
   * Imports global earthquakes magnitude 4.5+ from the past month
   */
  async importUSGSEarthquakes() {
    console.log('📡 Fetching USGS Earthquake data...');
    try {
      const response = await axios.get(this.USGS_API);
      const features = response.data.features;
      
      let importedCount = 0;
      let updatedCount = 0;

      for (const feature of features) {
        const props = feature.properties;
        const geom = feature.geometry; // GeoJSON Point
        
        const source_id = `usgs-${feature.id}`;
        
        let severity = 'Medium';
        if (props.mag >= 7.0) severity = 'Critical';
        else if (props.mag >= 6.0) severity = 'High';
        else if (props.mag < 5.0) severity = 'Low';

        // Expire earthquakes after 7 days from their time
        const eventDate = new Date(props.time);
        const expiresAt = new Date(eventDate.getTime() + 7 * 24 * 60 * 60 * 1000); 

        const hazardData = {
          name: props.title,
          type: 'earthquake',
          severity,
          geometry: geom,
          source: 'USGS',
          description: `Magnitude ${props.mag} earthquake. Tsunami alert: ${props.tsunami ? 'Yes' : 'No'}`,
          active: true,
          expires_at: expiresAt
        };

        const result = await GlobalHazard.updateOne(
          { source_id },
          { $set: hazardData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) importedCount++;
        else if (result.modifiedCount > 0) updatedCount++;
      }
      
      console.log(`✅ USGS Earthquakes: Added ${importedCount}, Updated ${updatedCount}`);
    } catch (error) {
      console.error('❌ Failed to import USGS earthquakes:', error.message);
    }
  }

  /**
   * Imports global active volcanoes from OpenStreetMap
   */
  async importOSMVolcanoes() {
    console.log('🌋 Fetching OpenStreetMap Volcano data...');
    try {
      // Overpass QL to find nodes tagged natural=volcano
      const query = `
        [out:json][timeout:25];
        node["natural"="volcano"](if:t["volcano:status"]=="active" || t["volcano:status"]=="eruption");
        out center;
      `;
      
      const response = await axios.get(
        `${this.OVERPASS_API}?data=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'SmartTouristSafetyApp/1.0' } }
      );
      
      const elements = response.data.elements;
      let importedCount = 0;

      for (const el of elements) {
        const source_id = `osm-node-${el.id}`;
        const name = el.tags.name || 'Unknown Active Volcano';
        const status = el.tags['volcano:status'];
        
        const severity = status === 'eruption' ? 'Critical' : 'High';
        
        const hazardData = {
          name,
          type: 'volcano',
          severity,
          geometry: {
            type: 'Point',
            coordinates: [el.lon, el.lat]
          },
          source: 'OpenStreetMap',
          description: `OSM Active/Erupting Volcano. Type: ${el.tags['volcano:type'] || 'Unknown'}`,
          active: true,
          // Volcanoes don't strictly expire, but we keep them active
        };

        const result = await GlobalHazard.updateOne(
          { source_id },
          { $set: hazardData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) importedCount++;
      }
      
      console.log(`✅ OSM Volcanoes: Imported/Updated ${importedCount} volcanoes.`);
    } catch (error) {
      console.error('❌ Failed to import OSM volcanoes:', error.message);
    }
  }

  /**
   * Imports global wildfires, floods, storms, and landslides from NASA EONET
   */
  async importNASAHazards() {
    console.log('🔥 Fetching NASA EONET Hazards...');
    try {
      const response = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events?status=open');
      const events = response.data.events;
      let importedCount = 0;

      for (const event of events) {
        if (!event.categories || event.categories.length === 0) continue;
        if (!event.geometry || event.geometry.length === 0) continue;

        const categoryTitle = event.categories[0].title;
        let type = '';
        let severity = 'High';
        
        if (categoryTitle.includes('Wildfire')) {
          type = 'forest fire';
          severity = 'Critical';
        } else if (categoryTitle.includes('Storm') || categoryTitle.includes('Cyclone')) {
          type = 'storm';
          severity = 'Critical';
        } else if (categoryTitle.includes('Flood')) {
          type = 'flood';
          severity = 'High';
        } else if (categoryTitle.includes('Landslide')) {
          type = 'landslide';
          severity = 'Critical';
        } else {
          continue; // Skip categories we don't handle
        }

        const source_id = `nasa-eonet-${event.id}`;
        const geom = event.geometry[event.geometry.length - 1]; // Get latest geometry

        if (!geom || !geom.coordinates) continue;

        let coords = geom.coordinates;
        if (geom.type === 'Point' && Array.isArray(coords)) {
          let [lng, lat] = coords;
          if (typeof lng !== 'number' || typeof lat !== 'number') continue;
          while (lng > 180) lng -= 360;
          while (lng < -180) lng += 360;
          if (lat < -90 || lat > 90) continue;
          coords = [lng, lat];
        }

        const hazardData = {
          name: event.title,
          type: type,
          severity: severity,
          geometry: {
            type: geom.type,
            coordinates: coords
          },
          source: 'NASA EONET',
          description: `Active ${categoryTitle}: ${event.title}`,
          active: true
        };

        const result = await GlobalHazard.updateOne(
          { source_id },
          { $set: hazardData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) importedCount++;
      }
      
      console.log(`✅ NASA EONET: Imported/Updated ${importedCount} live hazards.`);
    } catch (error) {
      console.error('❌ Failed to import NASA EONET hazards:', error.message);
    }
  }

  /**
   * Imports restricted and protected areas from OpenStreetMap
   */
  async importOSMRestrictedAndProtected() {
    console.log('🛡️ Fetching OSM Restricted & Protected Areas...');
    try {
      // Overpass QL to find military zones and nature reserves specifically in India
      // (Global query without limits will crash the free public Overpass server)
      const query = `
        [out:json][timeout:50];
        area["ISO3166-1"="IN"][admin_level=2]->.searchArea;
        (
          nwr["landuse"="military"](area.searchArea);
          nwr["military"="danger_area"](area.searchArea);
          nwr["boundary"="national_park"](area.searchArea);
          nwr["leisure"="nature_reserve"](area.searchArea);
        );
        out center;
      `;
      
      const response = await axios.get(
        `${this.OVERPASS_API}?data=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'SmartTouristSafetyApp/1.0' } }
      );
      
      const elements = response.data.elements;
      let importedCount = 0;

      for (const el of elements) {
        if (!el.center && (!el.lat || !el.lon)) continue;
        
        const lat = el.center ? el.center.lat : el.lat;
        const lon = el.center ? el.center.lon : el.lon;

        const isRestricted = el.tags.military || el.tags.landuse === 'military';
        const type = isRestricted ? 'restricted area' : 'protected area';
        const severity = isRestricted ? 'Critical' : 'High';
        const name = el.tags.name || (isRestricted ? 'Restricted Military Zone' : 'Protected Wildlife Reserve');
        
        const source_id = `osm-area-${el.id}`;

        // Specifically exclude Anand Nagar / Kasarvadavali false-positive military zone (OSM area 554975362)
        if (
          el.id === 554975362 ||
          el.id === '554975362' ||
          (isRestricted && lat >= 19.23 && lat <= 19.29 && lon >= 72.96 && lon <= 73.01)
        ) {
          console.log(`⏩ [HazardImporter] Skipping excluded Anand Nagar / Kasarvadavali military area: ${source_id}`);
          continue;
        }
        
        const hazardData = {
          name,
          type: type,
          severity: severity,
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          source: 'OpenStreetMap',
          description: `OSM ${type}: ${name}`,
          active: true
        };

        const result = await GlobalHazard.updateOne(
          { source_id },
          { $set: hazardData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) importedCount++;
      }
      
      console.log(`✅ OSM Areas: Imported/Updated ${importedCount} restricted/protected zones.`);
    } catch (error) {
      console.error('❌ Failed to import OSM areas:', error.message);
    }
  }

  // Can easily add more APIs here...
  // e.g., GDACS (Floods/Cyclones), OpenWeatherMap (requires API key)
}

module.exports = new HazardDataImporter();
