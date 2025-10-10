/**
 * Centralized Chat Runtime - Type Definitions
 * ============================================
 * Shared types for the unified AI chat system
 * 
 * @module chat_runtime/types
 */

// ============================================================================
// Core Types
// ============================================================================

export type Role = 'user' | 'assistant' | 'system';

export type AuthScope = 'service' | 'user' | 'admin' | 'none';

export type MemoryScope = 
  | 'global'                // Applies to all conversations
  | 'receipt'              // Receipt-related memory
  | 'bank-statement'       // Bank statement memory
  | 'goal'                 // Goal-related memory
  | 'fact'                 // General facts
  | 'conversation'         // Conversation-specific
  | string;                // Employee slug or custom scope

// ============================================================================
// Employee & Tools
// ============================================================================

export interface EmployeeProfile {
  slug: string;
  title: string;
  emoji?: string;
  system_prompt: string;
  capabilities: string[];
  tools_allowed: string[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ToolDescriptor {
  name: string;
  purpose: string;
  description?: string;
  handler_path: string;
  auth_scope: AuthScope;
  parameters_schema?: Record<string, any>;
  is_active?: boolean;
  created_at?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// ============================================================================
// Chat Sessions & Messages
// ============================================================================

export interface ChatSession {
  id: string;
  user_id: string;
  employee_slug: string;
  title?: string | null;
  context?: Record<string, any>;
  message_count?: number;
  token_count?: number;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id?: string;
  session_id: string;
  user_id: string;
  role: Role;
  content: string;
  redacted_content?: string | null;
  tokens?: number | null;
  metadata?: MessageMetadata;
  created_at?: string;
}

export interface MessageMetadata {
  tool_calls?: ToolCall[];
  citations?: Citation[];
  feedback?: {
    type: 'like' | 'dislike' | 'helpful' | 'not_helpful';
    comment?: string;
  };
  error?: string;
  latency_ms?: number;
  [key: string]: any;
}

export interface Citation {
  source: string;
  title?: string;
  url?: string;
  snippet?: string;
  confidence?: number;
}

// ============================================================================
// Memory & Summaries
// ============================================================================

export interface ChatSessionSummary {
  session_id: string;
  summary: string;
  key_facts?: string[];
  last_summarized_message_id?: string | null;
  token_count?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserMemoryFact {
  id?: string;
  user_id: string;
  scope: string;
  fact: string;
  confidence?: number;
  source?: string | null;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryEmbedding {
  id?: string;
  user_id: string;
  owner_scope: MemoryScope;
  source_id?: string | null;
  chunk: string;
  embedding: number[];
  metadata?: Record<string, any>;
  token_count?: number | null;
  created_at?: string;
}

// ============================================================================
// RAG & Retrieval
// ============================================================================

export interface RetrievedChunk {
  id?: string;
  owner_scope: MemoryScope;
  source_id?: string | null;
  chunk: string;
  similarity?: number;
  metadata?: Record<string, any>;
}

export interface RetrievalOptions {
  topK?: number;              // Default: 5
  minSimilarity?: number;     // Default: 0.7
  ownerScope?: MemoryScope | MemoryScope[];
  includeMetadata?: boolean;  // Default: true
}

// ============================================================================
// Context Building
// ============================================================================

export interface BuildContextInput {
  userId: string;
  employeeSlug: string;
  sessionId: string;
  userInput: string;
  topK?: number;              // RAG results, default: 5
  tokenBudget?: number;       // Total tokens allowed, default: 6000
  includeRAG?: boolean;       // Default: true
  includeSummary?: boolean;   // Default: true
  includeFacts?: boolean;     // Default: true
  recentMessageLimit?: number; // Default: 10
}

export interface ContextResult {
  messages: OpenAIMessage[];
  tokensUsed: number;
  sources: {
    employee: EmployeeProfile;
    pinnedFacts: UserMemoryFact[];
    summary?: ChatSessionSummary;
    retrievedChunks: RetrievedChunk[];
    recentMessages: ChatMessage[];
  };
}

// ============================================================================
// OpenAI Integration
// ============================================================================

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}

export interface OpenAIStreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  tool_call?: ToolCall;
  error?: string;
  metadata?: Record<string, any>;
}

export interface OpenAIChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  user?: string;  // User ID for OpenAI tracking
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// ============================================================================
// Streaming
// ============================================================================

export interface StreamEvent {
  type: 'start' | 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data?: any;
  message?: string;
  timestamp?: string;
}

export type StreamCallback = (event: StreamEvent) => void | Promise<void>;

// ============================================================================
// Redaction
// ============================================================================

export interface RedactionResult {
  redacted: string;
  tokens: Map<string, string>;
  matches: {
    type: string;
    original: string;
    replacement: string;
    start: number;
    end: number;
  }[];
}

export interface RedactionOptions {
  patterns?: string[];  // Which patterns to apply
  preserveFormat?: boolean;  // Keep {{TOKEN}} format or use generic [REDACTED]
  logMatches?: boolean;  // Log what was redacted (for debugging)
}

// ============================================================================
// Summarization
// ============================================================================

export interface SummarizationInput {
  messages: ChatMessage[];
  maxTokens?: number;  // Max tokens for summary
  includeKeyFacts?: boolean;  // Extract key facts
  style?: 'concise' | 'detailed' | 'bullet-points';
}

export interface SummarizationResult {
  summary: string;
  key_facts: string[];
  token_count: number;
  messages_summarized: number;
}

// ============================================================================
// Usage Tracking
// ============================================================================

export interface UsageLog {
  id?: string;
  user_id: string;
  session_id?: string | null;
  employee_slug?: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
  latency_ms?: number | null;
  duration_ms?: number | null;
  tools_used?: string[];
  success?: boolean;
  error_message?: string | null;
  created_at?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ChatRequest {
  session_id?: string;        // Optional: create new if not provided
  employee_slug?: string;     // Optional: defaults to 'prime-boss'
  message: string;
  stream?: boolean;           // Default: true
  include_rag?: boolean;      // Default: true
  context?: Record<string, any>;  // Additional context
}

export interface ChatResponse {
  session_id: string;
  message_id: string;
  content: string;
  employee: {
    slug: string;
    title: string;
    emoji?: string;
  };
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency_ms: number;
  metadata?: MessageMetadata;
}

export interface ChatStreamResponse {
  session_id: string;
  stream: ReadableStream<Uint8Array>;
}

// ============================================================================
// Error Types
// ============================================================================

export class ChatRuntimeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ChatRuntimeError';
  }
}

export class AuthorizationError extends ChatRuntimeError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends ChatRuntimeError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ChatRuntimeError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// ============================================================================
// Configuration
// ============================================================================

export interface ChatRuntimeConfig {
  // Supabase
  supabaseUrl: string;
  supabaseServiceKey: string;
  
  // OpenAI
  openaiApiKey: string;
  openaiModel?: string;
  openaiEmbeddingModel?: string;
  
  // Defaults
  defaultEmployeeSlug?: string;
  defaultTokenBudget?: number;
  defaultTopK?: number;
  defaultTemperature?: number;
  
  // Features
  enableRAG?: boolean;
  enableSummarization?: boolean;
  enableRedaction?: boolean;
  enableToolCalling?: boolean;
  
  // Limits
  maxMessageLength?: number;
  maxTokensPerMessage?: number;
  maxSessionMessages?: number;
  rateLimitPerMinute?: number;
  
  // Performance
  streamingEnabled?: boolean;
  cachingEnabled?: boolean;
  
  // Logging
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logRedactions?: boolean;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type {
  // Core
  Role,
  AuthScope,
  MemoryScope,
  
  // Models
  EmployeeProfile as Employee,
  ChatSession as Session,
  ChatMessage as Message,
  UserMemoryFact as Fact,
  MemoryEmbedding as Embedding,
  
  // Operations
  BuildContextInput as ContextInput,
  RetrievalOptions as RAGOptions,
  SummarizationInput as SummaryInput,
  
  // API
  ChatRequest as Request,
  ChatResponse as Response,
};

