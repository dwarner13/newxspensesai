/**
 * Centralized Chat Runtime - Netlify Function
 * ============================================
 * Streaming chat endpoint for all AI employees
 * 
 * @netlify-function chat
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { buildContext } from '../../chat_runtime/contextBuilder';
import { MemoryManager } from '../../chat_runtime/memory';
import { redact } from '../../chat_runtime/redaction';
import { delegateTool, delegateToolDefinition } from '../../chat_runtime/tools/delegate';

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
      employeeSlug = 'prime-boss',
      message,
      stream = true,
    } = request;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }

    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'message required' }),
      };
    }

    // Initialize memory manager
    const memory = new MemoryManager(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get or create session
    const session = await memory.getOrCreateSession(
      userId,
      employeeSlug,
      `Chat with ${employeeSlug}`
    );

    // Build context
    const contextResult = await buildContext({
      userId,
      employeeSlug,
      sessionId: session.id,
      userInput: message,
      topK: 5,
      tokenBudget: 6000,
      includeRAG: true,
      includeSummary: true,
      includeFacts: true,
      recentMessageLimit: 10,
    });

    // Redact user message before saving
    const { redacted: redactedMessage, tokens: redactionTokens } = redact(message);

    // Save user message
    const userMsg = await memory.saveMessage({
      session_id: session.id,
      user_id: userId,
      role: 'user',
      content: message,
      redacted_content: redactedMessage,
      tokens: Math.ceil(message.length / 4), // Rough estimate
      metadata: {
        redaction_tokens: Array.from(redactionTokens.entries()),
      },
    });

    // If not streaming, return complete response
    if (!stream) {
      return await handleNonStreamingChat(
        contextResult,
        memory,
        session,
        userId,
        headers
      );
    }

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = '';
    let totalTokens = 0;

    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                session_id: session.id,
                employee: {
                  slug: employeeSlug,
                  title: contextResult.sources.employee.title,
                  emoji: contextResult.sources.employee.emoji,
                },
              })}\n\n`
            )
          );

          // Get employee config
          const employee = contextResult.sources.employee;

          // Check agent depth (prevent infinite loops)
          const agentDepth = parseInt(event.headers['x-agent-depth'] || '0');
          const requestId = event.headers['x-request-id'] || `req-${Date.now()}`;

          // Guard: Max depth
          if (agentDepth > 2) {
            fullResponse = 'I cannot delegate further. Maximum delegation depth reached.';
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text', content: fullResponse })}\n\n`
              )
            );
          } else {
            // Check if this employee can use tools
            const canUseDelegation = employee.tools_allowed?.includes('delegate') || false;

            // Build tools array
            const tools = canUseDelegation ? [delegateToolDefinition] : undefined;

            // Tool-calling loop
            let conversationMessages = [...contextResult.messages];
            let loopCount = 0;
            const MAX_TOOL_LOOPS = 5;

            while (loopCount < MAX_TOOL_LOOPS) {
              // Call OpenAI
              const completion = await openai.chat.completions.create({
                model: employee.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: conversationMessages,
                temperature: employee.temperature || 0.7,
                max_tokens: employee.max_tokens || 2000,
                stream: false, // Non-streaming for tool calls
                tools,
                user: userId,
              });

              const choice = completion.choices[0];
              const assistantMessage = choice?.message;

              if (!assistantMessage) break;

              // Check for tool calls
              const toolCalls = assistantMessage.tool_calls;

              if (!toolCalls || toolCalls.length === 0) {
                // No tool calls, stream final response
                const content = assistantMessage.content || '';
                fullResponse = content;

                // Stream it token by token for UX
                const words = content.split(' ');
                for (const word of words) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'text', content: word + ' ' })}\n\n`
                    )
                  );
                }

                break;
              }

              // Execute tool calls
              conversationMessages.push(assistantMessage);

              for (const toolCall of toolCalls) {
                if (toolCall.function.name === 'delegate') {
                  try {
                    // Send tool call notification
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'tool_call',
                          tool: {
                            id: toolCall.id,
                            name: toolCall.function.name,
                            args: JSON.parse(toolCall.function.arguments),
                          },
                        })}\n\n`
                      )
                    );

                    // Parse arguments
                    const args = JSON.parse(toolCall.function.arguments);

                    // Execute delegate tool
                    const result = await delegateTool(args, {
                      userId,
                      sessionId: session.id,
                      employeeSlug,
                      depth: agentDepth,
                      requestId,
                    });

                    // Send tool result
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'tool_result',
                          tool_call_id: toolCall.id,
                          result: result.summary,
                        })}\n\n`
                      )
                    );

                    // Add tool result to conversation
                    conversationMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: JSON.stringify(result),
                    });
                  } catch (error) {
                    const err = error as Error;
                    console.error(`[TOOL_ERROR] ${toolCall.id}:`, err);

                    // Add error as tool result
                    conversationMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({
                        success: false,
                        error: err.message,
                      }),
                    });
                  }
                }
              }

              loopCount++;
            }

            // If we hit max loops, provide fallback
            if (loopCount >= MAX_TOOL_LOOPS && !fullResponse) {
              fullResponse = 'I coordinated with specialists but need to simplify my approach. Please try a more specific request.';
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text', content: fullResponse })}\n\n`
                )
              );
            }
          }

          // Save assistant message
          await memory.saveMessage({
            session_id: session.id,
            user_id: userId,
            role: 'assistant',
            content: fullResponse,
            tokens: Math.ceil(fullResponse.length / 4),
            metadata: {
              sources_used: contextResult.sources.retrievedChunks.length,
              facts_included: contextResult.sources.pinnedFacts.length,
            },
          });

          // Log usage
          await supabase.from('chat_usage_log').insert({
            user_id: userId,
            session_id: session.id,
            employee_slug: employeeSlug,
            prompt_tokens: contextResult.tokensUsed,
            completion_tokens: Math.ceil(fullResponse.length / 4),
            total_tokens: contextResult.tokensUsed + Math.ceil(fullResponse.length / 4),
            model: employee.model || 'gpt-4o-mini',
            success: true,
          });

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                total_tokens: totalTokens,
                message_id: userMsg.id,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          const err = error as Error;
          console.error('Streaming error:', err);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: err.message,
              })}\n\n`
            )
          );

          controller.close();
        }
      },
    });

    // Return streaming response
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: streamResponse,
    };
  } catch (error) {
    const err = error as Error;
    console.error('Chat function error:', err);

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

// ============================================================================
// Non-Streaming Handler
// ============================================================================

async function handleNonStreamingChat(
  contextResult: any,
  memory: MemoryManager,
  session: any,
  userId: string,
  headers: Record<string, string>
) {
  const employee = contextResult.sources.employee;

  // Get complete response
  const completion = await openai.chat.completions.create({
    model: employee.model || 'gpt-4o-mini',
    messages: contextResult.messages,
    temperature: employee.temperature || 0.7,
    max_tokens: employee.max_tokens || 2000,
    stream: false,
    user: userId,
  });

  const assistantMessage = completion.choices[0]?.message?.content || '';

  // Save assistant message
  const savedMsg = await memory.saveMessage({
    session_id: session.id,
    user_id: userId,
    role: 'assistant',
    content: assistantMessage,
    tokens: completion.usage?.completion_tokens || 0,
  });

  // Log usage
  await supabase.from('chat_usage_log').insert({
    user_id: userId,
    session_id: session.id,
    employee_slug: employee.slug,
    prompt_tokens: completion.usage?.prompt_tokens || 0,
    completion_tokens: completion.usage?.completion_tokens || 0,
    total_tokens: completion.usage?.total_tokens || 0,
    model: employee.model || 'gpt-4o-mini',
    success: true,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      session_id: session.id,
      message_id: savedMsg.id,
      content: assistantMessage,
      employee: {
        slug: employee.slug,
        title: employee.title,
        emoji: employee.emoji,
      },
      tokens: {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      },
    }),
  };
}
