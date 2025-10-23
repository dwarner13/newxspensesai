/**
 * 🎭 Memory Orchestrator
 * 
 * Single entry point for memory operations:
 * 1. Extract memories from user message (async, non-blocking)
 * 2. Retrieve context for current turn (synchronous)
 * 
 * Simple API for use in chat handlers.
 */

import { extractAndSaveMemories } from './memory-extraction';
import { retrieveContext } from './context-retrieval';

/**
 * Run complete memory pipeline:
 * - Extract and save memories (background)
 * - Retrieve context for current turn
 * 
 * @param params - Orchestration parameters
 * @returns Context block for system prompt
 */
export async function runMemoryOrchestration(params: {
  userId: string;
  sessionId: string;
  redactedUserText: string;
  maxFacts?: number;
  topK?: number;
  extractInBackground?: boolean;  // Default: false (blocking)
}) {
  const {
    userId,
    sessionId,
    redactedUserText,
    maxFacts = 12,
    topK = 6,
    extractInBackground = false
  } = params;

  // ========================================================================
  // PHASE 1: EXTRACTION (Optional Background)
  // ========================================================================
  
  if (extractInBackground) {
    // Fire-and-forget extraction (don't block response)
    extractAndSaveMemories({
      userId,
      sessionId,
      redactedUserText
    }).catch(err => {
      console.warn('[Memory Orchestrator] Background extraction failed:', err);
    });
  } else {
    // Blocking extraction (wait for completion)
    try {
      await extractAndSaveMemories({
        userId,
        sessionId,
        redactedUserText
      });
    } catch (err) {
      console.warn('[Memory Orchestrator] Extraction failed (non-fatal):', err);
      // Continue even if extraction fails
    }
  }

  // ========================================================================
  // PHASE 2: RETRIEVAL (Always Blocking)
  // ========================================================================
  
  const { context, facts, memories, tasks } = await retrieveContext({
    userId,
    sessionId,
    userQuery: redactedUserText,
    maxFacts,
    topK
  });

  return {
    contextBlock: context,
    details: {
      factsCount: facts.length,
      memoriesCount: memories.length,
      tasksCount: tasks.length
    }
  };
}

/**
 * Simplified version: Just retrieve context (no extraction)
 * Useful when you want to control extraction separately
 */
export async function getMemoryContext(params: {
  userId: string;
  sessionId: string;
  userQuery: string;
  maxFacts?: number;
  topK?: number;
}) {
  const { userId, sessionId, userQuery, maxFacts = 12, topK = 6 } = params;

  const { context } = await retrieveContext({
    userId,
    sessionId,
    userQuery,
    maxFacts,
    topK
  });

  return { contextBlock: context };
}

/**
 * Post-response extraction: Extract memories after assistant responds
 * Use this when you want to include assistant context in extraction
 */
export async function extractMemoriesPostResponse(params: {
  userId: string;
  sessionId: string;
  redactedUserText: string;
  assistantResponse: string;
}) {
  return await extractAndSaveMemories({
    userId: params.userId,
    sessionId: params.sessionId,
    redactedUserText: params.redactedUserText,
    assistantResponse: params.assistantResponse
  });
}








