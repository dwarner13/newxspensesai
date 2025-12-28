/**
 * 🛡️ Unified Guardrails Interface - SINGLE SOURCE OF TRUTH
 * 
 * Phase 2.2: Consolidated November 20, 2025
 * 
 * This is the CANONICAL guardrails API for the entire XspensesAI system.
 * All code should use this module instead of guardrails-production.ts directly.
 * 
 * Single entry point for all AI employees (Prime, Tag, Byte, Crystal, Finley, Goalie, Liberty, Blitz, etc.)
 * 
 * This module wraps the existing guardrails-production.ts system to provide:
 * - Messages array support (not just single strings)
 * - Attachment metadata support
 * - Employee-agnostic protection
 * - Centralized logging
 * - Config caching (performance optimization)
 * 
 * SECURITY GUARANTEES:
 * - All input is checked BEFORE routing/model calls
 * - PII masking happens FIRST (before any API calls)
 * - All employees share the same protection layer
 * - Uploads and tool calls are also protected
 * 
 * MIGRATION GUIDE:
 * - Replace `import { getGuardrailConfig, runGuardrails } from './guardrails-production'`
 *   with `import { getGuardrailConfig, runGuardrailsForText, runInputGuardrails } from './guardrails-unified'`
 * - For single strings: Use `runGuardrailsForText()`
 * - For message arrays: Use `runInputGuardrails()`
 */

import { getGuardrailConfig as getGuardrailConfigCore, runGuardrails, type GuardrailConfig, type Outcome } from './guardrails-production.js';

// ============================================================================
// CONFIG CACHING
// ============================================================================

interface CachedConfig {
  config: GuardrailConfig;
  timestamp: number;
}

const configCache = new Map<string, CachedConfig>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get guardrail config with caching
 * 
 * @param userId User ID
 * @param tenantId Optional tenant ID
 * @returns GuardrailConfig (cached for 5 minutes)
 */
export async function getGuardrailConfig(
  userId: string,
  tenantId?: string
): Promise<GuardrailConfig> {
  const cacheKey = `${userId}:${tenantId || 'default'}`;
  const now = Date.now();
  
  // Check cache
  const cached = configCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.config;
  }
  
  // Load from database
  const config = await getGuardrailConfigCore(userId, tenantId);
  
  // Update cache
  configCache.set(cacheKey, {
    config,
    timestamp: now,
  });
  
  return config;
}

/**
 * Invalidate config cache for a user
 * Call this when guardrail settings are updated
 */
export function invalidateGuardrailConfigCache(userId: string, tenantId?: string): void {
  const cacheKey = `${userId}:${tenantId || 'default'}`;
  configCache.delete(cacheKey);
}

// ============================================================================
// TYPES
// ============================================================================

export interface GuardrailContext {
  userId: string;
  sessionId?: string;
  employeeSlug?: string;   // prime-boss, liberty-ai, tag-ai, etc.
  source?: 'chat' | 'upload' | 'tool';
}

export interface GuardrailInput {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  attachments?: Array<{
    id: string;
    type: 'pdf' | 'image' | 'csv' | 'statement' | 'other';
    fileName?: string;
  }>;
}

export interface GuardrailEvent {
  type: 'pii_masked' | 'moderation_flag' | 'blocked' | 'info';
  detail: string;
  metadata?: Record<string, any>;
}

