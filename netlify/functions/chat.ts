import type { Handler } from '@netlify/functions'
import { PassThrough } from 'stream'

export const handler: Handler = async (event) => {
  console.log('Working chat function called');
  
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
    const { userId, messages } = body
    console.log('Request received:', { userId, messageCount: messages?.length });

    // Get the last user message
    const lastMessage = messages?.[messages.length - 1];
    const userInput = lastMessage?.content || 'Hello';

    // Create streaming response
    const stream = new PassThrough();
    
    // Set headers for streaming
    const headers = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    };

    // Generate AI response
    let response = '';
    if (userInput.toLowerCase().includes('hi') || userInput.toLowerCase().includes('hello')) {
      response = `Hello! I'm 👑 Prime, your AI CEO. I orchestrate our entire 30-member AI enterprise to deliver elite-level financial intelligence. What can my team accomplish for you today?`;
    } else if (userInput.toLowerCase().includes('help')) {
      response = `I can help you with:
• Financial analysis and insights
• Transaction categorization
• Document processing
• Tax optimization
• Business intelligence
• And much more!

What specific task would you like me to handle?`;
    } else {
      response = `I understand you're asking about "${userInput}". As your AI CEO, I can help you with financial management, document processing, analysis, and more. How can I assist you specifically?`;
    }
    
    // Stream the response character by character for effect
    const words = response.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      stream.write(`data: ${JSON.stringify({ 
        type: 'message', 
        content: currentText,
        employee: 'prime-boss'
      })}\n\n`);
      
      // Small delay between words
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Send completion signal
    stream.write(`data: ${JSON.stringify({ type: 'done', employee: 'prime-boss' })}\n\n`);
    stream.end();

    return {
      statusCode: 200,
      headers,
      body: stream
    };

  } catch (error) {
    console.error('Chat function error:', error);
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