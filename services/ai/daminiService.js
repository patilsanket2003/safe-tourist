const { GoogleGenerativeAI } = require("@google/generative-ai");
const { daminiToolsDefinition, daminiToolsHandlers } = require('./daminiTools');

// Use environment variable or the provided key from prompt
const API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6II9hyEXCLVQBud0JjBtFc56CsJF0wPgfuW4JEljLcK0Q';
const genAI = new GoogleGenerativeAI(API_KEY);

const systemInstruction = `You are Damini AI, a Smart Tourist Safety Assistant for India and globally, but you are also a highly capable general-purpose AI assistant like ChatGPT or Gemini.
You are a friendly, professional female AI assistant. You can answer general knowledge questions, chat casually, and provide any help the user needs.
When the user specifically asks about safety, weather, traffic, or disruptions, you MUST use your tools (getNearbySafetyZones, getCurrentWeather, etc.) to get real data for their location.
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

  try {
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
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
    
    // Handle multiple tool calls in a loop (up to 3 times to prevent infinite loops)
    while (call && loopCount < 3) {
      console.log('Damini AI is calling tool:', call.name, call.args);
      
      const handler = daminiToolsHandlers[call.name];
      let functionResponseData = { error: 'Function not found' };
      
      if (handler) {
        // If args are missing location but we have it in context, inject it
        const args = call.args;
        if (!args.latitude && location?.latitude) args.latitude = location.latitude;
        if (!args.longitude && location?.longitude) args.longitude = location.longitude;
        
        functionResponseData = await handler(args);
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

    const textResponse = response.text();
    
    // Extract status based on keywords
    let status = 'LOW RISK';
    if (textResponse.includes('VERY HIGH RISK')) status = 'VERY HIGH RISK';
    else if (textResponse.includes('HIGH RISK')) status = 'HIGH RISK';
    else if (textResponse.includes('CAUTION')) status = 'CAUTION';
    else if (textResponse.includes('DATA UNAVAILABLE')) status = 'DATA UNAVAILABLE';

    return {
      message: textResponse,
      status: status,
      hazards: [], // We can populate this by inspecting function responses if needed
      disruptions: [],
      sources: ["SmartTourist Safety Engine"],
      mapActions: []
    };
  } catch (error) {
    console.error('Damini AI Service Error:', error);
    throw error;
  }
};
