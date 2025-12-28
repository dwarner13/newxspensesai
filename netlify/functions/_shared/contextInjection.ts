/**
 * Backend Context Injection System
 * =================================
 * Ensures every AI employee automatically understands the user's fluency level
 * and preferences before processing any request.
 * 
 * This is injected into system messages for:
 * - Chat responses
 * - OCR explanations
 * - Categorization explanations
 * - Financial insights
 * - Planning or forecasting responses
 * 
 * NOTE: This file re-exports from src/lib/ai for backward compatibility.
 * New code should import directly from src/lib/ai/userContext and src/lib/ai/systemPrompts
 */

// Re-export from shared location
export { 
  fetchAiUserContext, 
  buildAiContextSystemMessage, 
  buildSystemMessages,
  type AiUserContext, 
  type AiFluencyLevel 
} from '../../../src/lib/ai/userContext.js';
export { AI_FLUENCY_GLOBAL_SYSTEM_RULE, PRIME_ORCHESTRATION_RULE } from '../../../src/lib/ai/systemPrompts.js';

export interface ContextInjectionResult {
  /** Structured context data (for programmatic use) */
  contextData: AiUserContext;
  /** Formatted system message block (ready to inject) */
  systemMessageBlock: string;
  /** User profile object (full profile data) */
  userProfile: any;
}

/**
 * Fetch user profile and build context injection (backward compatibility wrapper)
 * 
 * @param sb - Supabase client (optional, will use service client if not provided)
 * @param userId - User ID
 * @param employeeSlug - Employee slug (optional, used to determine if Prime)
 * @returns Context injection data ready to inject into system messages
 */
export async function buildContextInjection(
  sb?: any,
  userId?: string,
  employeeSlug?: string
): Promise<ContextInjectionResult | null> {
  if (!userId) {
    return null;
  }

  try {
    // Fetch AI user context
    const contextData = await fetchAiUserContext(userId);

    // Determine if this is Prime
    const isPrime = employeeSlug === 'prime-boss' || employeeSlug === 'prime';

    // Build system message block (for backward compatibility - combines all into one string)
    const systemMessages = buildSystemMessages(contextData, employeeSlug);
    const systemMessageBlock = systemMessages.map(m => m.content).join('\n\n---\n\n');

    return {
      contextData,
      systemMessageBlock,
      userProfile: null, // Not needed for new implementation
    };
  } catch (error: any) {
    console.error('[ContextInjection] Failed to build context injection:', error);
    // Return default context
    const defaultContext: AiUserContext = {
      user_id: userId,
      ai_fluency_score: 20,
      ai_fluency_level: "Explorer",
      currency: "CAD",
      timezone: "America/Edmonton",
      memory_enabled: true,
    };
    const systemMessages = buildSystemMessages(defaultContext, employeeSlug);
    const systemMessageBlock = systemMessages.map(m => m.content).join('\n\n---\n\n');
    return {
      contextData: defaultContext,
      systemMessageBlock,
      userProfile: null,
    };
  }
}

/**
 * Inject context into system messages array
 * 
 * @param messages - Array of OpenAI chat messages
 * @param contextBlock - Context injection system message block
 * @returns Updated messages array with context injected
 */
export function injectContextIntoMessages(
  messages: Array<{ role: string; content: string }>,
  contextBlock: string
): Array<{ role: string; content: string }> {
  // Find first system message or insert at beginning
  const systemMessageIndex = messages.findIndex(m => m.role === 'system');
  
  if (systemMessageIndex >= 0) {
    // Prepend context to existing system message
    const existingSystem = messages[systemMessageIndex];
    messages[systemMessageIndex] = {
      role: 'system',
      content: `${contextBlock}\n\n---\n\n${existingSystem.content}`,
    };
  } else {
    // Insert context as first system message
    messages.unshift({
      role: 'system',
      content: contextBlock,
    });
  }
  
  return messages;
}

/**
 * Get context data only (lightweight, for programmatic use)
 */
export async function getContextData(userId: string): Promise<AiUserContext> {
  return await fetchAiUserContext(userId);
}
