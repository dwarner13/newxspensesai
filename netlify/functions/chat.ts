// @wiring:byte-docs
// @area:chat/routing-and-tools
// @purpose:Routes to employees, runs tools, and persists messages/tool calls used by audits.

/**
 * 💬 Unified Chat Endpoint
 * 
 * Complete chat system with:
 * - 🛡️ Unified Guardrails (moderation + PII masking) - ALL employees protected
 * - Employee routing (Prime, Byte, Crystal, Finley, Goalie, Liberty, Blitz, etc.)
 * - Memory retrieval and storage
 * - Streaming responses (SSE)
 * - Session management
 * - 🗄️ Custodian: Conversation summaries (non-blocking, async)
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
 * 
 * RECENT CHANGES (2025-01-20):
 * - Added Custodian conversation summary generation (updateConversationSummaryForCustodian)
 *   - Runs asynchronously after messages are saved (non-blocking)
 *   - Generates title, summary, and tags using OpenAI
 *   - Upserts into chat_convo_summaries table
 *   - Wrapped in try/catch to prevent chat failures
 * - Module system: Uses ES modules (package.json "type": "module")
 *   - Netlify.toml configured with node_bundler = "esbuild" for proper ES module support
 *   - All imports use .js extensions for ES module compatibility
 * - Export: Uses named export `export const handler: Handler` (Netlify standard)
 */

import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
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
import { ensureThread, backfillThreadId } from './_shared/ensureThread.js';
import { buildResponseHeaders } from './_shared/headers.js';
import { getEmployeeModelConfig } from './_shared/employeeModelConfig.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { logAiActivity } from './_shared/logAiActivity.js';
import { buildContextInjection } from './_shared/contextInjection.js';
import { fetchAiUserContext, buildAiContextSystemMessage } from '../../src/lib/ai/userContext.js';
import { AI_FLUENCY_GLOBAL_SYSTEM_RULE, PRIME_ORCHESTRATION_RULE } from '../../src/lib/ai/systemPrompts.js';
// AI Fluency: Event logging
import { logUserEvent, recalcFluency } from '../../src/lib/ai/userActivity.js';
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
  threadId?: string; // Optional thread ID (if provided, ensures that thread exists)
  stream?: boolean;
  systemPromptOverride?: string; // Custom system prompt from frontend (e.g., category/transaction context)
  documentIds?: string[]; // Document IDs from Smart Import uploads
  prime_context?: { // Optional PrimeState snapshot (convenience overlay, verified server-side)
    displayName: string | null;
    timezone: string | null;
    currency: string | null;
    currentStage: 'novice' | 'guided' | 'power' | null;
    financialSnapshot: {
      hasTransactions: boolean;
      uncategorizedCount: number;
      monthlySpend?: number;
      topCategories?: Array<{ name: string; amount: number }>;
      hasDebt?: boolean;
      hasGoals?: boolean;
    } | null;
    memorySummary: {
      factsCount?: number;
      lastUpdatedAt?: string;
      recentFacts?: string[];
    } | null;
  } | null;
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
// HELPERS
// ============================================================================

/**
 * Normalize sessionId to handle various input types safely
 */
function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'id' in (raw as any)) {
    const v = (raw as any).id;
    if (typeof v === 'string') return v;
  }
  return null;
}

/**
 * Get user profile from Supabase profiles table
 * Returns user identity information for AI employees
 * @param sb - Supabase client
 * @param userId - User ID
 * @returns User profile with identity fields or null
 */
