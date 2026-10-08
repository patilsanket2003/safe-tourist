const daminiService = require('../services/ai/daminiService');

exports.processChat = async (req, res) => {
  try {
    const { message, location, route, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await daminiService.processMessage({
      message,
      location,
      route,
      conversationId
    });

    res.json(response);
  } catch (error) {
    console.error('Damini AI Controller Error:', error);
    res.status(500).json({
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
      status: 'DATA UNAVAILABLE',
      hazards: [],
      disruptions: [],
      sources: [],
      mapActions: []
    });
  }
};
