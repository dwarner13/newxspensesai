import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, employeeSlug, message, stream = false } = body;

    console.log('Chat request:', { userId, employeeSlug, message, stream });

    // Simple mock response for testing
    const responses = {
      'prime-boss': [
        "Hello! I'm Prime, your AI assistant. How can I help you today?",
        "I can coordinate with our team of AI specialists. What do you need assistance with?",
        "Let me connect you with the right AI employee for your request.",
        "I'm here to help manage your financial tasks and coordinate with our specialized AI team."
      ],
      'byte-doc': [
        "I'm Byte, your document processing specialist. I can help extract data from receipts and statements.",
        "I'll analyze your documents and extract key information for you.",
        "Document processing is my specialty. What do you need me to analyze?"
      ],
      'tag-ai': [
        "I'm Tag, your categorization expert. I can help organize your expenses and transactions.",
        "Let me categorize your financial data to help you stay organized.",
        "Expense categorization is my forte. What needs to be sorted?"
      ],
      'crystal-analytics': [
        "I'm Crystal, your analytics specialist. I can provide insights into your financial patterns.",
        "Let me analyze your data and provide actionable insights.",
        "I specialize in turning your financial data into meaningful analytics."
      ],
      'ledger-tax': [
        "I'm Ledger, your tax specialist. I can help with tax planning and compliance.",
        "Tax optimization and compliance are my areas of expertise.",
        "I'll help ensure you're maximizing your tax benefits and staying compliant."
      ]
    };

    const employeeResponses = responses[employeeSlug as keyof typeof responses] || responses['prime-boss'];
    const randomResponse = employeeResponses[Math.floor(Math.random() * employeeResponses.length)];

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = {
      message: randomResponse,
      employeeSlug,
      userId,
      timestamp: new Date().toISOString(),
      success: true
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Chat function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};