async function getUserProfile(
  sb: SupabaseClient,
  userId: string
): Promise<{
  preferredName: string;
  scope: string;
  primaryGoal: string | null;
  proactivityLevel: string | null;
  timezone: string | null;
  currency: string | null;
  accountType: string | null;
  accountName: string | null;
  dateLocale: string | null;
  taxIncluded: string | null;
  taxSystem: string | null;
  aiFluencyLevel: string | null;
  aiFluencyScore: number | null;
} | null> {
  try {
    const { data: profile, error } = await sb
      .from('profiles')
      .select('display_name, first_name, full_name, account_type, currency, time_zone, account_name, date_locale, metadata, ai_fluency_level, ai_fluency_score')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected if profile missing)
      console.warn('[Chat] Error fetching user profile:', error);
      return null;
    }

    if (!profile) {
      return null;
    }

    // Preferred name: display_name → first_name → full_name
    const preferredName = profile.display_name || profile.first_name || profile.full_name || 'there';

    // Account type (account_type column)
    const scope = profile.account_type || 'exploring';

    // Primary goal from metadata.settings
    const metadata = profile.metadata && typeof profile.metadata === 'object'
      ? profile.metadata as Record<string, any>
      : null;
    const settings = metadata?.settings && typeof metadata.settings === 'object'
      ? metadata.settings as Record<string, any>
      : null;
    const primaryGoal = settings?.primary_goal || null;

    // Proactivity level from metadata.settings
    const proactivityLevel = settings?.proactivity_level || null;

    // Extract timezone from metadata or time_zone column
    const timezone = metadata?.timezone || profile.time_zone || null;
    
    // Currency from currency column
    const currency = profile.currency || null;
    
    // Account type from account_type column
    const accountType = profile.account_type || null;
    
    // Onboarding fields
    const accountName = profile.account_name || null;
    const dateLocale = profile.date_locale || null;
    // Note: tax_included and tax_system columns removed - use metadata only
    // Extract tax fields from metadata if available, otherwise null
    const taxIncluded = metadata?.tax_included || null;
    const taxSystem = metadata?.tax_system || null;

    // AI Fluency Level (for adaptive communication)
    const aiFluencyLevel = profile.ai_fluency_level || 'Explorer';
    const aiFluencyScore = profile.ai_fluency_score || 20;

    // Debug log (dev only)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[Chat] getUserProfile:', {
        userId,
        preferredName,
        source: profile.display_name ? 'display_name' : profile.first_name ? 'first_name' : profile.full_name ? 'full_name' : 'fallback',
        scope,
        primaryGoal,
        proactivityLevel,
        timezone,
        currency,
        accountType,
        accountName: accountName ? '***' : null, // Log presence only, not value
        dateLocale: dateLocale ? '***' : null,
        taxIncluded: taxIncluded ? '***' : null,
        taxSystem: taxSystem ? '***' : null,
        aiFluencyLevel,
        aiFluencyScore,
        fieldsLoaded: {
          accountName: !!accountName,
          dateLocale: !!dateLocale,
          taxIncluded: !!taxIncluded,
          taxSystem: !!taxSystem,
        },
      });
    }

    return {
      preferredName,
      scope,
      primaryGoal,
      proactivityLevel,
      timezone,
      currency,
      accountType,
      accountName,
      dateLocale,
      taxIncluded,
      taxSystem,
      aiFluencyLevel,
      aiFluencyScore,
    };
  } catch (error: any) {
    console.warn('[Chat] Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Format user context as a string for injection into system prompts
 * @param userProfile - User profile from getUserProfile
 * @returns Formatted string for system prompt
 */
function formatUserContextForPrompt(userProfile: {
  preferredName: string;
  scope: string;
  primaryGoal: string | null;
  proactivityLevel: string | null;
  timezone: string | null;
  currency: string | null;
  accountType: string | null;
  accountName: string | null;
  dateLocale: string | null;
  taxIncluded: string | null;
  taxSystem: string | null;
  aiFluencyLevel: string | null;
  aiFluencyScore: number | null;
}): string {
  const parts: string[] = [];
  
  parts.push(`**User Identity:**`);
  parts.push(`- Preferred name: ${userProfile.preferredName}`);
  
  if (userProfile.scope && userProfile.scope !== 'exploring') {
    parts.push(`- Account scope: ${userProfile.scope}`);
  }
  
  if (userProfile.accountType) {
    parts.push(`- Account type: ${userProfile.accountType}`);
  }
  
  if (userProfile.accountName) {
    parts.push(`- Account name: ${userProfile.accountName}`);
  }
  
  if (userProfile.currency) {
    parts.push(`- Currency: ${userProfile.currency}`);
  }
  
  if (userProfile.timezone) {
    parts.push(`- Timezone: ${userProfile.timezone}`);
  }
  
  if (userProfile.dateLocale) {
    parts.push(`- Date locale: ${userProfile.dateLocale}`);
  }
  
  if (userProfile.taxIncluded) {
    parts.push(`- Tax included: ${userProfile.taxIncluded}`);
  }
  
  if (userProfile.taxSystem) {
    parts.push(`- Tax system: ${userProfile.taxSystem}`);
  }
  
  if (userProfile.primaryGoal) {
    parts.push(`- Primary financial goal: ${userProfile.primaryGoal}`);
  }
  
  if (userProfile.proactivityLevel) {
    parts.push(`- Proactivity preference: ${userProfile.proactivityLevel}`);
  }
  
  // AI Fluency Level (for adaptive communication - only include if set)
  if (userProfile.aiFluencyLevel && userProfile.aiFluencyLevel !== 'Explorer') {
    parts.push(`- AI fluency level: ${userProfile.aiFluencyLevel} (score: ${userProfile.aiFluencyScore || 20}/100)`);
  }
  
  return parts.join('\n');
}

/**
 * Load documents and build attachment context for chat
 * @param sb - Supabase client
 * @param userId - User ID
 * @param documentIds - Array of document IDs
 * @returns Attachment context string or null if no documents/processing
 */
async function buildAttachmentContext(
  sb: SupabaseClient,
  userId: string,
  documentIds: string[]
): Promise<string | null> {
  if (!documentIds || documentIds.length === 0) {
    return null;
  }

  try {
    // Load documents from user_documents table
    const { data: documents, error } = await sb
      .from('user_documents')
      .select('id, original_name, mime_type, ocr_text, status, created_at, pii_types')
      .in('id', documentIds)
      .eq('user_id', userId); // Security: only allow user to read their own documents

    if (error) {
      console.error('[Chat] Error loading documents:', error);
      return null;
    }

    if (!documents || documents.length === 0) {
      console.warn('[Chat] No documents found for provided documentIds');
      return null;
    }

    const contextParts: string[] = [];
    const processingDocs: string[] = [];

    for (const doc of documents) {
      const isProcessing = doc.status === 'pending' || doc.status === 'processing';
      const hasContent = doc.ocr_text && doc.ocr_text.trim().length > 0;

      if (isProcessing && !hasContent) {
        processingDocs.push(doc.original_name || 'document');
        continue;
      }

      // Build context for each document
      const docContext: string[] = [];
      docContext.push(`Document: ${doc.original_name || 'Untitled'}`);
      
      if (doc.mime_type) {
        docContext.push(`Type: ${doc.mime_type}`);
      }

      if (hasContent) {
        // Truncate OCR text to ~2000 characters to avoid token limits
        // NOTE: ocr_text is already redacted by smart-import-ocr.ts guardrails
        const ocrText = doc.ocr_text.trim();
        const truncatedText = ocrText.length > 2000 
          ? ocrText.substring(0, 2000) + '... (truncated)'
          : ocrText;
        docContext.push(`Extracted content:\n${truncatedText}`);
        
        // Log OCR text usage (do NOT log raw text - ocr_text is already redacted)
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log('[Chat] Document context added:', {
            docId: doc.id,
            docName: doc.original_name,
            ocrTextLength: ocrText.length,
            ocrTextPreview: ocrText.substring(0, 50) + '...', // Preview only (already redacted)
            piiTypes: doc.pii_types || [],
            isRedacted: !!doc.pii_types && doc.pii_types.length > 0,
          });
        }
      } else if (isProcessing) {
        docContext.push('Status: Still processing (OCR/parsing in progress)');
      }

      contextParts.push(docContext.join('\n'));
    }

    if (processingDocs.length > 0) {
      contextParts.push(
        `\nNote: ${processingDocs.length} document(s) are still being processed: ${processingDocs.join(', ')}. ` +
        `I'll summarize them once processing completes.`
      );
    }

    if (contextParts.length === 0) {
      return null;
    }

    return `\n\n--- ATTACHED DOCUMENTS ---\n${contextParts.join('\n\n---\n')}\n--- END ATTACHED DOCUMENTS ---\n`;
  } catch (error: any) {
    console.error('[Chat] Error building attachment context:', error);
    return null;
  }
}

// ============================================================================
// CUSTODIAN: CONVERSATION SUMMARY HELPER
// ============================================================================

/**
 * Update conversation summary for Custodian
 * Generates title, summary, and tags using OpenAI, then upserts into chat_convo_summaries
 * @param sb - Supabase client
 * @param userId - User ID
 * @param conversationId - Conversation/session ID
 * @param messages - Full conversation messages array
 * @param employeesInvolved - Array of employee slugs involved in conversation
 */
async function updateConversationSummaryForCustodian(
  sb: SupabaseClient,
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  employeesInvolved: string[]
): Promise<void> {
  // Skip if OpenAI not configured or no messages
  if (!openai || messages.length === 0) {
    return;
  }

  try {
    // Get conversation text (last 20 messages for context, or all if fewer)
    const recentMessages = messages.slice(-20);
    const conversationText = recentMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Call OpenAI to generate title, summary, and tags
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Custodian, an AI assistant that creates concise summaries of financial conversations.

Generate:
1. A short title (3-8 words) that captures the main topic
2. A 1-2 sentence summary of what was discussed
3. 2-5 relevant tags (e.g., "budgeting", "debt", "investments", "taxes", "spending-analysis")

Return JSON format:
{
  "title": "Short descriptive title",
  "summary": "One to two sentence summary of the conversation.",
  "tags": ["tag1", "tag2", "tag3"]
}`
        },
        {
          role: 'user',
          content: `Summarize this conversation:\n\n${conversationText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = summaryResponse.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Custodian] No summary content generated');
      return;
    }

    // Parse JSON response
    let summaryData: { title: string; summary: string; tags: string[] };
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, content];
      summaryData = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.warn('[Custodian] Failed to parse summary JSON:', parseError);
      // Fallback: create basic summary from first user message
      const firstUserMessage = messages.find(m => m.role === 'user')?.content || '';
      summaryData = {
        title: firstUserMessage.substring(0, 50) || 'New Conversation',
        summary: firstUserMessage.substring(0, 200) || 'Conversation started.',
        tags: [],
      };
    }

    // Get conversation timestamps from messages (if available) or use current time
    // Note: messages array doesn't have created_at, so we'll use current time for last_message_at
    // and query the database for started_at if needed
    const now = new Date().toISOString();
    let startedAt = now;
    let lastMessageAt = now;
    
    // Try to get started_at from first message in database
    try {
      const { data: firstMessage } = await sb
        .from('chat_messages')
        .select('created_at')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (firstMessage?.created_at) {
        startedAt = firstMessage.created_at;
      }
    } catch (e) {
      // Ignore errors, use current time
    }
    
    // Try to get last_message_at from last message in database
    try {
      const { data: lastMessage } = await sb
        .from('chat_messages')
        .select('created_at')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastMessage?.created_at) {
        lastMessageAt = lastMessage.created_at;
      }
    } catch (e) {
      // Ignore errors, use current time
    }

    // Upsert into chat_convo_summaries (conflict on unique index idx_convo_summaries_user_conversation)
    // Note: Supabase upsert uses the unique constraint columns, not the index name
    // updated_at is auto-managed by trigger, so we don't include it in upsert
    const { error: upsertError } = await sb
      .from('chat_convo_summaries')
      .upsert({
        user_id: userId,
        conversation_id: conversationId,
        title: summaryData.title,
        summary: summaryData.summary,
        tags: summaryData.tags || [],
        employees_involved: employeesInvolved,
        started_at: startedAt,
        last_message_at: lastMessageAt,
        pinned: false,
        // updated_at is auto-updated by trigger, don't include it
      }, {
        // Use onConflict with the actual unique constraint column names
        // The constraint is typically on (user_id, conversation_id)
        // If the constraint name is different, Supabase will use the column names
        onConflict: 'user_id,conversation_id',
        ignoreDuplicates: false, // Update existing rows
      });

    if (upsertError) {
      console.error('[Custodian] Failed to upsert chat_convo_summaries:', {
        error: upsertError,
        userId,
        conversationId,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
    } else {
      console.log(`[Custodian] ✅ Updated summary for conversation ${conversationId}`);
    }
  } catch (error: any) {
    // Non-blocking: log error but don't throw
    console.warn('[Custodian] Error updating conversation summary:', error);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event, context) => {
  // Environment variable diagnostics (safe - never logs secrets)
  const envCheck = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnon: !!process.env.SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  console.log('[chat] env check', envCheck);

  // Validate required environment variables
  if (!envCheck.hasOpenAI || !envCheck.hasSupabaseUrl) {
    const missing = [];
    if (!envCheck.hasOpenAI) missing.push('OPENAI_API_KEY');
    if (!envCheck.hasSupabaseUrl) missing.push('SUPABASE_URL');
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Missing server environment variables',
        missing: missing.join(', '),
        message: 'Server configuration error. Please contact support.',
      }),
    };
  }

  // CORS headers (will be enhanced with guardrail headers later)
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // CRITICAL: Allow Authorization header for JWT auth
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

  // CRITICAL: Request timing instrumentation
  const requestStartTime = Date.now();
  const timingLogs: Record<string, number> = {};
  
  try {
    // Verify authentication from JWT token
    // Log auth header presence for debugging
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[Chat] Auth check:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      });
    }
    
    const authStartTime = Date.now();
    const { userId, error: authError } = await verifyAuth(event);
    timingLogs.auth = Date.now() - authStartTime;
    if (authError || !userId) {
      // Enhanced error logging for debugging
      console.error('[Chat] Auth failed:', {
        authError,
        hasAuthHeader: !!authHeader,
        userId: userId || 'none',
      });
      return {
        statusCode: 401,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: authError || 'Authentication required' }),
      };
    }
    
    // Log successful auth (dev only)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.log('[Chat] Auth successful:', { userId });
    }

    // Parse request body (userId now comes from JWT, not body)
    const body = JSON.parse(event.body || '{}') as ChatRequest;
    const { employeeSlug, message, sessionId, threadId: requestThreadId, stream = true, systemPromptOverride, documentIds } = body;

    // Validate required fields (userId already verified from JWT)
    if (!message) {
      return {
        statusCode: 400,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'message is required' }),
      };
    }

    // ========================================================================
    // 0.3. FAST PATH CHECK (Speed Mode for Short Messages)
    // ========================================================================
    // Skip expensive context retrieval for short messages/greetings to improve response time
    const messageTrimmed = message.trim();
    const messageLength = messageTrimmed.length;
    const isGreeting = /^(hi|hello|hey|thanks|thank you|thx|bye|goodbye|good night|good morning|good afternoon|sup|what's up|howdy)$/i.test(messageTrimmed);
    const isFastPath = messageLength <= 30 || isGreeting;
    
    if (isFastPath && process.env.NETLIFY_DEV === 'true') {
      console.log(`[Chat] 🚀 FAST PATH enabled: messageLength=${messageLength}, isGreeting=${isGreeting}`);
    }

    // ========================================================================
    // 0.5. RATE LIMITING (Optional - fails open if not available)
    // ========================================================================
    let isRateLimited = false;
    try {
      const rateLimitModule = await import('./_shared/rate-limit.js');
      if (rateLimitModule.assertWithinRateLimit) {
        await rateLimitModule.assertWithinRateLimit(userId, 20); // 20 requests per minute
      }
    } catch (rateLimitError: any) {
      if (rateLimitError.statusCode === 429) {
        // Rate limit exceeded - return proper 429 response
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
      // For other errors (including module not found, table missing, etc.), fail open
      // In local dev, rate limiting may not be available - don't crash
      if (rateLimitError.code !== 'MODULE_NOT_FOUND') {
        console.warn('[Chat] Rate limit check failed (non-fatal, failing open):', rateLimitError.message || rateLimitError);
      }
      isRateLimited = false; // Fail open in dev/local
    }

    let sb;
    try {
      sb = admin();
    } catch (error: any) {
      console.error('[Chat] Failed to initialize Supabase:', error);
      // Return graceful error instead of 500
      const isStreaming = stream !== false;
      if (isStreaming) {
        const errorMessage = "I'm sorry, I'm having trouble connecting to the database right now. Please try again in a moment.";
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: errorMessage })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
        };
      }
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: false,
          error: 'Database configuration error',
          content: "I'm sorry, I'm having trouble connecting to the database right now. Please try again in a moment.",
          message: process.env.NETLIFY_DEV === 'true' ? error.message : undefined,
        }),
      };
    }

    // ========================================================================
    // 1. UNIFIED GUARDRAILS (Policy Enforcement + PII Masking)
    // ========================================================================
    // Phase 2.2: All guardrails go through unified API (includes config loading)
    // Run guardrails on the user message BEFORE routing/model calls
    // This ensures all employees (Prime, Liberty, Tag, etc.) share the same protection
    
    // Get guardrail config to access preset for routing
    // Default to 'balanced' if config fetch fails
    let preset: 'strict' | 'balanced' | 'creative' = 'balanced';
    let guardrailConfig: any = null;
    try {
      // Use top-level import from guardrails-unified.js (no dynamic import needed)
      guardrailConfig = await getGuardrailConfig(userId);
      preset = guardrailConfig.preset || 'balanced';
    } catch (error) {
      console.warn('[Chat] Failed to get guardrail config, using default preset:', error);
      preset = 'balanced';
    }
    
    let masked = message;
    let piiFound: string[] = [];
    let guardrailResult: any = { ok: true, signals: {}, maskedMessages: [{ role: 'user', content: message }] };
    
    try {
      const guardrailContext: GuardrailContext = {
        userId,
        sessionId: sessionId || undefined,
        employeeSlug: employeeSlug || undefined,
        source: 'chat',
      };

      guardrailResult = await runInputGuardrails(guardrailContext, {
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
          guardrailResult.events || []
        );

        return {
          statusCode: blockedResponse.statusCode || 200,
          headers: {
            ...baseHeaders,
            ...headers,
            ...blockedResponse.headers,
          },
          body: blockedResponse.body,
        };
      }

      // Use the masked text from guardrails result
      masked = guardrailResult.maskedMessages?.[0]?.content || message;
      piiFound = guardrailResult.signals?.piiTypes || [];
    } catch (guardrailError: any) {
      // Guardrails failed - log but don't crash, use original message
      console.warn('[Chat] Guardrails check failed (non-fatal, using original message):', guardrailError.message || guardrailError);
      masked = message;
      piiFound = [];
      // Continue with original message - fail open in dev
    }

    console.log(`[Chat] Guardrails passed, PII masked: ${piiFound.length > 0}`, {
      original: message.slice(0, 40),
      masked: masked.slice(0, 40),
      foundTypes: piiFound,
      employeeSlug: employeeSlug || 'prime-boss',
      eventsCount: guardrailResult.events.length,
    });

    // ========================================================================
    // BUILD GUARDRAILS STATUS OBJECT (for response metadata)
    // ========================================================================
    /**
     * Build guardrails status object for chat responses
     * This provides real-time status based on actual guardrails execution
     */
    function buildGuardrailsStatus(mode: 'streaming' | 'json'): {
      enabled: boolean;
      pii_masking: boolean;
      moderation: boolean;
      policy_version: string;
      checked_at: string;
      mode: 'streaming' | 'json';
      reason?: string;
    } {
      const hasPiiMasking = guardrailConfig?.chat?.pii !== false && guardrailConfig?.ingestion?.pii !== false;
      const hasModeration = guardrailConfig?.chat?.moderation === true || guardrailConfig?.ingestion?.moderation === true;
      const isEnabled = guardrailResult?.ok !== false && guardrailConfig !== null;
      
      // Policy version: use preset as version identifier
      const policyVersion = guardrailConfig?.preset || 'balanced';
      
      // If guardrails failed to load or execute, mark as disabled
      let reason: string | undefined;
      if (!isEnabled) {
        if (!guardrailConfig) {
          reason = 'config_load_failed';
        } else if (!guardrailResult?.ok) {
          reason = guardrailResult?.blockedReason || 'execution_failed';
        } else {
          reason = 'unknown';
        }
      }
      
      return {
        enabled: isEnabled,
        pii_masking: hasPiiMasking && isEnabled,
        moderation: hasModeration && isEnabled,
        policy_version: policyVersion,
        checked_at: new Date().toISOString(),
        mode,
        ...(reason ? { reason } : {}),
      };
    }

    // ========================================================================
    // 4. EMPLOYEE ROUTING
    // ========================================================================
    // Restore original routing behavior: pass employeeSlug directly to router
    // Router handles normalization internally via resolveSlug()
    // Only normalize here for UI aliases (prime -> prime-boss, byte -> byte-docs, etc.)
    // but preserve canonical slugs as-is
    const requestedEmployeeSlug = employeeSlug 
      ? normalizeEmployeeSlug(employeeSlug) // Only normalizes known aliases, preserves canonical slugs
      : null; // null means router will auto-route based on message content
    
    let routing: any;
    let finalEmployeeSlug = 'prime-boss'; // Default fallback
    let systemPreamble: string | null = null;
    let employeePersona: string | null = null;
    
    try {
      routing = await routeToEmployee({
        userText: masked,
        requestedEmployee: requestedEmployeeSlug, // Pass normalized slug or null
        mode: preset, // Use guardrail preset (strict/balanced/creative)
      });

      const { employee, systemPreamble: routingPreamble, employeePersona: routingPersona } = routing;
      
      // Router already normalizes via resolveSlug(), so use its result directly
      // Only normalize again if router returned something unexpected
      if (employee) {
        finalEmployeeSlug = employee; // Router's resolveSlug already normalized it
      } else if (requestedEmployeeSlug) {
        finalEmployeeSlug = requestedEmployeeSlug; // Fallback to requested if router returned null
      } else {
        finalEmployeeSlug = 'prime-boss'; // Ultimate fallback
      }
      
      systemPreamble = routingPreamble || null;
      employeePersona = routingPersona || null;
    } catch (routingError: any) {
      // Routing failed - use requested employee or fallback to Prime
      console.warn('[Chat] Employee routing failed (non-fatal, using requested employee):', routingError.message || routingError);
      finalEmployeeSlug = requestedEmployeeSlug || 'prime-boss';
      systemPreamble = null;
      employeePersona = null;
    }
    
    const originalEmployeeSlug = finalEmployeeSlug; // Track original for handoff detection
    const explicitlyRequestedEmployee = requestedEmployeeSlug || null; // Store if employee was explicitly requested (not auto-routed)

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
    
    // Defensive employee profile loading - don't crash if profile missing
    // If profile is missing, continue without tools/system prompt (router's persona will be used)
    try {
      const { data: employeeProfile, error: profileError } = await sb
        .from('employee_profiles')
        .select('tools_allowed, system_prompt')
        .eq('slug', finalEmployeeSlug)
        .maybeSingle();
      
      if (profileError) {
        console.warn(`[Chat] Database error loading employee profile for ${finalEmployeeSlug}:`, profileError);
        // Don't change finalEmployeeSlug - continue with requested employee, just without tools
        console.log(`[Chat] Continuing with ${finalEmployeeSlug} without tools due to profile error`);
      } else if (!employeeProfile) {
        console.warn(`[Chat] No employee profile found for ${finalEmployeeSlug} - continuing without tools (router persona will be used)`);
        // Don't change finalEmployeeSlug - continue with requested employee, router's persona will be used
      } else {
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
      }
    } catch (error: any) {
      console.error('[Chat] Failed to load employee profile (non-fatal):', error);
      // Don't change finalEmployeeSlug - continue with requested employee
      // Router's persona and system prompt will be used instead
      console.log(`[Chat] Continuing with ${finalEmployeeSlug} using router persona due to profile loading error`);
      // Continue without tools if loading fails - chat will still work with router's persona
    }

    // ========================================================================
    // 5. ENSURE THREAD EXISTS (thread_id model)
    // ========================================================================
    // Resolve employee_key from slug using registry
    let employeeKey: string;
    try {
      const { getEmployeeKeyFromSlug } = await import('./_shared/employeeRegistryBackend.js');
      employeeKey = await getEmployeeKeyFromSlug(sb, finalEmployeeSlug);
    } catch (error) {
      console.warn('[Chat] Failed to resolve employee_key from registry, using fallback:', error);
      // Fallback: extract from slug (first part before hyphen)
      employeeKey = finalEmployeeSlug.split('-')[0] || 'prime';
    }
    
    // CRITICAL: thread_id must NEVER be null - ensure thread exists atomically
    // If request includes threadId, upsert that thread; otherwise create/find one
    let threadId: string;
    try {
      threadId = await ensureThread(sb, userId, employeeKey, requestThreadId);
      console.log(`[Chat] ✅ Thread ID: ${threadId} for user ${userId.substring(0, 8)}... employee ${employeeKey}`);
      
      // Backfill existing messages with thread_id (one-time migration)
      try {
        const backfilledCount = await backfillThreadId(sb, userId, employeeKey, threadId);
        if (backfilledCount > 0) {
          console.log(`[Chat] ✅ Backfilled ${backfilledCount} messages with thread_id ${threadId}`);
        }
      } catch (backfillError: any) {
        console.warn('[Chat] Backfill failed (non-fatal):', backfillError.message);
      }
    } catch (threadError: any) {
      console.error('[Chat] Failed to ensure thread:', threadError);
      // CRITICAL: If thread creation fails, return error - never use fallback UUID
      // This ensures FK integrity: every chat_messages.thread_id references a valid chat_threads.id
      return {
        statusCode: 500,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Failed to create or retrieve chat thread',
          message: threadError?.message || 'Thread creation failed',
          details: 'Please try again. If the problem persists, contact support.',
        }),
      };
    }
    
    // ========================================================================
    // 5.5. SESSION MANAGEMENT (for backward compatibility)
    // ========================================================================
    let finalSessionId: string | null = null;
    let sessionEmployeeSlug: string = finalEmployeeSlug; // Track employee from session (may change after handoff)
    try {
      const sessionStartTime = Date.now();
      const sessionResult = await ensureSession(sb, userId, sessionId, finalEmployeeSlug);
      timingLogs.session = Date.now() - sessionStartTime;
      // ensureSession returns { sessionId: string, employee_slug: string }
      finalSessionId = sessionResult?.sessionId ?? normalizeSessionId(sessionId) ?? null;
      // Use employee_slug from session if available (handles handoff scenarios)
      // CRITICAL: Only allow session employee to override if employee was NOT explicitly requested
      // This prevents sticky handoff - /dashboard/prime-chat must always show Prime
      if (sessionResult?.employee_slug) {
        sessionEmployeeSlug = sessionResult.employee_slug;
        // Only override if:
        // 1. Employee was NOT explicitly requested (explicitlyRequestedEmployee is null), OR
        // 2. Explicitly requested employee is prime-boss (route-forced, must respect)
        const shouldRespectRequestedEmployee = explicitlyRequestedEmployee !== null;
        const isPrimeRequested = explicitlyRequestedEmployee === 'prime-boss';
        
        if (sessionEmployeeSlug !== finalEmployeeSlug) {
          if (shouldRespectRequestedEmployee && !isPrimeRequested) {
            // Employee was explicitly requested (not auto-routed) - respect it, don't override
            console.log(`[Chat] Respecting explicitly requested employee ${finalEmployeeSlug} over session employee ${sessionEmployeeSlug}`);
            // Update session to match requested employee (fixes sticky handoff)
            try {
              await sb
                .from('chat_sessions')
                .update({ employee_slug: finalEmployeeSlug })
                .eq('id', finalSessionId);
              console.log(`[Chat] Updated session ${finalSessionId} to match requested employee ${finalEmployeeSlug}`);
            } catch (error: any) {
              console.warn('[Chat] Failed to update session employee (non-fatal):', error);
            }
          } else if (isPrimeRequested) {
            // Prime was explicitly requested (from /dashboard/prime-chat) - ALWAYS respect it
            console.log(`[Chat] Prime explicitly requested - forcing prime-boss, ignoring session employee ${sessionEmployeeSlug}`);
            // Update session to prime-boss to fix sticky handoff
            try {
              await sb
                .from('chat_sessions')
                .update({ employee_slug: 'prime-boss' })
                .eq('id', finalSessionId);
              console.log(`[Chat] Updated session ${finalSessionId} to prime-boss (route-forced)`);
            } catch (error: any) {
              console.warn('[Chat] Failed to update session to prime-boss (non-fatal):', error);
            }
          } else {
            // Employee was auto-routed (not explicitly requested) - allow session employee to override
            console.log(`[Chat] Session employee mismatch: auto-routed ${finalEmployeeSlug}, session has ${sessionEmployeeSlug} (using session employee)`);
            finalEmployeeSlug = sessionEmployeeSlug;
          }
        }
      }
      
      if (!finalSessionId) {
        throw new Error('Failed to get session ID from ensureSession');
      }
    } catch (error: any) {
      console.error('[Chat] Session creation failed:', error);
      // Use a fallback session ID if database fails
      const fallbackId = normalizeSessionId(sessionId) ?? `session-${userId}-${Date.now()}`;
      finalSessionId = typeof fallbackId === 'string' ? fallbackId : null;
    }

    // ========================================================================
    // 6. MEMORY RETRIEVAL
    // ========================================================================
    // Check if this is a Smart Import AI conversation (check session context)
    let isSmartImportAI = false;
    try {
      const normalizedSessionIdForCheck = normalizeSessionId(finalSessionId);
      if (normalizedSessionIdForCheck) {
        const { data: sessionData } = await sb
          .from('chat_sessions')
          .select('context')
          .eq('id', normalizedSessionIdForCheck)
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
    
    // FAST PATH: Skip expensive memory retrieval for short messages
    if (!isFastPath) {
      try {
        const memoryStartTime = Date.now();
        // Phase 2.1: Use unified memory API for comprehensive context
        const normalizedSessionId = normalizeSessionId(finalSessionId);
        const memory = await getMemory({
          userId,
          sessionId: normalizedSessionId || '',
          query: masked,
          options: {
            maxFacts: isSmartImportAI ? 8 : 5,
            topK: 6,
            minScore: 0.2,
            includeTasks: true, // Skip tasks in fast path
            includeSummaries: false
          }
        });

        // Use formatted context block from unified API
        memoryContext = memory.context || '';
        memoryFacts = memory.facts || [];
        memoryHitScore = memoryFacts.length > 0 ? memoryFacts[0].score : null;
        timingLogs.memory = Date.now() - memoryStartTime;

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
          const normalizedSessionId = normalizeSessionId(finalSessionId);
          memoryFacts = await recall({
            userId,
            query: masked,
            k: isSmartImportAI ? 8 : 5,
            minScore: 0.2,
            sessionId: normalizedSessionId || undefined
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
    } else {
      // FAST PATH: Skip memory retrieval for short messages
      if (process.env.NETLIFY_DEV === 'true') {
        console.log('[Chat] 🚀 FAST PATH: Skipping memory retrieval for short message');
      }
    }

    // Log memory recall summary (skip in fast path)
    if (!isFastPath) {
      const safeSessionId =
        typeof finalSessionId === "string"
          ? finalSessionId
          : String(finalSessionId || "");
      const sessionIdForLog = safeSessionId.length > 0
        ? safeSessionId.substring(0, 8)
        : 'no-session';
      console.log(`[CHAT] memory recall userId=${typeof userId === 'string' && userId.length > 8 ? userId.substring(0, 8) : userId}... sessionId=${sessionIdForLog}... employee=${finalEmployeeSlug} hasContext=${memoryContext.length > 0}`);
    }

    // ========================================================================
    // 7. GET RECENT MESSAGES (by thread_id if available, else session_id)
    // ========================================================================
    // FAST PATH: Load fewer messages for short queries (faster response)
    const messageLimit = isFastPath ? 10 : 50;
    let recentMessages: any[] = [];
    try {
      const messagesStartTime = Date.now();
      if (threadId) {
        // Load by thread_id (preferred)
        const { data: threadMessages, error: threadError } = await sb
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })
          .limit(messageLimit);
        
        if (!threadError && threadMessages) {
          recentMessages = threadMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
            id: m.id,
          }));
          console.log(`[Chat] ✅ Loaded ${recentMessages.length} messages from thread ${threadId.substring(0, 8)}...`);
        } else {
          console.warn('[Chat] Failed to load messages by thread_id, falling back to session_id');
        }
      }
      
        // Fallback to session_id if thread_id didn't work or wasn't available
        if (recentMessages.length === 0) {
          const normalizedSessionIdForMessages = normalizeSessionId(finalSessionId);
          if (normalizedSessionIdForMessages) {
            // FAST PATH: Use smaller token limit for short messages
            const tokenLimit = isFastPath ? 1000 : 4000;
            recentMessages = await getRecentMessages(sb, normalizedSessionIdForMessages, tokenLimit);
          const normalizedSessionIdForLog = normalizeSessionId(finalSessionId) || 'no-session';
          const safeSessionId2 =
            typeof normalizedSessionIdForLog === "string"
              ? normalizedSessionIdForLog
              : String(normalizedSessionIdForLog || "");
          if (recentMessages.length > 0) {
            console.log(`[Chat] ✅ Loaded ${recentMessages.length} previous messages from session ${safeSessionId2.substring(0, 8)}...`);
          } else {
            console.log(`[Chat] ℹ️ No previous messages found for session ${safeSessionId2.substring(0, 8)}... (this is normal for new conversations)`);
          }
        }
      }
      timingLogs.messages = Date.now() - messagesStartTime;
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
    // 7.5. GET USER PROFILE & BUILD CONTEXT INJECTION
    // ========================================================================
    // Fetch AI user context for fluency adaptation
    const profileStartTime = Date.now();
    const ctx = await fetchAiUserContext(userId);
    const userProfile = await getUserProfile(sb, userId);
    timingLogs.profile = Date.now() - profileStartTime;
    const userContextBlock = userProfile ? formatUserContextForPrompt(userProfile) : null;

    // ========================================================================
    // 8. BUILD MODEL MESSAGES
    // ========================================================================
    // Build system messages array (separate messages for each rule)
    // ORDER: Global fluency rule → Merged user context → Prime rule → Employee-specific prompts
    const systemMessages: Array<{ role: 'system'; content: string }> = [];
    
    // 1. Global AI Fluency Rule (ALL employees) - Single merged global rules message
    systemMessages.push({ role: 'system', content: AI_FLUENCY_GLOBAL_SYSTEM_RULE });
    
    // 2. Merged User Context (fluency level + user preferences in ONE message to avoid duplication)
    // Combine buildAiContextSystemMessage(ctx) with userContextBlock if available
    let mergedUserContext = buildAiContextSystemMessage(ctx);
    if (userContextBlock) {
      // Merge: AI fluency context + detailed user preferences
      mergedUserContext = `${mergedUserContext}\n\n---\n\n${userContextBlock}`;
    }
    
    // Add user name context (CRITICAL: Never show email as name)
    if (userProfile?.preferredName) {
      const firstName = userProfile.preferredName.split(' ')[0] || userProfile.preferredName;
      mergedUserContext += `\n\n**User Name Context (IMPORTANT):**
- User display name: ${userProfile.preferredName}
- Address the user as "${firstName}" in greetings and responses
- NEVER show their email address as their name
- If name is missing or unavailable, address them as "there"`;
    } else {
      mergedUserContext += `\n\n**User Name Context (IMPORTANT):**
- User name is not available
- Address the user as "there" in greetings and responses
- NEVER show their email address as their name`;
    }
    
    systemMessages.push({ role: 'system', content: mergedUserContext });
    
    // 3. Prime Context System Message (ONLY for Prime, if prime_context provided)
    const isPrime = finalEmployeeSlug === 'prime-boss' || finalEmployeeSlug === 'prime';
    if (isPrime && body.prime_context) {
      const pc = body.prime_context;
      
      // Build Prime context system message (convenience overlay, verified server-side)
      let primeContextMessage = 'PRIME CONTEXT (User State Snapshot):\n\n';
      
      // User identity
      primeContextMessage += `User: ${pc.displayName || 'User'}\n`;
      if (pc.timezone) primeContextMessage += `Timezone: ${pc.timezone}\n`;
      if (pc.currency) primeContextMessage += `Currency: ${pc.currency}\n`;
      if (pc.currentStage) primeContextMessage += `Stage: ${pc.currentStage}\n`;
      
      // Financial snapshot
      if (pc.financialSnapshot) {
        const fs = pc.financialSnapshot;
        primeContextMessage += `\nSnapshot:\n`;
        primeContextMessage += `- hasTransactions: ${fs.hasTransactions}\n`;
        primeContextMessage += `- uncategorizedCount: ${fs.uncategorizedCount}\n`;
        if (fs.monthlySpend !== undefined) primeContextMessage += `- monthlySpend: ${fs.monthlySpend}\n`;
        if (fs.topCategories && fs.topCategories.length > 0) {
          primeContextMessage += `- topCategories: ${fs.topCategories.map(c => `${c.name} (${c.amount})`).join(', ')}\n`;
        }
        if (fs.hasDebt !== undefined) primeContextMessage += `- hasDebt: ${fs.hasDebt}\n`;
        if (fs.hasGoals !== undefined) primeContextMessage += `- hasGoals: ${fs.hasGoals}\n`;
      }
      
      // Memory summary
      if (pc.memorySummary) {
        const ms = pc.memorySummary;
        primeContextMessage += `\nMemorySummary:\n`;
        if (ms.factsCount !== undefined) primeContextMessage += `- factsCount: ${ms.factsCount}\n`;
        if (ms.lastUpdatedAt) primeContextMessage += `- lastUpdatedAt: ${ms.lastUpdatedAt}\n`;
        if (ms.recentFacts && ms.recentFacts.length > 0) {
          primeContextMessage += `- recentFacts: ${ms.recentFacts.slice(0, 3).join(', ')}\n`;
        }
      }
      
      // Prepend Prime context BEFORE orchestration rule (so orchestration can reference context)
      systemMessages.push({ role: 'system', content: primeContextMessage });
      
      // Dev logging (redacted)
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[chat] prime_context received', {
          hasName: !!pc.displayName,
          stage: pc.currentStage,
          uncategorizedCount: pc.financialSnapshot?.uncategorizedCount,
          factsCount: pc.memorySummary?.factsCount
        });
      }
    }
    
    // 3.5. Prime Orchestration Rule (ONLY for Prime, after context)
    if (isPrime) {
      systemMessages.push({ role: 'system', content: PRIME_ORCHESTRATION_RULE });
    }
    
    // 3.6. Custodian Context (ONLY for Custodian, if custodian slug)
    const isCustodian = finalEmployeeSlug === 'custodian' || finalEmployeeSlug === 'custodian-settings';
    if (isCustodian) {
      try {
        // Query user security settings
        const { data: profile } = await sb
          .from('profiles')
          .select('metadata, created_at, updated_at')
          .eq('id', userId)
          .single();
        
        const metadata = profile?.metadata || {};
        const twoFactorEnabled = metadata.two_factor_enabled || false;
        const privacyLevel = metadata.privacy_level || 'standard';
        const accountAge = profile?.created_at ? 
          Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const onboardingCompleted = metadata.onboarding_completed || metadata.prime_initialized || false;
        
        const custodianContext = `
CUSTODIAN CONTEXT (Account Security & Settings):
- Account age: ${accountAge} days
- Two-factor authentication: ${twoFactorEnabled ? 'Enabled ✅' : 'Not enabled ⚠️'}
- Privacy level: ${privacyLevel}
- Account security score: ${twoFactorEnabled ? '8/10 (Good)' : '5/10 (Needs improvement)'}
- Onboarding completed: ${onboardingCompleted ? 'Yes' : 'No'}
- Last updated: ${profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
`;
        
        systemMessages.push({ role: 'system', content: custodianContext });
        
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log('[Custodian Context] Security context injected:', {
            accountAge,
            twoFactorEnabled,
            privacyLevel,
            onboardingCompleted,
          });
        }
      } catch (error: any) {
        console.warn('[Custodian Context] Failed to load security context:', error);
        // Continue without context if loading fails
      }
    }
    
    // 5. Handoff context if available
    if (handoffContext) {
      const handoffPreamble = `You're taking over this conversation from ${handoffContext.from_employee}.`;
      let handoffContent = handoffPreamble;
      
      if (handoffContext.reason) {
        handoffContent += `\nReason for handoff: ${handoffContext.reason}`;
      }
      
      if (handoffContext.context_summary) {
        handoffContent += `\n\nContext Summary:\n${handoffContext.context_summary}`;
      }
      
      if (handoffContext.key_facts && handoffContext.key_facts.length > 0) {
        handoffContent += `\n\nKey Facts:\n${handoffContext.key_facts.map(f => `- ${f}`).join('\n')}`;
      }
      
      if (handoffContext.user_intent) {
        handoffContent += `\n\nUser's Current Question: ${handoffContext.user_intent}`;
      }
      
      systemMessages.push({ role: 'system', content: handoffContent });
    }
    
    // 6. Employee-specific system prompt (from database or routing)
    if (customSystemPrompt) {
      // Use custom system prompt (includes category context, transaction context, etc.)
      systemMessages.push({ role: 'system', content: customSystemPrompt });
      if (memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
    } else if (employeeSystemPrompt) {
      // Use system_prompt from employee_profiles table (includes org chart, handoff rules, etc.)
      systemMessages.push({ role: 'system', content: employeeSystemPrompt });
      if (memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
      console.log(`[Chat] Using system_prompt from database for ${finalEmployeeSlug}`);
    } else {
      // Fallback to default routing-based prompts
      if (systemPreamble) {
        systemMessages.push({ role: 'system', content: systemPreamble });
      }
      if (memoryContext) {
        systemMessages.push({ role: 'system', content: memoryContext });
      }
      if (employeePersona) {
        systemMessages.push({ role: 'system', content: employeePersona });
      }
      console.log(`[Chat] Using routing-based prompts for ${finalEmployeeSlug} (no DB system_prompt found)`);
    }

    // Build attachment context if documentIds provided
    let attachmentContext: string | null = null;
    if (documentIds && documentIds.length > 0) {
      attachmentContext = await buildAttachmentContext(sb, userId, documentIds);
    }

    // Combine user message with attachment context
    let userMessageContent = masked;
    if (attachmentContext) {
      userMessageContent = `${masked}${attachmentContext}`;
    }

    // Build final messages: system messages + chat history + current user message
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...systemMessages, // Multiple system messages (fluency rule, context, Prime rule, employee prompt, etc.)
      ...recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessageContent },
    ];

    // ========================================================================
    // 8.4. PRIME→BYTE HANDOFF TRIGGER (Explicit confirmation only)
    // ========================================================================
    // Prime-only: Only trigger handoff on explicit confirmation, not hypothetical questions
    // Handoff should happen ONLY when:
    // 1. User explicitly confirms ("yes, let's upload/import", "go ahead", "yes", "ok")
    // 2. User clicks Upload button (handled by frontend)
    // 3. Prime explicitly calls request_employee_handoff tool (handled by tool execution)
    // REMOVED: Automatic keyword-based handoff to prevent stickiness on hypothetical questions
    if (isPrime && finalEmployeeSlug === 'prime-boss') {
      // Only trigger on explicit confirmation, not just keywords
      const confirmationPattern = /\b(yes|ok|okay|go ahead|let's do it|let's upload|let's import|proceed|start|begin|ready)\b/i;
      const uploadIntentPattern = /\b(upload|import|statement|bank statement|receipt|pdf|transactions|document|file|scan|ocr|parse)\b/i;
      
      // Require BOTH confirmation AND upload intent (explicit user intent)
      const hasConfirmation = confirmationPattern.test(userMessageContent);
      const hasUploadIntent = uploadIntentPattern.test(userMessageContent);
      
      if (hasConfirmation && hasUploadIntent) {
        console.log(`[Chat] 🔄 PRIME→BYTE HANDOFF: User explicitly confirmed upload/import intent`);
        
        // CRITICAL: Ensure we have a valid sessionId before proceeding with handoff
        if (!finalSessionId) {
          console.error('[Chat] ❌ HANDOFF FAILED: No valid sessionId available.');
        } else {
          // Simulate handoff tool result to reuse existing handoff processing logic
          const simulatedHandoffResult = {
            ok: true,
            data: {
              requested_handoff: true,
              target_slug: 'byte-docs',
              reason: 'Smart Import',
              summary_for_next_employee: 'User wants to upload a statement/receipt. Ask for the file and run OCR/parse pipeline. Summarize results and offer handback to Prime.',
            },
          };
          
          // Process handoff immediately (reuse existing logic from tool execution)
          try {
            const handoffData = simulatedHandoffResult.data;
            const targetSlug = handoffData.target_slug;
            const reason = handoffData.reason || 'Smart Import';
            const summary = handoffData.summary_for_next_employee;
            
            console.log(`[Chat] ✅ AUTO-HANDOFF COMPLETE: ${originalEmployeeSlug} → ${targetSlug}`, {
              reason,
              summary: summary?.substring(0, 100),
              sessionId: finalSessionId,
            });
            
            // Gather handoff context
            let handoffRecentMessages: any[] = [];
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
                handoffRecentMessages = messagesData.reverse(); // Oldest first
              }
              
              // Extract key facts from memory
              if (memoryFacts && memoryFacts.length > 0) {
                keyFacts = memoryFacts.slice(0, 5).map(f => f.fact);
              }
            } catch (error: any) {
              console.warn('[Chat] Failed to gather handoff context:', error);
            }
            
            // Store handoff context in database
            try {
              await sb.from('handoffs').insert({
                user_id: userId,
                session_id: finalSessionId,
                from_employee: originalEmployeeSlug,
                to_employee: targetSlug,
                reason: reason,
                context_summary: summary || `Handoff from ${originalEmployeeSlug} to ${targetSlug}`,
                key_facts: keyFacts,
                recent_messages: handoffRecentMessages,
                user_intent: masked.substring(0, 500),
                status: 'initiated',
              });
              
              console.log(`[Chat] Stored auto-handoff context for session ${finalSessionId}`);
            } catch (error: any) {
              console.warn('[Chat] Failed to store auto-handoff context:', error);
            }
            
            // Update session's employee_slug ONLY if this is a confirmed handoff (not hypothetical)
            // CRITICAL: Only persist handoff if user explicitly confirmed (hasConfirmation && hasUploadIntent)
            // This prevents session from becoming "sticky" after hypothetical questions
            // Note: This handoff path only runs when hasConfirmation && hasUploadIntent is true (see line ~1591)
            try {
              await sb
                .from('chat_sessions')
                .update({ employee_slug: targetSlug })
                .eq('id', finalSessionId);
              
              console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug} (confirmed handoff)`);
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
                thread_id: threadId,
              });
              
              console.log(`[Chat] Inserted auto-handoff system message for session ${finalSessionId}`);
            } catch (error: any) {
              console.warn('[Chat] Failed to insert auto-handoff system message:', error);
            }
            
            // CRITICAL: Return early with silent handoff - do NOT continue processing
            // Prime must NOT produce a full answer when handing off
            // Return only a short handoff message, then Byte will produce the substantive answer
            const handoffConfirmation = "Got it — handing this to Byte.";
            const isStreaming = stream !== false;
            
            // Log handoff for debugging
            console.log(`[Chat] 🔄 HANDOFF: ${originalEmployeeSlug} → ${targetSlug}`, {
              requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              responder: targetSlug,
              handoffOccurred: true,
            });
            
            if (isStreaming) {
              return {
                statusCode: 200,
                headers: {
                  ...baseHeaders,
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive',
                  'X-Employee': targetSlug,
                  'X-Handoff': `${originalEmployeeSlug}-to-${targetSlug}`,
                },
                body: `data: ${JSON.stringify({ role: 'assistant', content: handoffConfirmation })}\n\ndata: ${JSON.stringify({ type: 'handoff', from: originalEmployeeSlug, to: targetSlug })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
              };
            } else {
              return {
                statusCode: 200,
                headers: {
                  ...baseHeaders,
                  'Content-Type': 'application/json',
                  'X-Employee': targetSlug,
                  'X-Handoff': `${originalEmployeeSlug}-to-${targetSlug}`,
                },
                body: JSON.stringify({
                  ok: true,
                  content: handoffConfirmation,
                  handoff: {
                    from: originalEmployeeSlug,
                    to: targetSlug,
                    reason: reason,
                  },
                  thread_id: threadId,
                }),
              };
            }
          } catch (error: any) {
            console.error('[Chat] Failed to process auto-handoff:', error);
            // Continue with normal Prime processing if handoff fails
          }
        }
      }
    }

    // Log context summary (skip detailed logging in fast path)
    if (!isFastPath) {
      console.log(`[Chat] Context: ${recentMessages.length} history messages, ${memoryFacts.length} memory facts`);
    } else if (process.env.NETLIFY_DEV === 'true') {
      console.log(`[Chat] 🚀 FAST PATH: ${recentMessages.length} history messages (memory skipped)`);
    }

    // ========================================================================
    // 8.5. RESOLVE MODEL CONFIGURATION (before dev logging and API calls)
    // ========================================================================
    // Get employee-specific model configuration early so it's available for logging and API calls
    // CRITICAL: modelConfig must ALWAYS be defined - never throw ReferenceError
    let modelConfig: { model: string; temperature: number; maxTokens: number };
    try {
      modelConfig = await getEmployeeModelConfig(finalEmployeeSlug);
      // Verify config is valid
      if (!modelConfig || !modelConfig.model || typeof modelConfig.temperature !== 'number' || typeof modelConfig.maxTokens !== 'number') {
        throw new Error('Invalid model config returned');
      }
      
      // FAST PATH: Reduce maxTokens for short messages (faster response, lower cost)
      if (isFastPath && modelConfig.maxTokens > 300) {
        modelConfig.maxTokens = 300;
        if (process.env.NETLIFY_DEV === 'true') {
          console.log(`[Chat] 🚀 FAST PATH: Reduced maxTokens to ${modelConfig.maxTokens} for short message`);
        }
      }
      
      console.log(`[Chat] modelConfig resolved: model=${modelConfig.model}, temperature=${modelConfig.temperature}, maxTokens=${modelConfig.maxTokens}`);
    } catch (configError: any) {
      console.warn('[Chat] Failed to get employee model config (non-fatal, using defaults):', configError?.message || configError);
      // Fallback to default config using env var or safe defaults
      // Use process.env only (server-safe, CJS compatible)
      const defaultModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
      const defaultMaxTokens = isFastPath ? 300 : 2000; // FAST PATH: Lower maxTokens
      modelConfig = {
        model: defaultModel,
        temperature: 0.7,
        maxTokens: defaultMaxTokens,
      };
      console.log(`[Chat] modelConfig resolved (fallback): model=${modelConfig.model}, temperature=${modelConfig.temperature}, maxTokens=${modelConfig.maxTokens}`);
    }
    
    // Final safety check - ensure modelConfig is never undefined
    if (!modelConfig || !modelConfig.model) {
      console.error('[Chat] CRITICAL: modelConfig is still undefined after all fallbacks - using emergency defaults');
      const emergencyMaxTokens = isFastPath ? 300 : 2000; // FAST PATH: Lower maxTokens
      modelConfig = {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: emergencyMaxTokens,
      };
    }

    // Track request timing (used in both streaming and non-streaming paths)
    const requestStartTime = Date.now();
    let firstTokenTime: number | null = null;

    // DEV: Comprehensive AI request logging
    // Use process.env only (server-safe, CJS compatible)
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.group(`🤖 [Backend AI Request] ${finalEmployeeSlug}`);
      
      // Log model configuration (now guaranteed to be defined)
      console.log('⚙️ Model Config:', {
        model: modelConfig.model,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
      });
      
      // Log system messages summary
      const systemMessagesSummary = systemMessages.map((m, i) => ({
        index: i,
        role: m.role,
        contentLength: m.content.length,
        preview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        hasContextData: {
          'prime-boss': m.content.includes('uncategorizedCount') || m.content.includes('topCategories'),
          'byte-docs': m.content.includes('Document:') || m.content.includes('OCR Text'),
          'tag-ai': m.content.includes('uncategorized') || m.content.includes('category'),
          'crystal-analytics': m.content.includes('spending') || m.content.includes('budget'),
        }[finalEmployeeSlug] || false,
      }));
      console.log('📋 System Messages:', systemMessagesSummary);
      
      // Log context summary
      const contextSummary = {
        systemMessagesCount: systemMessages.length,
        historyMessagesCount: recentMessages.length,
        memoryFactsCount: memoryFacts.length,
        hasPrimeContext: isPrime && !!body.prime_context,
        hasDocumentContext: !!attachmentContext,
        hasMemoryContext: memoryContext.length > 0,
        hasHandoffContext: !!handoffContext,
        userMessageLength: userMessageContent.length,
      };
      console.log('📊 Context Summary:', contextSummary);
      
      // Log user message
      console.log('💬 User Message:', userMessageContent.substring(0, 200) + (userMessageContent.length > 200 ? '...' : ''));
      
      // Log expected context per employee
      const expectedContext = {
        'prime-boss': {
          shouldHave: ['Financial snapshot', 'Memory summary', 'User facts', 'RAG embeddings'],
          actualHas: [
            isPrime && body.prime_context ? 'Financial snapshot' : null,
            isPrime && body.prime_context?.memorySummary ? 'Memory summary' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
        'byte-docs': {
          shouldHave: ['Document context', 'User facts', 'RAG embeddings'],
          actualHas: [
            attachmentContext ? 'Document context' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
        'tag-ai': {
          shouldHave: ['Uncategorized count', 'User facts', 'RAG embeddings'],
          actualHas: [
            memoryContext.includes('uncategorized') ? 'Uncategorized count' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
        'crystal-analytics': {
          shouldHave: ['Analytics data', 'Budget data', 'User facts', 'RAG embeddings'],
          actualHas: [
            memoryContext.includes('spending') || memoryContext.includes('budget') ? 'Analytics/Budget data' : null,
            memoryFacts.length > 0 ? 'User facts' : null,
            memoryContext.includes('Relevant Past Conversations') ? 'RAG embeddings' : null,
          ].filter(Boolean),
        },
      }[finalEmployeeSlug] || { shouldHave: ['User facts', 'RAG embeddings'], actualHas: [] };
      
      console.log('🎯 Expected vs Actual Context:', expectedContext);
      
      console.groupEnd();
    }

    // ========================================================================
    // 9. CALL OPENAI (Streaming)
    // ========================================================================
    if (!openai) {
      // Return graceful error instead of 500
      const isStreaming = stream !== false;
      if (isStreaming) {
        const errorMessage = "I'm sorry, the AI service is not properly configured right now. Please contact support or try again later.";
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
          body: `data: ${JSON.stringify({ role: 'assistant', content: errorMessage })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId })}\n\n`,
        };
      }
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ok: false,
          error: 'OpenAI API key not configured',
          content: "I'm sorry, the AI service is not properly configured right now. Please contact support or try again later.",
        }),
      };
    }

    // Save user message to database (masked) - non-blocking
    try {
      const messageData: any = {
        session_id: finalSessionId, // Keep for backward compatibility
        user_id: userId,
        role: 'user',
        content: masked, // Store masked version
        tokens: estimateTokens(masked),
        thread_id: threadId, // CRITICAL: thread_id is always required
      };
      console.log(`[Chat] Inserting user message with thread_id: ${threadId}`);
      await sb.from('chat_messages').insert(messageData);
      
      // Log AI activity event (non-blocking, uses RLS with auth.uid())
      const authToken = event.headers?.authorization || event.headers?.Authorization || '';
      if (authToken && userId) {
        logAiActivity(authToken.replace('Bearer ', ''), {
          employeeId: finalEmployeeSlug,
          eventType: 'message_sent',
          status: 'success',
          label: `User sent message to ${finalEmployeeSlug}`,
          details: { message_length: masked.length, thread_id: finalSessionId },
        }).catch(err => {
          console.warn('[Chat] Failed to log activity event (non-fatal):', err);
        });
      }

      // AI Fluency: Detect multi-step chat (light heuristic)
      // If session has 3+ messages (user + assistant + user), it's a multi-step conversation
      if (recentMessages.length >= 3) {
        // Count user messages in recent history (excluding current one we just saved)
        const userMessageCount = recentMessages.filter(m => m.role === 'user').length;
        if (userMessageCount >= 1) {
          // Log multi-step chat event (non-blocking)
          logUserEvent({
            userId,
            eventType: 'multi_step_chat',
            eventValue: userMessageCount + 1, // +1 for current message
            meta: { sessionId: finalSessionId, employeeSlug: finalEmployeeSlug }
          }).catch(err => {
            console.error('[Chat] Error logging multi-step chat event:', err);
            // Don't block - logging failures are non-fatal
          });
        }
      }
    } catch (error: any) {
      console.warn('[Chat] Failed to save user message:', error);
      // Continue even if save fails
    }

    if (stream) {
      // Streaming response (SSE) with tool support
      console.log('[Chat] Streaming mode enabled for employee:', finalEmployeeSlug, 'userId:', userId);
      
      // Capture original employee slug before potential handoff
      const originalEmployeeSlug = finalEmployeeSlug;
      
      // Declare toolResults at function scope to ensure it's accessible throughout the streaming block
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      try {
        // Send meta event at start for debugging (will be added to streamBuffer)
        
        // Convert tools to OpenAI format if available
        let openaiTools: any = undefined;
        try {
          openaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
        } catch (toolError: any) {
          console.warn('[Chat] Failed to convert tools to OpenAI format (non-fatal):', toolError);
          // Continue without tools
        }
        
        // Model config already resolved above - reuse it
        // (No need to resolve again - already available in scope)
        
        // Note: Netlify Functions streaming requires returning a promise that resolves to chunks
        console.log('[Chat] OPENAI streaming call start', { employeeSlug: finalEmployeeSlug, userId });
        
        // DEV: Log what's being sent to OpenAI
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.group(`🚀 [OpenAI API Call] ${finalEmployeeSlug}`);
          console.log('📤 Request to OpenAI:', {
            model: modelConfig.model,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            messagesCount: messages.length,
            systemMessagesCount: messages.filter(m => m.role === 'system').length,
            toolsCount: openaiTools?.length || 0,
          });
          
          // Log system messages (first 3 for brevity)
          const systemMsgs = messages.filter(m => m.role === 'system').slice(0, 3);
          systemMsgs.forEach((msg, i) => {
            console.log(`📋 System Message ${i + 1}:`, {
              length: msg.content.length,
              preview: msg.content.substring(0, 150) + '...',
              hasContextData: msg.content.includes('uncategorizedCount') || 
                             msg.content.includes('topCategories') ||
                             msg.content.includes('Document:') ||
                             msg.content.includes('spending') ||
                             msg.content.includes('budget'),
            });
          });
          
          console.log('💬 User Message:', messages.find(m => m.role === 'user')?.content?.substring(0, 200));
          console.groupEnd();
        }
        
        // CRITICAL: Time OpenAI call
        const openaiStartTime = Date.now();
        const openaiStream = await openai.chat.completions.create({
          model: modelConfig.model,
          messages,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.maxTokens,
          stream: true,
          tools: openaiTools, // Add tools if available
        });
        timingLogs.openai_ttft = Date.now() - openaiStartTime;
        console.log('[Chat] OPENAI streaming call initiated, starting to process chunks');

        // Build response headers (will be updated if handoff occurs)
        let headers = buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
          memoryHitTopScore: memoryHitScore,
          memoryHitCount: memoryFacts.length,
          employee: finalEmployeeSlug,
          routeConfidence: 0.8,
          sessionId: finalSessionId || undefined, // Include sessionId in headers for frontend
        });

        // Create streaming response with tool calling support
        let assistantContent = '';
        let toolCalls: any[] = [];
        // requestStartTime and firstTokenTime already declared above
        
        // Send meta event at start for debugging
        let streamBuffer = `event: meta\ndata: ${JSON.stringify({ status: 'starting' })}\n\n`;
        
        // Send guardrails status as FIRST meta event (so UI can show "Secured" immediately)
        const guardrailsStatus = buildGuardrailsStatus('streaming');
        streamBuffer += `event: meta\ndata: ${JSON.stringify({ guardrails: guardrailsStatus })}\n\n`;
        
        // Dev-only verification log
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Guardrails] enabled=${guardrailsStatus.enabled} pii_masking=${guardrailsStatus.pii_masking} moderation=${guardrailsStatus.moderation} version=${guardrailsStatus.policy_version}`);
        }
        
        // Send employee header first (will be updated if handoff occurs)
        const employeePayload = { type: 'employee', employee: finalEmployeeSlug };
        streamBuffer += `data: ${JSON.stringify(employeePayload)}\n\n`;
        // DEV: Log every SSE payload type
        if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
          console.log('[CHAT SSE OUT]', employeePayload.type, 'employee:', finalEmployeeSlug);
        }

        // Stream tokens and collect tool calls
        for await (const chunk of openaiStream) {
          // Track time to first token
          if (!firstTokenTime && chunk.choices[0]?.delta?.content) {
            firstTokenTime = Date.now();
          }
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) {
            assistantContent += delta.content;
            // Frontend expects type: 'text' with content property, not type: 'token' with token
            const textPayload = { type: 'text', content: delta.content };
            streamBuffer += `data: ${JSON.stringify(textPayload)}\n\n`;
            // DEV: Log every SSE payload type
            if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
              console.log('[CHAT SSE OUT]', textPayload.type, 'content length:', delta.content.length);
            }
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
        // toolResults already declared at function scope above
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
                  
                  const result = await executeTool(toolModule, args, toolContext, {
                    employeeSlug: finalEmployeeSlug,
                    mode: 'propose-confirm', // TODO: Get from user preferences
                    autonomyLevel: 1, // TODO: Get from user preferences or tool metadata
                  });
                  
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
                        // CRITICAL: Ensure we have a valid sessionId before proceeding with handoff
                        if (!finalSessionId) {
                          console.error('[Chat] ❌ HANDOFF FAILED: No valid sessionId available. Cannot proceed with handoff.');
                          // Continue without handoff - don't crash
                          continue;
                        }
                        
                        const targetSlug = handoffData.target_slug;
                        const reason = handoffData.reason || 'Better suited for this question';
                        const summary = handoffData.summary_for_next_employee;
                        
                        console.log(`[Chat] ✅ HANDOFF COMPLETE (streaming): ${originalEmployeeSlug} → ${targetSlug}`, {
                          reason,
                          summary: summary?.substring(0, 100),
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
                        
                        // Update session's employee_slug (tool-based handoff - explicit action, safe to persist)
                        // This is from Prime calling request_employee_handoff tool, which is an explicit handoff action
                        try {
                          await sb
                            .from('chat_sessions')
                            .update({ employee_slug: targetSlug })
                            .eq('id', finalSessionId);
                          
                          console.log(`[Chat] Session ${finalSessionId} updated to employee: ${targetSlug} (tool-based handoff)`);
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
                            thread_id: threadId, // CRITICAL: thread_id is always required
                          });
                          console.log(`[Chat] Inserting system handoff message with thread_id: ${threadId}`);
                          
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
        try {
          // If handoff occurred, reload tools for new employee
          let openaiToolsAfterHandoff: any = undefined;
          try {
            openaiToolsAfterHandoff = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
          } catch (toolError: any) {
            console.warn('[Chat] Failed to convert tools after handoff (non-fatal):', toolError);
          }
          
          // Use model config for current employee (may have changed after handoff)
          let modelConfigAfterHandoff;
          try {
            modelConfigAfterHandoff = await getEmployeeModelConfig(finalEmployeeSlug);
          } catch (configError: any) {
            console.warn('[Chat] Failed to get model config after handoff (non-fatal, using defaults):', configError);
            modelConfigAfterHandoff = {
              model: 'gpt-4o-mini',
              temperature: 0.7,
              maxTokens: 2000,
            };
          }
          
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
                    // Frontend expects type: 'text' with content property
                    const textPayload = { type: 'text', content: delta };
                    streamBuffer += `data: ${JSON.stringify(textPayload)}\n\n`;
                    // DEV: Log every SSE payload type
                    if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
                      console.log('[CHAT SSE OUT]', textPayload.type, 'content length:', delta.length);
                    }
                  }
                }
              } catch (secondStreamError: any) {
                console.error('[Chat] Second streaming call failed after tool execution:', secondStreamError);
                // Add error message to stream
                const errorMsg = "I had trouble processing the tool results. Let me try a different approach.";
                assistantContent = errorMsg;
                streamBuffer += `data: ${JSON.stringify({ type: 'text', content: errorMsg })}\n\n`;
              }
      }

      // Update employee header if handoff occurred
      if (finalEmployeeSlug !== originalEmployeeSlug) {
        streamBuffer = `data: ${JSON.stringify({ type: 'employee', employee: finalEmployeeSlug })}\n\n` + streamBuffer;
      }

      // ========================================================================
      // CUSTODIAN CLOSE-OUT SUMMARY (Step 6)
      // ========================================================================
      // When Custodian resolves an issue or hands off, append a structured summary
      // This helps users understand what was done and what's next
      // Check if Custodian was involved (either as original or final employee)
      const custodianWasInvolved = originalEmployeeSlug === 'custodian' || finalEmployeeSlug === 'custodian';
      const didHandoff = finalEmployeeSlug !== originalEmployeeSlug;
      const custodianHandedOff = originalEmployeeSlug === 'custodian' && didHandoff;
      
      if (custodianWasInvolved && assistantContent.trim().length > 0) {
        try {
          // Generate structured summary
          // Format: Diagnosis, What we changed, How to verify, Next steps / who owns it
          const summaryParts: string[] = [];
          
          if (custodianHandedOff) {
            // Handoff summary - Custodian handed off to another employee
            summaryParts.push(`\n\n---\n**Custodian Summary:**`);
            summaryParts.push(`**Diagnosis:** Issue triaged and routed to appropriate specialist.`);
            summaryParts.push(`**Action Taken:** Handed off to ${finalEmployeeSlug} for specialized assistance.`);
            summaryParts.push(`**Next Steps:** Continue conversation with ${finalEmployeeSlug} - they have the context needed.`);
          } else if (finalEmployeeSlug === 'custodian') {
            // Resolution summary (when Custodian resolves without handoff)
            // Extract key points from response (simple heuristic)
            const responseLower = assistantContent.toLowerCase();
            const hasDiagnosis = responseLower.includes('issue') || responseLower.includes('problem') || responseLower.includes('error') || responseLower.includes('diagnos');
            const hasAction = responseLower.includes('changed') || responseLower.includes('updated') || responseLower.includes('fixed') || responseLower.includes('resolved') || responseLower.includes('addressed');
            
            if (hasDiagnosis || hasAction) {
              summaryParts.push(`\n\n---\n**Custodian Summary:**`);
              if (hasDiagnosis) {
                summaryParts.push(`**Diagnosis:** Issue identified and addressed.`);
              }
              if (hasAction) {
                summaryParts.push(`**What Changed:** See response above for details.`);
              }
              summaryParts.push(`**How to Verify:** Test the functionality or check settings as described.`);
              summaryParts.push(`**Next Steps:** If issues persist, feel free to ask for further assistance.`);
            }
          }
          
          // Only append summary if we detected a resolution/handoff pattern
          if (summaryParts.length > 0) {
            const summaryText = summaryParts.join('\n');
            streamBuffer += `data: ${JSON.stringify({ type: 'text', content: summaryText })}\n\n`;
            // Also append to assistantContent for database storage
            assistantContent += summaryText;
          }
        } catch (error: any) {
          // Fail silently - don't break chat if summary generation fails
          console.warn('[Chat] Failed to generate Custodian close-out summary:', error);
        }
      }

      // Send completion signal
      // Include guardrails metadata in done event
      const guardrailsMetadata = {
        status: guardrailResult?.ok ? 'active' : 'blocked',
        blocked: !guardrailResult?.ok,
        reasons: guardrailResult?.blockedReason ? [guardrailResult.blockedReason] : [],
        pii_masked: (guardrailResult?.signals?.pii || piiFound.length > 0) ? true : false,
        events_count: guardrailResult?.events?.length || 0,
      };
      
      const donePayload = { type: 'done', guardrails: guardrailsMetadata, thread_id: threadId };
      streamBuffer += `data: ${JSON.stringify(donePayload)}\n\n`;
      // DEV: Log every SSE payload type
      if (process.env.NETLIFY_DEV || process.env.NODE_ENV === 'development') {
        console.log('[CHAT SSE OUT]', donePayload.type, 'thread_id:', threadId);
      }
      console.log('[Chat] OPENAI streaming call completed, total content length:', assistantContent.length);
      
      // DEV: Verify single terminal path (prove no double emission)
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log(`[Chat] ✅ SSE Response Complete:`, {
          requestId: threadId,
          mode: 'SSE',
          doneEventEmitted: true,
          contentLength: assistantContent.length,
        });
      }

      // DEV: Comprehensive AI response logging
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.group(`✅ [Backend AI Response] ${finalEmployeeSlug}`);
        
        console.log('📥 Response Summary:', {
          model: modelConfig.model,
          responseLength: assistantContent.length,
          toolCallsCount: toolCalls.length,
          totalLatency: (Date.now() - requestStartTime) + 'ms',
          timeToFirstToken: firstTokenTime ? (firstTokenTime - requestStartTime) + 'ms' : 'N/A',
        });
        
        // Log response content
        console.log('💬 Assistant Response:', assistantContent.substring(0, 300) + (assistantContent.length > 300 ? '...' : ''));
        
        // Check if response references context data
        const hasNumbers = /\d+/.test(assistantContent);
        const hasContextualData = 
          (finalEmployeeSlug === 'prime-boss' && (
            assistantContent.includes('uncategorized') || 
            assistantContent.includes('spent') || 
            assistantContent.includes('category') ||
            /\$\d+/.test(assistantContent)
          )) ||
          (finalEmployeeSlug === 'byte-docs' && (
            assistantContent.includes('document') || 
            assistantContent.includes('upload') ||
            assistantContent.includes('processed')
          )) ||
          (finalEmployeeSlug === 'tag-ai' && (
            assistantContent.includes('uncategorized') || 
            assistantContent.includes('categor') || 
            /\d+.*transaction/i.test(assistantContent)
          )) ||
          (finalEmployeeSlug === 'crystal-analytics' && (
            assistantContent.includes('spent') || 
            assistantContent.includes('category') || 
            assistantContent.includes('budget') ||
            /\$\d+/.test(assistantContent)
          ));
        
        console.log('🧠 Intelligence Check:', {
          hasNumbers: hasNumbers,
          referencesContextData: hasContextualData,
          seemsIntelligent: hasNumbers && hasContextualData,
          toolCallsUsed: toolCalls.length > 0,
        });
        
        // Log tool calls if any
        if (toolCalls.length > 0) {
          console.log('🔧 Tool Calls:', toolCalls.map(tc => ({
            name: tc.function?.name,
            args: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
          })));
        }
        
        console.groupEnd();
      }

      // Calculate token usage (rough estimate)
      // Join all system message contents for token estimation
      const systemMessageContent = systemMessages.map((m: any) => m.content).join('\n\n') || '';
      const promptTokens = estimateTokens(systemMessageContent + masked + recentMessages.map((m: any) => m.content).join(''));
      const completionTokens = estimateTokens(assistantContent);
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - requestStartTime;
      const latencyMs = firstTokenTime ? firstTokenTime - requestStartTime : null;

      // Save assistant message (will be redacted if needed) - non-blocking
      try {
        const messageData: any = {
          session_id: finalSessionId, // Keep for backward compatibility
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: completionTokens,
          thread_id: threadId, // CRITICAL: thread_id is always required
        };
        console.log(`[Chat] Inserting assistant message with thread_id: ${threadId}`);
        await sb.from('chat_messages').insert(messageData);
        
        // DEV: Verify single persistence (prove no double write)
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Chat] ✅ Assistant Message Persisted (SSE):`, {
            requestId: threadId,
            contentLength: assistantContent.length,
            persisted: true,
          });
        }
        
        // Log AI activity event (non-blocking, uses RLS with auth.uid())
        const authToken = event.headers?.authorization || event.headers?.Authorization || '';
        if (authToken && userId) {
          logAiActivity(authToken.replace('Bearer ', ''), {
            employeeId: finalEmployeeSlug,
            eventType: 'message_received',
            status: 'success',
            label: `Received response from ${finalEmployeeSlug}`,
            details: { 
              response_length: assistantContent.length,
              tokens: completionTokens,
              tools_used: toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).filter(Boolean) : null,
              thread_id: finalSessionId,
            },
          }).catch(err => {
            console.warn('[Chat] Failed to log activity event (non-fatal):', err);
          });
        }
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

      // CRITICAL: Log timing summary before returning
      const totalTime = Date.now() - requestStartTime;
      if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[Chat] ⏱️ Timing summary (ms):', {
          auth: timingLogs.auth || 0,
          session: timingLogs.session || 0,
          memory: timingLogs.memory || 0,
          messages: timingLogs.messages || 0,
          profile: timingLogs.profile || 0,
          openai_ttft: timingLogs.openai_ttft || 0,
          insert_message: timingLogs.insert_message || 0,
          total: totalTime,
          openai_latency: latencyMs,
          openai_duration: durationMs,
        });
      }

      // Phase 2.3: Queue memory extraction for async processing (non-blocking, fire-and-forget)
      // CRITICAL: Do NOT await - this runs after response is returned
      const normalizedSessionIdForExtraction = normalizeSessionId(finalSessionId);
      if (normalizedSessionIdForExtraction) {
        // Fire-and-forget: don't await, don't block response
        queueMemoryExtraction({
          userId,
          sessionId: normalizedSessionIdForExtraction,
          userMessage: masked,
          assistantResponse: assistantContent
        }).catch((error: any) => {
          // Log but don't fail - extraction failures shouldn't break chat
          console.warn('[Chat] Failed to queue memory extraction (non-fatal):', error);
          // Worker will retry failed jobs automatically
        });
      }

      // Custodian: Update conversation summary (non-blocking, fire-and-forget)
      // CRITICAL: Do NOT await - this runs after response is returned
      // In dev mode, optionally skip to reduce latency
      const skipSummaryInDev = process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development';
      if (!skipSummaryInDev) {
        // Fire-and-forget: don't await, don't block response
        (async () => {
          try {
            // Get all messages for this conversation
            const { data: allMessages } = await sb
              .from('chat_messages')
              .select('role, content, created_at')
              .eq('session_id', finalSessionId)
              .order('created_at', { ascending: true });

            if (!allMessages || allMessages.length === 0) {
              return;
            }

            // Get employees involved from session and handoffs
            const employeesInvolved = new Set<string>();
            employeesInvolved.add(finalEmployeeSlug);
            
            // Check for handoffs in this session
            try {
              const { data: handoffs } = await sb
                .from('handoffs')
                .select('from_employee, to_employee')
                .eq('session_id', finalSessionId);
              
              if (handoffs) {
                handoffs.forEach((h: any) => {
                  if (h.from_employee) employeesInvolved.add(h.from_employee);
                  if (h.to_employee) employeesInvolved.add(h.to_employee);
                });
              }
            } catch (e) {
              // Ignore handoff lookup errors
            }

            // Call summary update
            await updateConversationSummaryForCustodian(
              sb,
              userId,
              finalSessionId,
              allMessages.map(m => ({ role: m.role, content: m.content })),
              Array.from(employeesInvolved)
            );
          } catch (error: any) {
            console.warn('[Custodian] Failed to update conversation summary:', error);
          }
        })();
      } else if (process.env.NETLIFY_DEV === 'true') {
        console.log('[Chat] 🚀 DEV MODE: Skipping conversation summary update to reduce latency');
      }

      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          // important for the frontend check in chatEndpoint.ts
          'X-Chat-Backend': 'v2',
        },
        body: streamBuffer,
      };
    } catch (streamingError: any) {
      console.error('[Chat] Streaming OpenAI call failed:', streamingError);
      // Log the full error for debugging
      if (streamingError?.message) {
        console.error('[Chat] Error details:', streamingError.message);
        console.error('[Chat] Error stack:', streamingError.stack);
      }
      // Return HTTP 200 with graceful error message (UI can display this)
      const errorMessage = "Sorry — Prime is restarting. Please try again.";
      // Build guardrails status even on error (so UI can show status)
      const guardrailsStatus = buildGuardrailsStatus('streaming');
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: `data: ${JSON.stringify({ role: 'assistant', content: errorMessage })}\n\ndata: ${JSON.stringify({ type: 'done', thread_id: threadId, error: 'Streaming call failed' })}\n\n`,
      };
    }
    } else {
      // Non-streaming response with tool calling support
      try {
        let openaiTools: any = undefined;
        try {
          openaiTools = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
        } catch (toolError: any) {
          console.warn('[Chat] Failed to convert tools to OpenAI format (non-fatal):', toolError);
        }
        
        // Model config already resolved above - reuse it
        // (No need to resolve again - already available in scope)
        
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

        // DEV: Log non-streaming response
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.group(`✅ [Backend AI Response - Non-Streaming] ${finalEmployeeSlug}`);
          console.log('📥 Response Summary:', {
            model: modelConfig.model,
            responseLength: assistantContent.length,
            toolCallsCount: toolCalls.length,
            usage: completion.usage,
          });
          console.log('💬 Assistant Response:', assistantContent.substring(0, 300) + (assistantContent.length > 300 ? '...' : ''));
          
          // Check intelligence
          const hasNumbers = /\d+/.test(assistantContent);
          const hasContextualData = 
            (finalEmployeeSlug === 'prime-boss' && (assistantContent.includes('uncategorized') || assistantContent.includes('spent'))) ||
            (finalEmployeeSlug === 'tag-ai' && (assistantContent.includes('uncategorized') || /\d+.*transaction/i.test(assistantContent))) ||
            (finalEmployeeSlug === 'crystal-analytics' && (assistantContent.includes('spent') || /\$\d+/.test(assistantContent)));
          
          console.log('🧠 Intelligence Check:', {
            hasNumbers,
            referencesContextData: hasContextualData,
            seemsIntelligent: hasNumbers && hasContextualData,
          });
          console.groupEnd();
        }

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
            
            const result = await executeTool(toolModule, args, toolContext, {
              employeeSlug: finalEmployeeSlug,
              mode: 'propose-confirm', // TODO: Get from user preferences
              autonomyLevel: 1, // TODO: Get from user preferences or tool metadata
            });
            
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
                  // CRITICAL: Ensure we have a valid sessionId before proceeding with handoff
                  if (!finalSessionId) {
                    console.error('[Chat] ❌ HANDOFF FAILED: No valid sessionId available. Cannot proceed with handoff.');
                    // Continue without handoff - don't crash
                    continue;
                  }
                  
                  const targetSlug = handoffData.target_slug;
                  const reason = handoffData.reason || 'Better suited for this question';
                  const summary = handoffData.summary_for_next_employee;
                  
                  console.log(`[Chat] ✅ HANDOFF COMPLETE (non-streaming): ${originalEmployeeSlug} → ${targetSlug}`, {
                    reason,
                    summary: summary?.substring(0, 100),
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
                      thread_id: threadId, // CRITICAL: thread_id is always required
                    });
                    console.log(`[Chat] Inserting system handoff message (non-streaming) with thread_id: ${threadId}`);
                    console.log(`[Chat] Inserting system handoff message (non-streaming) with thread_id: ${threadId}`);
                    
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
          try {
            messages.push(
              { role: 'assistant', content: assistantContent || null, tool_calls: toolCalls },
              ...toolResults
            );

            // If handoff occurred, reload tools for new employee
            let openaiToolsAfterHandoff: any = undefined;
            try {
              openaiToolsAfterHandoff = employeeTools.length > 0 ? toOpenAIToolDefs(employeeTools) : undefined;
            } catch (toolError: any) {
              console.warn('[Chat] Failed to convert tools after handoff (non-fatal):', toolError);
            }

            // Use model config for current employee (may have changed after handoff)
            let modelConfigAfterHandoff;
            try {
              modelConfigAfterHandoff = await getEmployeeModelConfig(finalEmployeeSlug);
            } catch (configError: any) {
              console.warn('[Chat] Failed to get model config after handoff (non-fatal, using defaults):', configError);
              modelConfigAfterHandoff = {
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 2000,
              };
            }

            completion = await openai.chat.completions.create({
              model: modelConfigAfterHandoff.model,
              messages,
              temperature: modelConfigAfterHandoff.temperature,
              max_tokens: modelConfigAfterHandoff.maxTokens,
              stream: false,
              tools: openaiToolsAfterHandoff,
            });

            assistantContent = completion.choices[0]?.message?.content || assistantContent;
          } catch (secondCompletionError: any) {
            console.error('[Chat] Second completion call failed after tool execution:', secondCompletionError);
            // Use original assistant content or add error message
            assistantContent = assistantContent || "I had trouble processing the tool results, but I can still help you with your question.";
          }
        }
      }

      // Calculate token usage (rough estimate)
      // Join all system message contents for token estimation
      const systemMessageContent = systemMessages.map((m: any) => m.content).join('\n\n') || '';
      const promptTokens = estimateTokens(systemMessageContent + masked + recentMessages.map((m: any) => m.content).join(''));
      const completionTokens = estimateTokens(assistantContent);
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - requestStartTime;
      const latencyMs = firstTokenTime ? firstTokenTime - requestStartTime : durationMs;

      // Save assistant message - non-blocking
      try {
        await sb.from('chat_messages').insert({
          session_id: finalSessionId,
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
          tokens: completionTokens,
          thread_id: threadId, // CRITICAL: thread_id is always required
        });
        console.log(`[Chat] Inserting assistant message (non-streaming) with thread_id: ${threadId}`);
        
        // DEV: Verify single persistence (prove no double write)
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Chat] ✅ Assistant Message Persisted (JSON):`, {
            requestId: threadId,
            contentLength: assistantContent.length,
            persisted: true,
          });
        }
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
      const normalizedSessionIdForExtraction2 = normalizeSessionId(finalSessionId);
      if (normalizedSessionIdForExtraction2) {
        queueMemoryExtraction({
          userId,
          sessionId: normalizedSessionIdForExtraction2,
          userMessage: masked,
          assistantResponse: assistantContent
        }).catch((error: any) => {
          // Log but don't fail - extraction failures shouldn't break chat
          console.warn('[Chat] Failed to queue memory extraction (non-fatal):', error);
          // Worker will retry failed jobs automatically
        });
      }

      // Custodian: Update conversation summary (non-blocking)
      // Fetch all messages for this conversation and generate summary
      (async () => {
        try {
          // Get all messages for this conversation
          const { data: allMessages } = await sb
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('session_id', finalSessionId)
            .order('created_at', { ascending: true });

          if (!allMessages || allMessages.length === 0) {
            return;
          }

          // Get employees involved from session and handoffs
          const employeesInvolved = new Set<string>();
          employeesInvolved.add(finalEmployeeSlug);
          
          // Check for handoffs in this session
          try {
            const { data: handoffs } = await sb
              .from('handoffs')
              .select('from_employee, to_employee')
              .eq('session_id', finalSessionId);
            
            if (handoffs) {
              handoffs.forEach((h: any) => {
                if (h.from_employee) employeesInvolved.add(h.from_employee);
                if (h.to_employee) employeesInvolved.add(h.to_employee);
              });
            }
          } catch (e) {
            // Ignore handoff lookup errors
          }

          // Call summary update
          await updateConversationSummaryForCustodian(
            sb,
            userId,
            finalSessionId,
            allMessages.map(m => ({ role: m.role, content: m.content })),
            Array.from(employeesInvolved)
          );
        } catch (error: any) {
          console.warn('[Custodian] Failed to update conversation summary:', error);
        }
      })();

      // Build headers (may have been updated during handoff)
      const headers = buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: (guardrailResult.signals.piiTypes || []).length > 0,
        memoryHitTopScore: memoryHitScore,
        memoryHitCount: memoryFacts.length,
        employee: finalEmployeeSlug,
        routeConfidence: 0.8,
        sessionId: finalSessionId || undefined, // Include sessionId in headers for frontend
      });

      // Check if handoff occurred
      const handoffMeta = finalEmployeeSlug !== originalEmployeeSlug 
        ? { from: originalEmployeeSlug, to: finalEmployeeSlug }
        : undefined;

        // Include guardrails status in non-streaming response (using buildGuardrailsStatus)
        const guardrailsStatusNonStream = buildGuardrailsStatus('json');
        
        // Dev-only verification log
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.log(`[Guardrails] enabled=${guardrailsStatusNonStream.enabled} pii_masking=${guardrailsStatusNonStream.pii_masking} moderation=${guardrailsStatusNonStream.moderation} version=${guardrailsStatusNonStream.policy_version}`);
        }

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
            thread_id: threadId, // CRITICAL: Return thread_id for frontend to store
            guardrails: guardrailsStatusNonStream,
            ...(handoffMeta && { meta: { handoff: handoffMeta } }),
          }),
        };
      } catch (nonStreamingError: any) {
        console.error('[Chat] Non-streaming OpenAI call failed:', nonStreamingError);
        // Return graceful error in JSON format
        const headers = buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: (guardrailResult?.signals?.piiTypes || []).length > 0,
          employee: finalEmployeeSlug || 'prime-boss',
        });
        return {
          statusCode: 200,
          headers: {
            ...baseHeaders,
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ok: false,
            error: 'OpenAI API error',
            content: "I'm sorry, I encountered an error while generating my response. Please try again in a moment.",
            employee: finalEmployeeSlug || 'prime-boss',
            sessionId: finalSessionId,
            thread_id: threadId, // CRITICAL: Return thread_id even on error
            message: process.env.NETLIFY_DEV === 'true' ? nonStreamingError.message : undefined,
          }),
        };
      }
    }
  } catch (error: any) {
    console.error('[Chat] Unhandled error in handler', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack,
      userId: (event.body ? JSON.parse(event.body || '{}') : {}).userId,
    });
    
    // Determine if this was a streaming request
    let isStreaming = true;
    try {
      const body = event.body ? JSON.parse(event.body || '{}') as ChatRequest : {};
      isStreaming = body.stream !== false;
    } catch (parseError) {
      // Default to streaming if we can't parse
      isStreaming = true;
    }
    
    // For streaming requests, send error as SSE message
    if (isStreaming) {
      const errorMessage = "Sorry — Prime is restarting. Please try again.";
      const errorSSE = `data: ${JSON.stringify({
        role: 'assistant',
        content: errorMessage
      })}\n\ndata: ${JSON.stringify({ type: 'done', error: 'chat_internal_error' })}\n\n`;
      
      return {
        statusCode: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Chat-Backend': 'v2',
        },
        body: errorSSE,
      };
    }
    
    // Non-streaming: return HTTP 200 with graceful error message (UI can display this)
    const errorMessage = "Sorry — Prime is restarting. Please try again.";
    return {
      statusCode: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: 'chat_internal_error',
        content: errorMessage,
        assistant: {
          role: 'assistant',
          content: errorMessage,
        },
        details: process.env.NETLIFY_DEV === 'true' ? error?.message : undefined,
      }),
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize employee slug (handle aliases from UI)
 * Converts short names to canonical slugs, but preserves canonical slugs as-is
 * 
 * This is a lightweight normalization for UI aliases only.
 * The router's resolveSlug() handles full canonicalization including database lookups.
 */
function normalizeEmployeeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null; // Return null to let router auto-route
  
  const normalized = slug.toLowerCase().trim();
  
  // Only normalize known UI aliases
  switch (normalized) {
    case 'prime':
      return 'prime-boss';
    case 'byte':
      return 'byte-docs';
    case 'tag':
      return 'tag-ai';
    case 'crystal':
      return 'crystal-analytics';
    case 'finley':
      return 'finley-forecasts';
    case 'goalie':
      return 'goalie-goals';
    case 'blitz':
      return 'blitz-debt';
    case 'liberty':
      return 'liberty-freedom';
    case 'chime':
      return 'chime-reminders';
    case 'ledger':
      return 'ledger-tax';
    default:
      // Return as-is if already canonical (router will handle further normalization)
      // This preserves slugs like 'prime-boss', 'byte-docs', 'tag-ai', etc.
      return normalized;
  }
}

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

