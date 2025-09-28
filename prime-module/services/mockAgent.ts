export function useMockAgent() {
  const sendMessage = async (message: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock responses based on message content
    const responses = {
      greeting: [
        "Hello! I'm Prime Bot, your AI assistant. I'm currently running in mock mode for testing.",
        "Hi there! 👋 I'm here to help you test the Prime module. What would you like to know?",
        "Greetings! I'm Prime Bot, ready to assist you with your queries."
      ],
      help: [
        "I can help you with various tasks! Here's what I can do:\n\n• Answer questions\n• Provide information\n• Have conversations\n• Assist with XspensesAI features\n\n*Note: This is a mock response for testing.*",
        "I'm your AI assistant! I can help with:\n\n• General questions\n• Financial advice\n• Document processing\n• Data analysis\n\nCurrently running in isolated test mode.",
        "I'm Prime Bot, designed to help you with:\n\n• Conversational AI\n• Smart data processing\n• Financial insights\n• Task automation\n\n*Running in mock mode for development.*"
      ],
      default: [
        `I received your message: "${message}"\n\nThis is a mock response from Prime Bot. The isolated module is working correctly!`,
        `You said: "${message}"\n\nI'm processing this in mock mode. The Prime module integration is functioning as expected.`,
        `Thanks for testing! Your message "${message}" was received.\n\nThe Prime Bot module is ready for integration with real AI services.`,
        `Mock response for: "${message}"\n\n✅ Prime module is working\n✅ Chat interface is functional\n✅ Ready for real AI integration`
      ]
    };
    
    // Determine response type based on message content
    const lowerMessage = message.toLowerCase();
    let responseType: keyof typeof responses = 'default';
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      responseType = 'greeting';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('capabilities')) {
      responseType = 'help';
    }
    
    const responseArray = responses[responseType];
    const randomResponse = responseArray[Math.floor(Math.random() * responseArray.length)];
    
    return randomResponse;
  };

  return { sendMessage };
}
