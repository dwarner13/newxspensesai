/**
 * Embeddings Endpoint - Centralized
 * ==================================
 * Generate and store embeddings for RAG (Retrieval-Augmented Generation)
 * 
 * @netlify-function embed
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ============================================================================
// Main Handler
// ============================================================================

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request
    const request = JSON.parse(event.body || '{}');
    const {
      userId,
      text,
      metadata = {},
      owner_scope = 'global',
      source_type = 'document',
      source_id,
    } = request;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }

    if (!text || typeof text !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'text required' }),
      };
    }

    if (text.length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'text must be at least 10 characters' }),
      };
    }

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const embedding = embeddingResponse.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    // Store in database
    const { data: inserted, error: insertError } = await supabase
      .from('memory_embeddings')
      .insert({
        user_id: userId,
        owner_scope,
        source_type,
        source_id: source_id || null,
        content: text,
        embedding,
        metadata,
        tokens: Math.ceil(text.length / 4), // Rough estimate
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    // Return success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        embedding_id: inserted.id,
        tokens: embeddingResponse.usage?.total_tokens || 0,
        dimensions: embedding.length,
        metadata: {
          owner_scope,
          source_type,
          source_id,
        },
      }),
    };
  } catch (error) {
    const err = error as Error;
    console.error('Embed function error:', err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: err.message,
      }),
    };
  }
};

