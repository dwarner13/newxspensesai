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
  | { type: 'confirmation_required'; tool: string; summary: string }
  | { type: 'error'; error: string; partial?: boolean }
  | { type: 'done'; messageId?: string; processingTime?: number };
