const { GoogleGenerativeAI } = require("@google/generative-ai");
const { daminiToolsDefinition, daminiToolsHandlers } = require('./daminiTools');

// Use environment variable or valid key
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDLGoxxHuq7K_ntf2kT5UvpN5sfXwhpEYs';
const genAI = new GoogleGenerativeAI(API_KEY);

const systemInstruction = `You are Damini AI, a Smart Tourist Safety Assistant for India and globally, but you are also a highly capable general-purpose AI assistant like ChatGPT or Gemini.
You are a friendly, professional female AI assistant. You can answer general knowledge questions, chat casually, and provide any help the user needs.
When the user specifically asks about safety, weather, traffic, or disruptions, you MUST use your tools (getNearbySafetyZones, getCurrentWeather, etc.) to get real data for their location.
When the user asks for nearby places, amenities, food, or services (such as restaurants, cafes, hotels, ATMs, pharmacies, hospitals, police stations, transport), you MUST use the getNearbyPlaces tool to find real places near their location and present them clearly with their names, approximate distance, and address.
For safety queries ONLY:
- NEVER invent or hallucinate accidents, protests, riots, traffic, floods, or weather. If you don't have data, say "I couldn't verify current information for that area."
- Never say "100% safe". Say "No significant verified hazard was found."
- Categorize risk as: LOW RISK, CAUTION, HIGH RISK, VERY HIGH RISK, or DATA UNAVAILABLE.
If the user says "Help me" or "Emergency", output exactly "ACTIVATING_EMERGENCY_MODE" in your response.
For all other general questions (general knowledge, chitchat, translation, advice, etc.), just answer them normally, accurately, and naturally without mentioning safety risks unless relevant.
`;

const axios = require('axios');

exports.processMessage = async ({ message, location, route, conversationId }) => {
  let locationContext = `Lat: ${location?.latitude || 'Unknown'}, Lng: ${location?.longitude || 'Unknown'}`;
  
  // Reverse geocode to get the exact address so the AI has hyper-local context without hardcoding
  if (location?.latitude && location?.longitude) {
    try {
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'SmartTouristSafetyApp/1.0' }
      });
      if (geoRes.data && geoRes.data.display_name) {
        locationContext += `\nExact Address: ${geoRes.data.display_name}`;
      }
    } catch (e) {
      console.error("Reverse Geocoding failed:", e.message);
    }
  }

  const activeKey = process.env.GEMINI_API_KEY || API_KEY;
  const client = new GoogleGenerativeAI(activeKey);
  const candidateModels = [
    process.env.GEMINI_MODEL || "gemini-2.5-flash",
    "gemini-2.5-flash",
    "gemini-3-flash-preview"
  ];

  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = client.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: daminiToolsDefinition }] 
      });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `Context: My current location is ${locationContext}.` }]
          },
          {
            role: "model",
            parts: [{ text: "Understood. I will use this location context for safety checks." }]
          }
        ],
      });

      // Send the user's message
      let result = await chat.sendMessage(message);
      let response = result.response;

      const calls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
      let call = (calls && calls.length > 0) ? calls[0] : null;
      let loopCount = 0;
      
      let capturedPlaces = [];

      // Handle multiple tool calls in a loop (up to 3 times to prevent infinite loops)
      while (call && loopCount < 3) {
        console.log(`Damini AI (${modelName}) is calling tool:`, call.name, call.args);
        
        const handler = daminiToolsHandlers[call.name];
        let functionResponseData = { error: 'Function not found' };
        
        if (handler) {
          const args = { ...call.args };
          if (!args.latitude && location?.latitude) args.latitude = location.latitude;
          if (!args.longitude && location?.longitude) args.longitude = location.longitude;
          
          functionResponseData = await handler(args);
          if (call.name === 'getNearbyPlaces' && Array.isArray(functionResponseData?.places)) {
            const existingIds = new Set(capturedPlaces.map(p => p.id || p.name));
            functionResponseData.places.forEach(p => {
              if (!existingIds.has(p.id || p.name)) {
                capturedPlaces.push(p);
                existingIds.add(p.id || p.name);
              }
            });
          }
        }
        
        // Send the tool response back to the model
        result = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: functionResponseData
          }
        }]);
        
        response = result.response;
        const nextCalls = typeof response.functionCalls === 'function' ? response.functionCalls() : response.functionCalls;
        call = (nextCalls && nextCalls.length > 0) ? nextCalls[0] : null;
        loopCount++;
      }

      let textResponse = '';
      try {
        textResponse = response.text() || '';
      } catch (_) {}

      // If textResponse is empty after tool execution, request the model's text summary
      if (!textResponse.trim()) {
        try {
          const finalResult = await chat.sendMessage(
            "Please provide a helpful, friendly, and complete text response summarizing the best places and answers found above for the user."
          );
          textResponse = finalResult.response.text() || '';
        } catch (_) {}
      }

      // If still empty and places were captured, construct a rich, detailed message
      if (!textResponse.trim() && capturedPlaces.length > 0) {
        textResponse = `Here are the top places found near your current location:\n\n` +
          capturedPlaces.slice(0, 5).map((p, idx) => 
            `${idx + 1}. **${p.name}** (${p.distanceKm} km away)\n` +
            `   📍 ${p.shortAddress || p.address}\n` +
            `   ⭐ Rating: ${p.rating} • ${p.categoryTag || p.category}`
          ).join('\n\n') +
          `\n\nTap on any place card above to view Google Maps directions or detailed information!`;
      }

      // Only set status for safety/risk questions. Don't show safety badge for tourist place lookups!
      const isSafetyQuery = /safe|risk|hazard|danger|crime|emergency|warning|threat|alert|secure/i.test(message);
      let status = undefined;
      if (isSafetyQuery) {
        status = 'LOW RISK';
        if (textResponse.includes('VERY HIGH RISK')) status = 'VERY HIGH RISK';
        else if (textResponse.includes('HIGH RISK')) status = 'HIGH RISK';
        else if (textResponse.includes('CAUTION')) status = 'CAUTION';
        else if (textResponse.includes('DATA UNAVAILABLE')) status = 'DATA UNAVAILABLE';
      }

      return {
        message: textResponse.trim() || "Here are the recommended places near your current location:",
        status: status,
        places: capturedPlaces,
        hazards: [],
        disruptions: [],
        sources: ["SmartTourist Safety Engine"],
        mapActions: []
      };
    } catch (error) {
      console.warn(`Model ${modelName} encountered error:`, error.message?.substring(0, 100));
      lastError = error;
      // If error is 429 quota or 503 unavailable, try next candidate
      if (error.status === 429 || error.status === 503 || error.message?.includes('Quota') || error.message?.includes('429')) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('All AI models failed');
};
