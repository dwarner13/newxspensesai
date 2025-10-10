/**
 * Centralized Chat Runtime - Context Builder
 * ===========================================
 * Assembles context from multiple sources for OpenAI
 * 
 * @module chat_runtime/contextBuilder
 */

import { OpenAI } from 'openai';
import { MemoryManager } from './memory';
import { redact } from './redaction';
import type {
  BuildContextInput,
  ContextResult,
  OpenAIMessage,
  EmployeeProfile,
} from './types';

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============================================================================
// Context Builder
// ============================================================================

export async function buildContext(
  input: BuildContextInput
): Promise<ContextResult> {
  const {
    userId,
    employeeSlug,
    sessionId,
    userInput,
    topK = 5,
    tokenBudget = 6000,
    includeRAG = true,
    includeSummary = true,
    includeFacts = true,
    recentMessageLimit = 10,
  } = input;
  
  const memory = new MemoryManager(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const messages: OpenAIMessage[] = [];
  let tokensUsed = 0;
  
  // ==========================================================================
  // 1. Get Employee Profile
  // ==========================================================================
  
  const { data: employee, error: employeeError } = await memory.supabase
    .from('employee_profiles')
    .select('*')
    .eq('slug', employeeSlug)
    .single();
  
  if (employeeError || !employee) {
    throw new Error(`Employee not found: ${employeeSlug}`);
  }
  
  const employeeProfile = employee as EmployeeProfile;
  
  // ==========================================================================
  // 2. Base System Prompt
  // ==========================================================================
  
  const baseSystemPrompt = `You are an AI assistant in the XspensesAI financial management platform.

Core Rules:
- Be helpful, accurate, and concise
- Respect user privacy and handle financial data carefully
- If you don't know something, say so
- Cite sources when using retrieved information
- Use tools when appropriate (you have: ${employeeProfile.tools_allowed.join(', ')})

Current date: ${new Date().toISOString().split('T')[0]}`;
  
  messages.push({
    role: 'system',
    content: baseSystemPrompt,
  });
  tokensUsed += estimateTokens(baseSystemPrompt);
  
  // ==========================================================================
  // 3. Employee Personality Prompt
  // ==========================================================================
  
  messages.push({
    role: 'system',
    content: employeeProfile.system_prompt,
  });
  tokensUsed += estimateTokens(employeeProfile.system_prompt);
  
  // ==========================================================================
  // 4. Pinned Facts
  // ==========================================================================
  
  let pinnedFacts: any[] = [];
  
  if (includeFacts) {
    pinnedFacts = await memory.getPinnedFacts(userId, employeeSlug);
    
    if (pinnedFacts.length > 0) {
      const factsText = `Key facts about the user:\n${pinnedFacts
        .map((f, i) => `${i + 1}. ${f.fact}`)
        .join('\n')}`;
      
      messages.push({
        role: 'system',
        content: factsText,
      });
      tokensUsed += estimateTokens(factsText);
    }
  }
  
  // ==========================================================================
  // 5. Session Summary
  // ==========================================================================
  
  let summary = null;
  
  if (includeSummary) {
    summary = await memory.getSummary(sessionId);
    
    if (summary) {
      const summaryText = `Previous conversation summary:\n${summary.summary}`;
      
      messages.push({
        role: 'system',
        content: summaryText,
      });
      tokensUsed += estimateTokens(summaryText);
    }
  }
  
  // ==========================================================================
  // 6. RAG Retrieval
  // ==========================================================================
  
  let retrievedChunks: any[] = [];
  
  if (includeRAG && topK > 0) {
    try {
      // Generate embedding for user input
      const embeddingResponse = await openai.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: userInput,
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      
      // Search memory embeddings
      retrievedChunks = await memory.searchEmbeddings(userId, queryEmbedding, {
        topK,
        minSimilarity: 0.7,
      });
      
      if (retrievedChunks.length > 0) {
        const ragText = `Relevant information:\n${retrievedChunks
          .map((chunk, i) => `[${i + 1}] ${chunk.chunk}`)
          .join('\n\n')}`;
        
        messages.push({
          role: 'system',
          content: ragText,
        });
        tokensUsed += estimateTokens(ragText);
      }
    } catch (error) {
      console.error('RAG retrieval failed:', error);
      // Continue without RAG
    }
  }
  
  // ==========================================================================
  // 7. Recent Messages
  // ==========================================================================
  
  const recentMessages = await memory.getRecentMessages(
    sessionId,
    recentMessageLimit
  );
  
  for (const msg of recentMessages) {
    const content = msg.redacted_content || msg.content;
    messages.push({
      role: msg.role as any,
      content,
    });
    tokensUsed += msg.tokens || estimateTokens(content);
  }
  
  // ==========================================================================
  // 8. Current User Message
  // ==========================================================================
  
  // Redact PII before adding
  const { redacted: redactedInput } = redact(userInput);
  
  messages.push({
    role: 'user',
    content: redactedInput,
  });
  tokensUsed += estimateTokens(redactedInput);
  
  // ==========================================================================
  // 9. Token Budget Check
  // ==========================================================================
  
  if (tokensUsed > tokenBudget) {
    console.warn(`Context exceeds budget: ${tokensUsed}/${tokenBudget}`);
    // TODO: Trim context intelligently
  }
  
  // ==========================================================================
  // Return Result
  // ==========================================================================
  
  return {
    messages,
    tokensUsed,
    sources: {
      employee: employeeProfile,
      pinnedFacts,
      summary: summary || undefined,
      retrievedChunks,
      recentMessages,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Exports
// ============================================================================

export default buildContext;

