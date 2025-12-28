export type AgentConfig = {
  name: string;
  persona: string;
  goals: string[];
  allowedTools: string[];
  outputStyle?: 'concise' | 'detailed' | 'json';
  systemPreamble?: string;
  memoryScope: 'user' | 'team' | 'none';
  maxTokens?: number;
  temperature?: number;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, any>;
};

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
};

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
};

export type StreamEvent = 
  | { type: 'text'; content: string }
  | { type: 'tool_call'; tool: ToolCall }
  | { type: 'tool_executing'; tool: string }
  | { type: 'tool_result'; tool: string; result: any }  // Phase 3.1: Tool execution result
  | { type: 'tool_error'; tool: string; error: string }  // Phase 3.1: Tool execution error
  | { type: 'confirmation_required'; tool: string; summary: string }
  | { type: 'handoff'; from: string; to: string; reason?: string; summary?: string }
  | { type: 'employee'; employee: string }
  | { type: 'error'; error: string; partial?: boolean }
  | { type: 'done'; messageId?: string; processingTime?: number };