export interface GuardrailResult {
  ok: boolean;
  blockedReason?: string;      // e.g. 'unsafe_content', 'policy_violation'
  maskedMessages: GuardrailInput['messages'];
  events: GuardrailEvent[];
  signals?: {
    pii?: boolean;
    piiTypes?: string[];
    moderation?: any;
    jailbreak?: { verdict: 'yes' | 'no'; score?: number };
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Run input guardrails on messages array + attachments
 * 
 * This is the single entry point for all guardrail checks across:
 * - Normal chat messages (all employees)
 * - Uploaded document text
 * - Tool call inputs
 * 
 * @param ctx Context (userId, sessionId, employeeSlug, source)
 * @param input Messages array + optional attachments
 * @returns GuardrailResult with ok flag, masked messages, and events
 */
export async function runInputGuardrails(
  ctx: GuardrailContext,
  input: GuardrailInput
): Promise<GuardrailResult> {
  const { userId, sessionId, employeeSlug, source = 'chat' } = ctx;
  const { messages, attachments } = input;
  
  const events: GuardrailEvent[] = [];
  const maskedMessages: GuardrailInput['messages'] = [];
  
  // Load guardrail configuration
  let guardrailConfig: GuardrailConfig;
  try {
    guardrailConfig = await getGuardrailConfig(userId);
  } catch (error: any) {
    console.error('[Guardrails] Failed to load config:', error);
    // Use default balanced config if loading fails
    guardrailConfig = {
      preset: 'balanced',
      jailbreakThreshold: 75,
      moderationBlock: false,
      piiEntities: [],
      ingestion: { pii: true, moderation: true },
      chat: { pii: true, moderation: false, jailbreak: false },
    };
    events.push({
      type: 'info',
      detail: 'Using default guardrail config (config load failed)',
    });
  }
  
  // Determine stage based on source
  const stage: 'ingestion_email' | 'ingestion_ocr' | 'chat' = 
    source === 'upload' ? 'ingestion_ocr' : 'chat';
  
  // Process each message through guardrails
  for (const msg of messages) {
    // Only check user messages (assistant/system messages are already sanitized)
    if (msg.role === 'user') {
      const result = await runGuardrails(msg.content, userId, stage, guardrailConfig);
      
      if (!result.ok) {
        // Message was blocked
        events.push({
          type: 'blocked',
          detail: `Message blocked: ${result.reasons.join(', ')}`,
          metadata: {
            reasons: result.reasons,
            blockMessage: result.block_message,
            employeeSlug,
            source,
          },
        });
        
        // Log to console
        console.warn(`[Guardrails] Message blocked for user ${userId}`, {
          employeeSlug,
          source,
          reasons: result.reasons,
          sessionId,
        });
        
        // TODO: Write guardrail events to guardrail_events table
        // await logGuardrailEventToDB(userId, sessionId, employeeSlug, 'blocked', result);
        
        return {
          ok: false,
          blockedReason: result.reasons.join(', '),
          maskedMessages: [], // Don't return blocked messages
          events,
          signals: result.signals,
        };
      }
      
      // Message passed - use masked text
      maskedMessages.push({
        role: msg.role,
        content: result.text, // This is the masked/redacted version
      });
      
      // Log PII detection if found
      if (result.signals.pii && result.signals.piiTypes) {
        events.push({
          type: 'pii_masked',
          detail: `PII detected and masked: ${result.signals.piiTypes.join(', ')}`,
          metadata: {
            piiTypes: result.signals.piiTypes,
            employeeSlug,
            source,
          },
        });
      }
      
      // Log moderation flags (if not blocked)
      if (result.signals.moderation) {
        events.push({
          type: 'moderation_flag',
          detail: 'Content moderation check performed',
          metadata: {
            moderation: result.signals.moderation,
            employeeSlug,
            source,
          },
        });
      }
    } else {
      // Assistant/system messages pass through unchanged (they're already sanitized)
      maskedMessages.push(msg);
    }
  }
  
  // Process attachment metadata (if any)
  if (attachments && attachments.length > 0) {
    events.push({
      type: 'info',
      detail: `Processing ${attachments.length} attachment(s)`,
      metadata: {
        attachmentTypes: attachments.map(a => a.type),
        employeeSlug,
        source,
      },
    });
    
    // TODO: Add attachment-specific guardrails if needed
    // For now, attachments are metadata-only (actual content is processed separately)
  }
  
  // Log successful guardrail pass
  if (events.length > 0) {
    console.log(`[Guardrails] Guardrails passed for user ${userId}`, {
      employeeSlug,
      source,
      eventsCount: events.length,
      sessionId,
    });
  }
  
  return {
    ok: true,
    maskedMessages,
    events,
    signals: {
      pii: events.some(e => e.type === 'pii_masked'),
      piiTypes: events
        .filter(e => e.type === 'pii_masked')
        .flatMap(e => e.metadata?.piiTypes || []),
    },
  };
}

// ============================================================================
// HELPER: Send blocked response
// ============================================================================

/**
 * Generate a safe, user-friendly blocked response
 * 
 * @param blockedReason Reason for blocking
 * @param events Guardrail events
 * @returns Safe response object
 */
export function sendBlockedResponse(
  blockedReason: string,
  events: GuardrailEvent[]
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  // Determine user-friendly message based on reason
  let userMessage = "I'm sorry — I can't help with that request.";
  
  if (blockedReason.includes('moderation')) {
    userMessage = "I can't assist with that type of content. Please rephrase your question.";
  } else if (blockedReason.includes('jailbreak')) {
    userMessage = "I can't process that request. Please ask your question in a different way.";
  } else if (blockedReason.includes('policy')) {
    userMessage = "That request doesn't align with our safety policies. Please try again.";
  }
  
  return {
    statusCode: 200, // Return 200 so client doesn't treat it as an error
    headers: {
      'Content-Type': 'application/json',
      'X-Guardrails': 'active',
      'X-Guardrails-Blocked': 'true',
    },
    body: JSON.stringify({
      ok: false,
      blocked: true,
      text: userMessage,
      reasons: [blockedReason],
      events: events.map(e => ({
        type: e.type,
        detail: e.detail,
      })),
    }),
  };
}

// ============================================================================
// HELPER: Single String Guardrails (for ingestion functions)
// ============================================================================

/**
 * Run guardrails on a single text string
 * 
 * Convenience function for ingestion functions that process single strings.
 * This wraps the production guardrails API with unified config caching.
 * 
 * @param text Input text to check
 * @param userId User ID
 * @param stage Stage: 'chat', 'ingestion_email', or 'ingestion_ocr'
 * @param config Optional config (will load if not provided)
 * @returns Outcome with ok flag and masked text
 */
export async function runGuardrailsForText(
  text: string,
  userId: string,
  stage: 'chat' | 'ingestion_email' | 'ingestion_ocr',
  config?: GuardrailConfig
): Promise<Outcome> {
  // Load config if not provided
  const guardrailConfig = config || await getGuardrailConfig(userId);
  
  // Run guardrails
  return await runGuardrails(text, userId, stage, guardrailConfig);
}

// ============================================================================
// RE-EXPORTS (for backward compatibility)
// ============================================================================

// Re-export types from production
export type { GuardrailConfig, Outcome } from './guardrails-production.js';

// ============================================================================
// TODO: Future Enhancements
// ============================================================================

/**
 * TODO: Write guardrail events to guardrail_events table
 * 
 * async function logGuardrailEventToDB(
 *   userId: string,
 *   sessionId: string | undefined,
 *   employeeSlug: string | undefined,
 *   action: string,
 *   result: Outcome
 * ): Promise<void> {
 *   // Insert into guardrail_events table
 *   // Include: userId, sessionId, employeeSlug, action, reasons, timestamp
 * }
 */

/**
 * TODO: Plug into advanced PII detector
 * 
 * - Consider adding ML-based PII detection for edge cases
 * - Add support for custom PII patterns per tenant
 * - Implement PII detection for attachments (PDFs, images)
 */

/**
 * TODO: Add per-employee guardrail overrides if needed later
 * 
 * - Some employees might need stricter/looser guardrails
 * - Could be configured in employee_profiles table
 * - For now, all employees use the same guardrail config
 */

