import type { Handler } from '@netlify/functions';
import { runAgent } from '../../src/agent/kernel';
import { requireAuth } from '../../src/server/auth';
import { checkRateLimit } from '../../src/server/rateLimit';
import { handleError, AuthenticationError, RateLimitError } from '../../src/server/errors';
import { isPrimeEnabled } from '../../src/env';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
    };
  }
  
  // Check feature flag
  if (!isPrimeEnabled()) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Feature not enabled' }),
    };
  }
  
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    // Authenticate user
    const authResult = await requireAuth(event as any);
    if (!authResult.ok) {
      throw new AuthenticationError(authResult.error.message);
    }
    const user = authResult.value;
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(user.id);
    if (!rateLimitResult.ok) {
      throw new RateLimitError(
        rateLimitResult.error.message,
        rateLimitResult.error.details?.resetAt
      );
    }
    
    // Parse request body
    const { message, conversationId, profile = 'prime' } = JSON.parse(event.body || '{}');
    
    if (!message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Message required' }),
      };
    }
    
    // Build agent config
    const config = {
      name: 'Prime',
      persona: 'Efficient, privacy-focused assistant',
      goals: [
        'Protect user privacy',
        'Provide accurate information',
        'Complete tasks efficiently',
      ],
      allowedTools: ['delete_my_data', 'export_my_data'],
      outputStyle: 'concise' as const,
      memoryScope: 'user' as const,
    };
    
    // Run agent
    const stream = await runAgent(config, message, {
      userId: user.id,
      conversationId,
    });
    
    // Convert stream to response
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const responseBody = Buffer.concat(chunks);
    
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: responseBody.toString(),
    };
    
  } catch (error) {
    const errorResponse = handleError(error);
    return {
      statusCode: errorResponse.status,
      headers: corsHeaders,
      body: await errorResponse.text(),
    };
  }
};
