import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, userId } = JSON.parse(event.body || '{}');
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Mock SSE response with streaming simulation
    const mockResponses = [
      { type: 'text', content: `Hello! I'm Prime Bot. ` },
      { type: 'text', content: `You said: "${message}". ` },
      { type: 'text', content: `I'm currently in mock mode for testing. ` },
      { type: 'text', content: `The isolated module is working correctly! ` },
      { type: 'text', content: `Ready for real AI integration.` },
      { type: 'done' }
    ];

    // Simulate streaming by sending responses with delays
    const streamResponse = mockResponses.map(response => 
      `data: ${JSON.stringify(response)}\n\n`
    ).join('');

    return {
      statusCode: 200,
      headers,
      body: streamResponse
    };
  } catch (error) {
    console.error('Agent mock error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
