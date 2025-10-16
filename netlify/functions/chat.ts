import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  console.log('Simple chat function called');
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      }
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    console.log('Request body:', body)

    // Simple response for testing
    const response = {
      type: 'message',
      content: 'Hello! This is a test response from the simple chat function.',
      employee: 'prime-boss'
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Simple chat error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error', details: String(error) })
    };
  }
}
