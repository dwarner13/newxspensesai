/**
 * Byte Warm Function - Keeps Byte's chat function warm
 * 
 * Byte Speed Mode v2: Prevents cold starts by pinging Byte's chat function every minute
 * 
 * Schedule: Run every minute via Netlify Scheduled Functions
 * 
 * Configuration (netlify.toml):
 * [[plugins]]
 * package = "@netlify/plugin-scheduled-functions"
 * 
 * [functions.byte-warm]
 * schedule = "every 1 minute"
 */

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Byte Speed Mode v2: Warm Byte's chat function to prevent cold starts
  const chatFunctionUrl = process.env.NETLIFY_DEV 
    ? 'http://localhost:8888/.netlify/functions/chat'
    : `${process.env.URL || 'https://your-site.netlify.app'}/.netlify/functions/chat`;
  
  try {
    // Send warm ping request
    const response = await fetch(chatFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ping: 'byte-docs',
        userId: 'warm-function', // Dummy user ID for warm requests
      }),
    });
    
    const result = await response.json();
    
    console.log('[Byte Warm] Function warmed:', {
      status: response.status,
      warmed: result.warmed,
      timestamp: new Date().toISOString(),
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        warmed: result.warmed,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('[Byte Warm] Failed to warm function:', error);
    
    // Don't fail the scheduled function - just log the error
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

