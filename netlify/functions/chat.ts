/**
 * 💬 Unified Chat Endpoint
 * 
 * Complete chat system with:
 * - 🛡️ Unified Guardrails (moderation + PII masking) - ALL employees protected
 * - Employee routing (Prime, Byte, Crystal, Finley, Goalie, Liberty, Blitz, etc.)
 * - Memory retrieval and storage
 * - Streaming responses (SSE)
 * - Session management
 * 
 * GUARDRAILS INTEGRATION:
 * - All user messages go through runInputGuardrails() BEFORE routing/model calls
 * - PII masking happens FIRST (before any API calls or storage)
 * - Content moderation and jailbreak detection run on masked text
 * - All employees (Prime, Liberty, Tag, etc.) share the same protection layer
 * - Blocked messages return safe, user-friendly responses (no crashes)
 * 
 * API Format:
 * POST /.netlify/functions/chat
 * Body: { userId, employeeSlug?, message, sessionId?, stream?: true }
 * 
 * Response: Streaming SSE with tokens, or JSON if stream=false
 * 
 * SESSION FLOW:
 * 1. Frontend generates a stable sessionId per user + employee (stored in localStorage)
 * 2. Frontend passes sessionId in request body: { sessionId: "uuid-here", ... }
 * 3. Backend calls ensureSession(sb, userId, sessionId, employeeSlug):
 *    - If sessionId exists and is valid → reuse it
 *    - If sessionId missing/invalid → create new session in chat_sessions table
 * 4. Backend calls getRecentMessages(sessionId) to load conversation history
 * 5. Backend saves new messages to chat_messages table with session_id
 * 6. Next request with same sessionId will load previous messages → maintains context
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { 
  getGuardrailConfig, 
  runInputGuardrails, 
  sendBlockedResponse, 
  type GuardrailContext 
} from './_shared/guardrails-unified.js';
import { routeToEmployee } from './_shared/router.js';
// Phase 2.1: Use unified memory API
import { 
  getMemory, 
  queueMemoryExtraction,
  // Keep backward compatibility exports for now
  recall,
  upsertFact,
  extractFactsFromMessages
} from './_shared/memory.js';
import { ensureSession, getRecentMessages } from './_shared/session.js';
import { buildResponseHeaders } from './_shared/headers.js';
import { getEmployeeModelConfig } from './_shared/employeeModelConfig.js';
import OpenAI from 'openai';
// Import tool system for Tag tools
import { toOpenAIToolDefs, pickTools, executeTool } from '../../src/agent/tools/index.js';
import type { ToolContext } from '../../src/agent/tools/index.js';
// Rate limiting (optional - fails open if not available)
// Note: Import handled dynamically in handler to avoid breaking if module doesn't exist

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  userId: string;
  employeeSlug?: string | null;
  message: string;
  sessionId?: string;
  stream?: boolean;
  systemPromptOverride?: string; // Custom system prompt from frontend (e.g., category/transaction context)
}

// ============================================================================
// INITIALIZATION
// ============================================================================

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) {
  console.warn('[Chat] OpenAI API key not configured');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event, context) => {
  // CORS headers (will be enhanced with guardrail headers later)
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}') as ChatRequest;
    const { userId, employeeSlug, message, sessionId, stream = true, systemPromptOverride } = body;

    // Validate required fields
    if (!userId || !message) {
      return {
        statusCode: 400,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'userId and message are required' }),
      };
    }

    // ========================================================================
    // 0.5. RATE LIMITING (Optional - fails open if not available)
    // ========================================================================
    try {
      const rateLimitModule = await import('./_shared/rate-limit.js');
      if (rateLimitModule.assertWithinRateLimit) {
        await rateLimitModule.assertWithinRateLimit(userId, 20); // 20 requests per minute
      }
    } catch (rateLimitError: any) {
      if (rateLimitError.statusCode === 429) {
        const retryAfter = rateLimitError.retryAfter || 60;
        return {
          statusCode: 429,
          headers: {
            ...baseHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
          body: JSON.stringify({
            error: rateLimitError.message || 'Rate limit exceeded',
            retryAfter,
          }),
        };
      }
      // For other errors (including module not found), fail open (don't block user)
      if (rateLimitError.code !== 'MODULE_NOT_FOUND') {
        console.warn('[Chat] Rate limit check failed (non-fatal):', rateLimitError);
      }
    }

    let sb;
    try {
      sb = admin();
    } catch (error: any) {
      console.error('[Chat] Failed to initialize Supabase:', error);
      return {
        statusCode: 500,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Database configuration error',
          message: error.message,
        }),
      };
    }

    // ========================================================================
    // 1. UNIFIED GUARDRAILS (Policy Enforcement + PII Masking)
    // ========================================================================
    // Phase 2.2: All guardrails go through unified API (includes config loading)
    // Run guardrails on the user message BEFORE routing/model calls
    // This ensures all employees (Prime, Liberty, Tag, etc.) share the same protection
    const guardrailContext: GuardrailContext = {
      userId,
      sessionId: sessionId || undefined,
      employeeSlug: employeeSlug || undefined,
      source: 'chat',
    };

    // Get guardrail config to access preset for routing
    // Default to 'balanced' if config fetch fails
    let preset: 'strict' | 'balanced' | 'creative' = 'balanced';
    try {
      const guardrailConfig = await getGuardrailConfig(userId);
      preset = guardrailConfig.preset || 'balanced';
    } catch (error) {
      console.error('[Chat] Failed to get guardrail config, using default preset:', error);
      preset = 'balanced';
    }

    const guardrailResult = await runInputGuardrails(guardrailContext, {
      messages: [{ role: 'user', content: message }],
    });

    if (!guardrailResult.ok) {
      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: guardrailResult.signals?.pii || false,
        employee: employeeSlug || 'prime-boss',
      });

      const blockedResponse = sendBlockedResponse(
        guardrailResult.blockedReason || 'policy_violation',
        guardrailResult.events
      );

      return {
        statusCode: blockedResponse.statusCode,
        headers: {
          ...baseHeaders,
          ...headers,
          ...blockedResponse.headers,
        },
        body: blockedResponse.body,
      };
    }

    // Use the masked text from guardrails result
    const masked = guardrailResult.maskedMessages[0]?.content || message;
    const piiFound = guardrailResult.signals?.piiTypes || [];

    console.log(`[Chat] Guardrails passed, PII masked: ${piiFound.length > 0}`, {
      original: message.slice(0, 40),
      masked: masked.slice(0, 40),
      foundTypes: piiFound,
      employeeSlug: employeeSlug || 'prime-boss',
      eventsCount: guardrailResult.events.length,
    });

    // ========================================================================
    // 4. EMPLOYEE ROUTING
    // ========================================================================
    const routing = await routeToEmployee({
      userText: masked,
      requestedEmployee: employeeSlug || null,
      mode: preset,
    });

    const { employee, systemPreamble, employeePersona } = routing;
    let finalEmployeeSlug = employee || 'prime-boss';
    const originalEmployeeSlug = finalEmployeeSlug; // Track original for handoff detection

    // Check for custom system prompt from frontend (e.g., from EmployeeChatPage with category context)
    // NOTE: We read systemPromptOverride from the request body, not headers, because HTTP headers
    // must be ISO-8859-1 compatible. System prompts contain markdown, fancy quotes, emojis, and
    // other Unicode characters that are not valid in header values. Using the JSON body allows
    // us to send rich, UTF-8 encoded prompts without encoding issues.
    const customSystemPrompt = systemPromptOverride;
    
    console.log(`[Chat] Routed to: ${finalEmployeeSlug}${customSystemPrompt ? ' (custom system prompt provided)' : ''}`);

    // ========================================================================
    // 4.5. LOAD EMPLOYEE PROFILE & TOOLS
    // ========================================================================
    let employeeTools: string[] = [];
    let toolModules: Record<string, any> = {};
    let employeeSystemPrompt: string | null = null; // Load system_prompt from database
    try {
      const { data: employeeProfile } = await sb
        .from('employee_profiles')
        .select('tools_allowed, system_prompt')
        .eq('slug', finalEmployeeSlug)
        .maybeSingle();
      
      if (employeeProfile) {
        // Load tools
        if (employeeProfile.tools_allowed && Array.isArray(employeeProfile.tools_allowed)) {
          employeeTools = employeeProfile.tools_allowed;
          toolModules = pickTools(employeeTools);
          console.log(`[Chat] Loaded ${employeeTools.length} tools for ${finalEmployeeSlug}:`, employeeTools);
          
          // Special logging for Prime and Tag to verify handoff tool is included
          if (finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime') {
            const hasHandoff = employeeTools.includes('request_employee_handoff');
            console.log(`[Chat] Prime tools check - request_employee_handoff included: ${hasHandoff}`);
            if (!hasHandoff) {
              console.error(`[Chat] ❌ CRITICAL: Prime is missing request_employee_handoff tool! Current tools:`, employeeTools);
              console.error(`[Chat] Prime cannot delegate without this tool. Run migration: 20251120_add_handoff_tool_to_prime.sql`);
            } else {
              console.log(`[Chat] ✅ Prime delegation enabled - can hand off to other employees`);
            }
          }
          
          if (finalEmployeeSlug === 'tag-ai' || finalEmployeeSlug === 'tag') {
            const hasHandoff = employeeTools.includes('request_employee_handoff');
            console.log(`[Chat] Tag tools check - request_employee_handoff included: ${hasHandoff}`);
            if (!hasHandoff) {
              console.warn(`[Chat] WARNING: Tag is missing request_employee_handoff tool! Current tools:`, employeeTools);
            }
          }
        } else {
          console.warn(`[Chat] No tools_allowed found for ${finalEmployeeSlug} or invalid format`);
        }
        
        // Load system_prompt from database (use this when no custom prompt is provided)
        if (employeeProfile.system_prompt && typeof employeeProfile.system_prompt === 'string') {
          employeeSystemPrompt = employeeProfile.system_prompt;
          console.log(`[Chat] Loaded system_prompt from database for ${finalEmployeeSlug} (${employeeSystemPrompt.length} chars)`);
        }
      } else {
        console.warn(`[Chat] No employee profile found for ${finalEmployeeSlug}`);
      }
    } catch (error: any) {
      console.warn('[Chat] Failed to load employee profile:', error);
      // Continue without tools if loading fails
    }

    // ========================================================================
    // 5. SESSION MANAGEMENT
    // ========================================================================
    let finalSessionId: string;
    try {
      finalSessionId = await ensureSession(sb, userId, sessionId, finalEmployeeSlug);
    } catch (error: any) {
      console.error('[Chat] Session creation failed:', error);
      // Use a fallback session ID if database fails
      finalSessionId = sessionId || `session-${userId}-${Date.now()}`;
    }

    // ========================================================================
    // 6. MEMORY RETRIEVAL
    // ========================================================================
    // Check if this is a Smart Import AI conversation (check session context)
    let isSmartImportAI = false;
    try {
      if (finalSessionId) {
        const { data: sessionData } = await sb
          .from('chat_sessions')
          .select('context')
          .eq('id', finalSessionId)
          .maybeSingle();
        
        if (sessionData?.context && typeof sessionData.context === 'object' && 'workspace' in sessionData.context) {
          isSmartImportAI = sessionData.context.workspace === 'smart_import_ai';
        }
      }
    } catch (error) {
      // Non-fatal - continue
    }
    
    // ========================================================================
    // 6. MEMORY RECALL (Phase 2.1: Unified API)
    // ========================================================================
    let memoryContext = '';
    let memoryFacts: Array<{ fact: string; score: number; fact_id: string }> = [];
    let memoryHitScore: number | null = null;
    
    try {
      // Phase 2.1: Use unified memory API for comprehensive context
      const memory = await getMemory({
        userId,
        sessionId: finalSessionId,
        query: masked,
        options: {
          maxFacts: isSmartImportAI ? 8 : 5,
          topK: 6,
          minScore: 0.2,
          includeTasks: true,
          includeSummaries: false
        }
      });

      // Use formatted context block from unified API
      memoryContext = memory.context || '';
      memoryFacts = memory.facts || [];
      memoryHitScore = memoryFacts.length > 0 ? memoryFacts[0].score : null;

      // Filter Smart Import AI memories if this is a Smart Import AI conversation
      if (isSmartImportAI && memoryFacts.length > 0) {
        const smartImportMemories = memoryFacts.filter(f => {
          const factLower = f.fact.toLowerCase();
          return factLower.includes('smart import') || 
                 factLower.includes('document summary') ||
                 factLower.includes('transactions:');
        });
        
        if (smartImportMemories.length > 0) {
          memoryFacts = [
            ...smartImportMemories.slice(0, 5),
            ...memoryFacts.filter(f => !smartImportMemories.includes(f)).slice(0, 3)
          ];
          // Rebuild context with filtered facts
          memoryContext = memoryFacts.length > 0
            ? `\n\nRelevant user context:\n${memoryFacts.map(f => `- ${f.fact}`).join('\n')}`
            : '';
        }
      } else if (memoryContext) {
        // Add prefix for non-Smart Import AI
        memoryContext = `\n\n${memoryContext}`;
      }
    } catch (error: any) {
      console.warn('[Chat] Memory retrieval failed:', error);
      // Fallback to legacy recall() for backward compatibility
      try {
        memoryFacts = await recall({
          userId,
          query: masked,
          k: isSmartImportAI ? 8 : 5,
          minScore: 0.2,
          sessionId: finalSessionId
        });
        memoryHitScore = memoryFacts.length > 0 ? memoryFacts[0].score : null;
        memoryContext = memoryFacts.length > 0
          ? `\n\nRelevant user context:\n${memoryFacts.map(f => `- ${f.fact}`).join('\n')}`
          : '';
      } catch (fallbackError: any) {
        console.warn('[Chat] Fallback memory retrieval also failed:', fallbackError);
        // Continue without memory if both fail
      }
    }

    // Log memory recall summary
    console.log(`[CHAT] memory recall userId=${userId.substring(0, 8)}... sessionId=${finalSessionId.substring(0, 8)}... employee=${finalEmployeeSlug} hasContext=${memoryContext.length > 0}`);

    // ========================================================================
    // 7. GET RECENT MESSAGES
    // ========================================================================
    let recentMessages: any[] = [];
    try {
      recentMessages = await getRecentMessages(sb, finalSessionId, 4000);
      if (recentMessages.length > 0) {
        console.log(`[Chat] ✅ Loaded ${recentMessages.length} previous messages from session ${finalSessionId}`);
      } else {
        console.log(`[Chat] ℹ️ No previous messages found for session ${finalSessionId} (this is normal for new conversations)`);
      }
    } catch (error: any) {
      console.warn('[Chat] ⚠️ Failed to load recent messages:', error);
      // Continue without history if loading fails
    }

    // ========================================================================
    // 7.5. CHECK FOR HANDOFF CONTEXT (Phase 3.2)
    // ========================================================================
    let handoffContext: {
      from_employee: string;
      reason?: string;
      context_summary?: string;
      key_facts?: string[];
      user_intent?: string;
    } | null = null;
    
    try {
      // Check for recent handoff (last 5 minutes, same session, to current employee)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: handoffData } = await sb
        .from('handoffs')
        .select('from_employee, reason, context_summary, key_facts, user_intent, status')
        .eq('session_id', finalSessionId)
        .eq('to_employee', finalEmployeeSlug)
        .eq('status', 'initiated')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (handoffData) {
        handoffContext = {
          from_employee: handoffData.from_employee,
          reason: handoffData.reason || undefined,
          context_summary: handoffData.context_summary || undefined,
          key_facts: handoffData.key_facts || undefined,
          user_intent: handoffData.user_intent || undefined,
        };
        
        // Mark handoff as completed
        await sb
          .from('handoffs')
          .update({ status: 'completed' })
          .eq('session_id', finalSessionId)
          .eq('to_employee', finalEmployeeSlug)
          .eq('status', 'initiated')
          .gte('created_at', fiveMinutesAgo);
        
        console.log(`[Chat] ✅ Loaded handoff context from ${handoffContext.from_employee} → ${finalEmployeeSlug}`);
      }
    } catch (error: any) {
      console.warn('[Chat] Failed to load handoff context:', error);
      // Continue without handoff context if loading fails
    }

    // ========================================================================
    // 8. BUILD MODEL MESSAGES
    // ========================================================================
    // Build comprehensive system message with memory context and persona
    // Priority: handoff context > customSystemPrompt > employeeSystemPrompt (from DB) > routing-based prompts
    const systemMessageParts: string[] = [];
    
    // Phase 3.2: Add handoff context if available
    if (handoffContext) {
      const handoffPreamble = `You're taking over this conversation from ${handoffContext.from_employee}.`;
      systemMessageParts.push(handoffPreamble);
      
      if (handoffContext.reason) {
        systemMessageParts.push(`Reason for handoff: ${handoffContext.reason}`);
      }
      
      if (handoffContext.context_summary) {
        systemMessageParts.push(`Context Summary:\n${handoffContext.context_summary}`);
      }
      
      if (handoffContext.key_facts && handoffContext.key_facts.length > 0) {
        systemMessageParts.push(`Key Facts:\n${handoffContext.key_facts.map(f => `- ${f}`).join('\n')}`);
      }
      
      if (handoffContext.user_intent) {
        systemMessageParts.push(`User's Current Question: ${handoffContext.user_intent}`);
      }
      
      systemMessageParts.push(''); // Empty line separator
    }
    
    if (customSystemPrompt) {
      // Use custom system prompt (includes category context, transaction context, etc.)
      systemMessageParts.push(customSystemPrompt);
      if (memoryContext) systemMessageParts.push(memoryContext);
    } else if (employeeSystemPrompt) {
      // Use system_prompt from employee_profiles table (includes org chart, handoff rules, etc.)
      systemMessageParts.push(employeeSystemPrompt);
      if (memoryContext) systemMessageParts.push(memoryContext);
      console.log(`[Chat] Using system_prompt from database for ${finalEmployeeSlug}`);
    } else {
      // Fallback to default routing-based prompts
      if (systemPreamble) systemMessageParts.push(systemPreamble);
      if (memoryContext) systemMessageParts.push(memoryContext);
      if (employeePersona) systemMessageParts.push(employeePersona);
      console.log(`[Chat] Using routing-based prompts for ${finalEmployeeSlug} (no DB system_prompt found)`);
    }
    const systemMessage = systemMessageParts.join('\n\n').trim();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      ...recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: masked },
    ];

    console.log(`[Chat] Context: ${recentMessages.length} history messages, ${memoryFacts.length} memory facts`);

    // ========================================================================
    // 9. CALL OPENAI (Streaming)
    // ========================================================================
    if (!openai) {
      return {
        statusCode: 500,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'OpenAI API key not configured' }),
      };
    }

    // Save user message to database (masked) - non-blocking
    try {
      await sb.from('chat_messages').insert({
        session_id: finalSessionId,
        user_id: userId,
        role: 'user',
        content: masked, // Store masked version
        tokens: estimateTokens(masked),
      });
    } catch (error: any) {
      console.warn('[Chat] Failed to save user message:', error);
      // Continue even if save fails
    }

    if (stream) {
      // Streaming response (SSE) with tool support
      // Convert tools to OpenAI format if available
      const openaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
      
      // Get employee-specific model configuration
      const modelConfig = await getEmployeeModelConfig(finalEmployeeSlug);
      
      // Note: Netlify Functions streaming requires returning a promise that resolves to chunks
      const stream = await openai.chat.completions.create({
        model: modelConfig.model,
        messages,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        stream: true,
        tools: openaiTools, // Add tools if available
      });

      // Build response headers (will be updated if handoff occurs)
      let headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
        memoryHitTopScore: memoryHitScore,
        memoryHitCount: memoryFacts.length,
        employee: finalEmployeeSlug,
        routeConfidence: 0.8,
      });

      // Create streaming response with tool calling support
      let assistantContent = '';
      let toolCalls: any[] = [];
      const requestStartTime = Date.now();
      let firstTokenTime: number | null = null;
      
      // Send employee header first (will be updated if handoff occurs)
      const encoder = new TextEncoder();
      let streamBuffer = `data: ${JSON.stringify({ type: 'employee', employee: finalEmployeeSlug })}\n\n`;

      // Stream tokens and collect tool calls
      for await (const chunk of stream) {
        // Track time to first token
        if (!firstTokenTime && chunk.choices[0]?.delta?.content) {
          firstTokenTime = Date.now();
        }
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          assistantContent += delta.content;
          streamBuffer += `data: ${JSON.stringify({ type: 'token', token: delta.content })}\n\n`;
        }
        // Collect tool calls from stream
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index || 0;
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCall.id,
                type: 'function',
                function: { name: toolCall.function?.name || '', arguments: '' }
              };
              
              // Phase 3.1: Send tool_calling event when tool call detected
              if (toolCall.function?.name) {
                streamBuffer += `data: ${JSON.stringify({
                  type: 'tool_call',
                  tool: {
                    id: toolCall.id,
                    name: toolCall.function.name,
                    arguments: {}
                  }
                })}\n\n`;
              }
            }
            if (toolCall.function?.name) {
              toolCalls[index].function.name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              toolCalls[index].function.arguments += toolCall.function.arguments;
            }
          }
        }
      }

      // Handle tool calls if any
      if (toolCalls.length > 0 && Object.keys(toolModules).length > 0) {
        console.log(`[Chat] Processing ${toolCalls.length} tool calls`);
        
        // Execute tools and add results to messages
        const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        for (const toolCall of toolCalls) {
          if (!toolCall.id || !toolCall.function?.name) continue;
          
          const toolName = toolCall.function.name;
          const toolModule = toolModules[toolName];
          
          if (!toolModule) {
            console.warn(`[Chat] Tool ${toolName} not found in modules`);
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: `Tool ${toolName} not available` }),
            });
            continue;
          }

          try {
            // Parse args once for logging and execution
            const args = JSON.parse(toolCall.function.arguments || '{}');
            
            // Enhanced logging for all tools
            console.log(`[Chat] Executing tool: ${toolName}`, {
              employee: finalEmployeeSlug,
              tool: toolName,
              args: process.env.NETLIFY_DEV === 'true' ? args : '[redacted]',
            });
            
            // Special debug logging for tag_category_brain
            if (toolName === 'tag_category_brain') {
              console.log(`[Tag Category Brain] Category: "${args.category || 'unknown'}", Timeframe: "${args.timeframe || 'all'}", UserId: ${userId}`);
            }
            
            // Warn if tag_explain_category is called with obviously invalid transaction IDs
            if (toolName === 'tag_explain_category' && args.transactionId) {
              const invalidIds = ['upload', 'statement', 'document', 'file', 'smart import', 'import'];
              const txIdLower = String(args.transactionId).toLowerCase().trim();
              if (invalidIds.includes(txIdLower)) {
                console.warn(`[Chat] ⚠️ Tag called tag_explain_category with invalid transactionId: "${args.transactionId}". This looks like an upload question that should trigger handoff instead.`);
              }
            }
            
            const toolContext: ToolContext = {
              userId,
              conversationId: finalSessionId,
              sessionId: finalSessionId,
            };
            
            // Special debug logging for request_employee_handoff BEFORE execution
            if (toolName === 'request_employee_handoff') {
              console.log(`[Chat] 🔄 HANDOFF REQUEST (streaming): ${finalEmployeeSlug} → ${args.target_slug || 'unknown'}`, {
                reason: args.reason || 'No reason provided',
                summary: args.summary_for_next_employee || 'No summary provided',
                userId,
                sessionId: finalSessionId,
              });
            }
            
            // Phase 3.1: Send tool_executing event before execution
            streamBuffer += `data: ${JSON.stringify({
              type: 'tool_executing',
              tool: toolName
            })}\n\n`;
            
            const result = await executeTool(toolModule, args, toolContext);
            
            // Check if result has error field (from executeTool error handling)
            if (result && typeof result === 'object' && 'error' in result) {
              console.error(`[Chat] Tool ${toolName} returned error:`, result.error);
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ 
                  error: result.error || 'Tool execution failed',
                  message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
                }),
              });
            } else {
              // Special handling for employee handoff (streaming)
              // Check for new schema: data.requested_handoff === true
              if (toolName === 'request_employee_handoff' && result && typeof result === 'object' && 'data' in result) {
                const handoffData = (result as any).data;
                if (handoffData && handoffData.requested_handoff === true && handoffData.target_slug) {
                  const targetSlug = handoffData.target_slug;
                  const reason = handoffData.reason || 'Better suited for this question';
                  const summary = handoffData.summary_for_next_employee;
                  
                  console.log(`[Chat] ✅ HANDOFF COMPLETE (streaming): ${originalEmployeeSlug} → ${targetSlug}`, {
                    reason,
                    summary,
                    sessionId: finalSessionId,
                  });
                  
                  // Phase 3.2: Gather handoff context
                  let recentMessages: any[] = [];
                  let keyFacts: string[] = [];
                  
                  try {
                    // Get recent messages (last 10)
                    const { data: messagesData } = await sb
                      .from('chat_messages')
                      .select('role, content, created_at')
                      .eq('session_id', finalSessionId)
                      .order('created_at', { ascending: false })
                      .limit(10);
                    
                    if (messagesData) {
                      recentMessages = messagesData.reverse(); // Oldest first
                    }
                    
                    // Extract key facts from memory
                    if (memoryFacts && memoryFacts.length > 0) {
                      keyFacts = memoryFacts.slice(0, 5).map(f => f.fact);
                    }
                  } catch (error: any) {
                    console.warn('[Chat] Failed to gather handoff context:', error);
                  }
                  
                  // Phase 3.2: Store handoff context in database
                  try {
                    await sb.from('handoffs').insert({
                      user_id: userId,
                      session_id: finalSessionId,
                      from_employee: originalEmployeeSlug,
                      to_employee: targetSlug,
                      reason: reason,
                      context_summary: summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`,
                      key_facts: keyFacts,
                      recent_messages: recentMessages,
                      user_intent: masked.substring(0, 500), // Current user message
                      status: 'initiated',
                    });
                    
                    console.log(`[Chat] Stored handoff context for session ${finalSessionId}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to store handoff context:', error);
                  }
                  
                  // Update session's employee_slug
                  try {
                    await sb
                      .from('chat_sessions')
                      .update({ employee_slug: targetSlug })
                      .eq('id', finalSessionId);
                    
                    console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to update session employee_slug:', error);
                  }
                  
                  // Insert system message about handoff
                  try {
                    const handoffMessage = summary 
                      ? `Handoff: Conversation moved to ${targetSlug}. Context: ${summary}`
                      : `Handoff: Conversation moved to ${targetSlug}.`;
                    
                    await sb.from('chat_messages').insert({
                      session_id: finalSessionId,
                      user_id: userId,
                      role: 'system',
                      content: handoffMessage,
                      tokens: estimateTokens(handoffMessage),
                    });
                    
                    console.log(`[Chat] Inserted handoff system message for session ${finalSessionId}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to insert handoff system message:', error);
                  }
                  
                  // Update finalEmployeeSlug for this request
                  finalEmployeeSlug = targetSlug;
                  
                  // Reload employee profile and tools for new employee
                  try {
                    const { data: newEmployeeProfile } = await sb
                      .from('employee_profiles')
                      .select('tools_allowed')
                      .eq('slug', finalEmployeeSlug)
                      .maybeSingle();
                    
                    if (newEmployeeProfile?.tools_allowed && Array.isArray(newEmployeeProfile.tools_allowed)) {
                      employeeTools = newEmployeeProfile.tools_allowed;
                      toolModules = pickTools(employeeTools);
                      console.log(`[Chat] Loaded ${employeeTools.length} tools for new employee ${finalEmployeeSlug}:`, employeeTools);
                    }
                  } catch (error: any) {
                    console.warn('[Chat] Failed to reload employee tools after handoff:', error);
                  }
                  
                  // Update headers to reflect new employee
                  headers = buildResponseHeaders({
                    guardrailsActive: true,
                    piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
                    memoryHitTopScore: memoryHitScore,
                    memoryHitCount: memoryFacts.length,
                    employee: finalEmployeeSlug,
                    routeConfidence: 0.9, // High confidence for explicit handoff
                  });
                  
                  // Send handoff event in stream
                  const handoffEvent = {
                    type: 'handoff',
                    from: originalEmployeeSlug,
                    to: targetSlug,
                    reason,
                    summary
                  };
                  streamBuffer += `data: ${JSON.stringify(handoffEvent)}\n\n`;
                  
                  // Enhanced logging for debugging (guarded by env flag)
                  if (process.env.NETLIFY_DEV === 'true' || process.env.DEBUG_HANDOFF === 'true') {
                    console.log(`[Chat] 📤 HANDOFF EVENT SENT (streaming):`, handoffEvent);
                  }
                }
              }
              
              // executeTool handles Result unwrapping and returns the validated output directly
              
              // Phase 3.1: Send tool_result event with formatted result
              // Format result for display (limit size, handle sensitive data)
              let displayResult = result;
              if (typeof result === 'object' && result !== null) {
                // Create a safe copy for display (limit depth, remove sensitive fields)
                try {
                  displayResult = JSON.parse(JSON.stringify(result));
                  // Limit large arrays/objects
                  if (Array.isArray(displayResult) && displayResult.length > 10) {
                    displayResult = displayResult.slice(0, 10).concat([`... and ${displayResult.length - 10} more items`]);
                  }
                } catch (e) {
                  // If JSON parsing fails, use string representation
                  displayResult = String(result).substring(0, 500);
                }
              }
              
              streamBuffer += `data: ${JSON.stringify({
                type: 'tool_result',
                tool: toolName,
                result: displayResult
              })}\n\n`;
              
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });
              
              console.log(`[Chat] Tool ${toolName} executed successfully`);
            }
          } catch (error: any) {
            console.error(`[Chat] Tool execution error for ${toolName}:`, {
              error: error.message,
              stack: process.env.NETLIFY_DEV === 'true' ? error.stack : undefined,
              employee: finalEmployeeSlug,
            });
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ 
                error: error.message || 'Tool execution failed',
                message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
              }),
            });
          }
        }

        // If we have tool results, make another completion call with tool results
        if (toolResults.length > 0) {
          messages.push(
            { role: 'assistant', content: assistantContent, tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.function.name, arguments: tc.function.arguments }
            })) },
            ...toolResults
          );

          // Second completion with tool results
          // If handoff occurred, reload tools for new employee
          const openaiToolsAfterHandoff = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
          
          // Use model config for current employee (may have changed after handoff)
          const modelConfigAfterHandoff = await getEmployeeModelConfig(finalEmployeeSlug);
          
          const secondStream = await openai.chat.completions.create({
            model: modelConfigAfterHandoff.model,
            messages,
            temperature: modelConfigAfterHandoff.temperature,
            max_tokens: modelConfigAfterHandoff.maxTokens,
            stream: true,
            tools: openaiToolsAfterHandoff,
          });

          assistantContent = ''; // Reset for final response
          for await (const chunk of secondStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              streamBuffer += `data: ${JSON.stringify({ type: 'token', token: delta })}\n\n`;
            }
          }
        }
      }

      // Update employee header if handoff occurred
      if (finalEmployeeSlug !== originalEmployeeSlug) {
        streamBuffer = `data: ${JSON.stringify({ type: 'employee', employee: finalEmployeeSlug })}\n\n` + streamBuffer;
      }

      // Send completion signal
      streamBuffer += `data: ${JSON.stringify({ type: 'done' })}\n\n`;

      // Calculate token usage (rough estimate)
      const promptTokens = estimateTokens(systemMessage + masked + recentMessages.map((m: any) => m.content).join(''));
      const completionTokens = estimateTokens(assistantContent);
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - requestStartTime;
      const latencyMs = firstTokenTime ? firstTokenTime - requestStartTime : null;

      // Save assistant message (will be redacted if needed) - non-blocking
      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: completionTokens,
        });
      } catch (error: any) {
        console.warn('[Chat] Failed to save assistant message:', error);
        // Continue even if save fails
      }

      // Log usage metrics (non-blocking)
      try {
        const modelConfig = await getEmployeeModelConfig(finalEmployeeSlug);
        const toolsUsed = toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).filter(Boolean) : null;
        
        await sb.from('chat_usage_log').insert({
          user_id: userId,
          session_id: finalSessionId,
          employee_slug: finalEmployeeSlug,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          model: modelConfig.model,
          latency_ms: latencyMs,
          duration_ms: durationMs,
          tools_used: toolsUsed,
          success: true,
        });
      } catch (error: any) {
        console.warn('[Chat] Failed to log usage metrics:', error);
        // Continue even if logging fails
      }

      // Phase 2.3: Queue memory extraction for async processing (non-blocking)
      // Extraction happens in background worker, doesn't block chat response
      queueMemoryExtraction({
        userId,
        sessionId: finalSessionId,
        userMessage: masked,
        assistantResponse: assistantContent
      }).catch((error: any) => {
        // Log but don't fail - extraction failures shouldn't break chat
        console.warn('[Chat] Failed to queue memory extraction (non-fatal):', error);
        // Worker will retry failed jobs automatically
      });

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: streamBuffer,
      };
    } else {
      // Non-streaming response with tool calling support
      const openaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
      
      // Get employee-specific model configuration
      const modelConfig = await getEmployeeModelConfig(finalEmployeeSlug);
      
      let completion = await openai.chat.completions.create({
        model: modelConfig.model,
        messages,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        stream: false,
        tools: openaiTools,
      });

      let assistantContent = completion.choices[0]?.message?.content || '';
      let toolCalls = completion.choices[0]?.message?.tool_calls || [];

      // Handle tool calls if any
      if (toolCalls.length > 0 && Object.keys(toolModules).length > 0) {
        console.log(`[Chat] Processing ${toolCalls.length} tool calls (non-streaming)`);
        
        const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolModule = toolModules[toolName];
          
          if (!toolModule) {
            console.warn(`[Chat] Tool ${toolName} not found`);
            continue;
          }

          try {
            // Parse args once for logging and execution
            const args = JSON.parse(toolCall.function.arguments || '{}');
            
            // Enhanced logging for all tools
            console.log(`[Chat] Executing tool: ${toolName}`, {
              employee: finalEmployeeSlug,
              tool: toolName,
              args: process.env.NETLIFY_DEV === 'true' ? args : '[redacted]',
            });
            
            // Special debug logging for tag_category_brain
            if (toolName === 'tag_category_brain') {
              console.log(`[Tag Category Brain] Category: "${args.category || 'unknown'}", Timeframe: "${args.timeframe || 'all'}", UserId: ${userId}`);
            }
            
            // Warn if tag_explain_category is called with obviously invalid transaction IDs
            if (toolName === 'tag_explain_category' && args.transactionId) {
              const invalidIds = ['upload', 'statement', 'document', 'file', 'smart import', 'import'];
              const txIdLower = String(args.transactionId).toLowerCase().trim();
              if (invalidIds.includes(txIdLower)) {
                console.warn(`[Chat] ⚠️ Tag called tag_explain_category with invalid transactionId: "${args.transactionId}". This looks like an upload question that should trigger handoff instead.`);
              }
            }
            
            const toolContext: ToolContext = {
              userId,
              conversationId: finalSessionId,
              sessionId: finalSessionId,
            };
            
            // Special debug logging for request_employee_handoff BEFORE execution
            if (toolName === 'request_employee_handoff') {
              console.log(`[Chat] 🔄 HANDOFF REQUEST (non-streaming): ${finalEmployeeSlug} → ${args.target_slug || 'unknown'}`, {
                reason: args.reason || 'No reason provided',
                summary: args.summary_for_next_employee || 'No summary provided',
                userId,
                sessionId: finalSessionId,
              });
            }
            
            const result = await executeTool(toolModule, args, toolContext);
            
            // Check if result has error field (from executeTool error handling)
            if (result && typeof result === 'object' && 'error' in result) {
              console.error(`[Chat] Tool ${toolName} returned error:`, result.error);
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ 
                  error: result.error || 'Tool execution failed',
                  message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
                }),
              });
            } else {
              // Special handling for employee handoff (non-streaming)
              // Check for new schema: data.requested_handoff === true
              if (toolName === 'request_employee_handoff' && result && typeof result === 'object' && 'data' in result) {
                const handoffData = (result as any).data;
                if (handoffData && handoffData.requested_handoff === true && handoffData.target_slug) {
                  const targetSlug = handoffData.target_slug;
                  const reason = handoffData.reason || 'Better suited for this question';
                  const summary = handoffData.summary_for_next_employee;
                  
                  console.log(`[Chat] ✅ HANDOFF COMPLETE (non-streaming): ${originalEmployeeSlug} → ${targetSlug}`, {
                    reason,
                    summary,
                    sessionId: finalSessionId,
                  });
                  
                  // Phase 3.2: Gather handoff context (non-streaming)
                  let recentMessagesNonStream: any[] = [];
                  let keyFactsNonStream: string[] = [];
                  
                  try {
                    // Get recent messages (last 10)
                    const { data: messagesData } = await sb
                      .from('chat_messages')
                      .select('role, content, created_at')
                      .eq('session_id', finalSessionId)
                      .order('created_at', { ascending: false })
                      .limit(10);
                    
                    if (messagesData) {
                      recentMessagesNonStream = messagesData.reverse(); // Oldest first
                    }
                    
                    // Extract key facts from memory
                    if (memoryFacts && memoryFacts.length > 0) {
                      keyFactsNonStream = memoryFacts.slice(0, 5).map(f => f.fact);
                    }
                  } catch (error: any) {
                    console.warn('[Chat] Failed to gather handoff context (non-streaming):', error);
                  }
                  
                  // Phase 3.2: Store handoff context in database (non-streaming)
                  try {
                    await sb.from('handoffs').insert({
                      user_id: userId,
                      session_id: finalSessionId,
                      from_employee: originalEmployeeSlug,
                      to_employee: targetSlug,
                      reason: reason,
                      context_summary: summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`,
                      key_facts: keyFactsNonStream,
                      recent_messages: recentMessagesNonStream,
                      user_intent: masked.substring(0, 500),
                      status: 'initiated',
                    });
                    
                    console.log(`[Chat] Stored handoff context (non-streaming) for session ${finalSessionId}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to store handoff context (non-streaming):', error);
                  }
                  
                  // Update session's employee_slug
                  try {
                    await sb
                      .from('chat_sessions')
                      .update({ employee_slug: targetSlug })
                      .eq('id', finalSessionId);
                    
                    console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to update session employee_slug:', error);
                  }
                  
                  // Insert system message about handoff
                  try {
                    const handoffMessage = summary 
                      ? `Handoff: Conversation moved to ${targetSlug}. Context: ${summary}`
                      : `Handoff: Conversation moved to ${targetSlug}.`;
                    
                    await sb.from('chat_messages').insert({
                      session_id: finalSessionId,
                      user_id: userId,
                      role: 'system',
                      content: handoffMessage,
                      tokens: estimateTokens(handoffMessage),
                    });
                    
                    console.log(`[Chat] Inserted handoff system message for session ${finalSessionId}`);
                  } catch (error: any) {
                    console.warn('[Chat] Failed to insert handoff system message:', error);
                  }
                  
                  // Update finalEmployeeSlug for this request
                  finalEmployeeSlug = targetSlug;
                  
                  // Reload employee profile and tools for new employee
                  try {
                    const { data: newEmployeeProfile } = await sb
                      .from('employee_profiles')
                      .select('tools_allowed')
                      .eq('slug', finalEmployeeSlug)
                      .maybeSingle();
                    
                    if (newEmployeeProfile?.tools_allowed && Array.isArray(newEmployeeProfile.tools_allowed)) {
                      employeeTools = newEmployeeProfile.tools_allowed;
                      toolModules = pickTools(employeeTools);
                      console.log(`[Chat] Loaded ${employeeTools.length} tools for new employee ${finalEmployeeSlug}:`, employeeTools);
                    }
                  } catch (error: any) {
                    console.warn('[Chat] Failed to reload employee tools after handoff:', error);
                  }
                }
              }
              
              // executeTool handles Result unwrapping and returns the validated output directly
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              });
              
              console.log(`[Chat] Tool ${toolName} executed successfully`);
            }
          } catch (error: any) {
            console.error(`[Chat] Tool execution error for ${toolName}:`, {
              error: error.message,
              stack: process.env.NETLIFY_DEV === 'true' ? error.stack : undefined,
              employee: finalEmployeeSlug,
            });
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ 
                error: error.message || 'Tool execution failed',
                message: 'I had trouble loading stats for this category, but I can still talk about your finances in general.',
              }),
            });
          }
        }

        // Second completion with tool results
        if (toolResults.length > 0) {
          messages.push(
            { role: 'assistant', content: assistantContent || null, tool_calls: toolCalls },
            ...toolResults
          );

          // If handoff occurred, reload tools for new employee
          const openaiToolsAfterHandoff = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;

          // Use model config for current employee (may have changed after handoff)
          const modelConfigAfterHandoff = await getEmployeeModelConfig(finalEmployeeSlug);

          completion = await openai.chat.completions.create({
            model: modelConfigAfterHandoff.model,
            messages,
            temperature: modelConfigAfterHandoff.temperature,
            max_tokens: modelConfigAfterHandoff.maxTokens,
            stream: false,
            tools: openaiToolsAfterHandoff,
          });

          assistantContent = completion.choices[0]?.message?.content || assistantContent;
        }
      }

      // Calculate token usage (rough estimate)
      const promptTokens = estimateTokens(systemMessage + masked + recentMessages.map((m: any) => m.content).join(''));
      const completionTokens = estimateTokens(assistantContent);
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - requestStartTime;
      const latencyMs = firstTokenTime - requestStartTime;

      // Save assistant message - non-blocking
      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: completionTokens,
        });
      } catch (error: any) {
        console.warn('[Chat] Failed to save assistant message:', error);
        // Continue even if save fails
      }

      // Log usage metrics (non-blocking)
      try {
        const toolsUsed = toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).filter(Boolean) : null;
        
        await sb.from('chat_usage_log').insert({
          user_id: userId,
          session_id: finalSessionId,
          employee_slug: finalEmployeeSlug,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          model: modelConfig.model,
          latency_ms: latencyMs,
          duration_ms: durationMs,
          tools_used: toolsUsed,
          success: true,
        });
      } catch (error: any) {
        console.warn('[Chat] Failed to log usage metrics:', error);
        // Continue even if logging fails
      }

      // Phase 2.3: Queue memory extraction for async processing (non-blocking)
      // Extraction happens in background worker, doesn't block chat response
      queueMemoryExtraction({
        userId,
        sessionId: finalSessionId,
        userMessage: masked,
        assistantResponse: assistantContent
      }).catch((error: any) => {
        // Log but don't fail - extraction failures shouldn't break chat
        console.warn('[Chat] Failed to queue memory extraction (non-fatal):', error);
        // Worker will retry failed jobs automatically
      });

      // Build headers (may have been updated during handoff)
      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
        memoryHitTopScore: memoryHitScore,
        memoryHitCount: memoryFacts.length,
        employee: finalEmployeeSlug,
        routeConfidence: 0.8,
      });

      // Check if handoff occurred
      const handoffMeta = finalEmployeeSlug !== originalEmployeeSlug 
        ? { from: originalEmployeeSlug, to: finalEmployeeSlug }
        : undefined;

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: true,
          content: assistantContent,
          employee: finalEmployeeSlug,
          sessionId: finalSessionId,
          ...(handoffMeta && { meta: { handoff: handoffMeta } }),
        }),
      };
    }
  } catch (error: any) {
    console.error('[Chat] Error:', error);
    console.error('[Chat] Error stack:', error.stack);
    console.error('[Chat] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    return {
      statusCode: 500,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

