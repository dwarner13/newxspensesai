import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 500 } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Messages array is required' })
      };
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'OpenAI API error', details: errorData })
      };
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Chat API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
