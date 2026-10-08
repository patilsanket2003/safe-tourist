const { GoogleGenerativeAI } = require("@google/generative-ai");
const { daminiToolsDefinition, daminiToolsHandlers } = require('./daminiTools');

// Use environment variable or the provided key from prompt
const API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6II9hyEXCLVQBud0JjBtFc56CsJF0wPgfuW4JEljLcK0Q';
const genAI = new GoogleGenerativeAI(API_KEY);

const systemInstruction = `You are Damini AI, a Smart Tourist Safety Assistant for India and globally. 
You are a friendly, professional female AI assistant focused on tourist safety.
You MUST use your tools (getNearbySafetyZones, getCurrentWeather, etc.) to get real data for the user's location or route when they ask about safety, weather, traffic, or disruptions.
NEVER invent or hallucinate accidents, protests, riots, traffic, floods, or weather. If you don't have data, say "I couldn't verify current information for that area."
Never say "100% safe" or "Nothing will happen". Say "No significant verified hazard was found in the available data."
Categorize risk as: LOW RISK, CAUTION, HIGH RISK, VERY HIGH RISK, or DATA UNAVAILABLE.
If the user says "Help me" or "Emergency", output exactly "ACTIVATING_EMERGENCY_MODE" in your response (the frontend will catch this).
`;

exports.processMessage = async ({ message, location, route, conversationId }) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: daminiToolsDefinition }] 
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Context: My current location is Lat: ${location?.latitude || 'Unknown'}, Lng: ${location?.longitude || 'Unknown'}.` }]
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

    // Check if the model wants to call a function
    let call = response.functionCalls ? response.functionCalls()[0] : null;
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
      call = response.functionCalls ? response.functionCalls()[0] : null;
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
