import OpenAI from 'openai';
import { encoding_for_model, TiktokenModel } from 'tiktoken';
import { Result, Ok, Err } from '../../types/result';
import { getSupabaseServerClient } from '../db';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
}

export interface OpenAIToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'error' | 'done';
  content?: string;
  toolCall?: any;
  error?: string;
}

class OpenAIService {
  private client: OpenAI;
  private encoder: any;
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');
    
    this.client = new OpenAI({ 
      apiKey,
      timeout: this.TIMEOUT_MS,
      maxRetries: this.MAX_RETRIES,
    });
    
    // Token counter
    this.encoder = encoding_for_model('gpt-4' as TiktokenModel);
  }
  
  countTokens(messages: LLMMessage[]): number {
    let tokens = 0;
    for (const msg of messages) {
      tokens += 4; // message overhead
      tokens += this.encoder.encode(msg.content).length;
      if (msg.name) tokens += this.encoder.encode(msg.name).length;
    }
    return tokens;
  }
  
  calculateCost(inputTokens: number, outputTokens: number, model = 'gpt-4o-mini'): number {
    const pricing = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // per 1K tokens
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
    };
    
    const rates = pricing[model] || pricing['gpt-4o-mini'];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
  }
  
  async *runLLMWithTools({
    system,
    messages,
    tools,
    stream = true,
    userId,
    maxOutputTokens = 2000,
  }: {
    system: string;
    messages: LLMMessage[];
    tools: OpenAIToolDef[];
    stream?: boolean;
    userId?: string;
    maxOutputTokens?: number;
  }): AsyncIterableIterator<StreamChunk> {
    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let lastCheckpoint = '';
    
    try {
      // Add system message
      const fullMessages = [
        { role: 'system' as const, content: system },
        ...messages
      ];
      
      // Count input tokens
      inputTokens = this.countTokens(fullMessages);
      
      // Check token limit
      if (inputTokens > 12000) {
        throw new Error('Context too long. Please start a new conversation.');
      }
      
      // Add prompt injection detection
      if (this.detectPromptInjection(messages[messages.length - 1]?.content || '')) {
        yield {
          type: 'error',
          error: 'Message contains potentially harmful content',
        };
        return;
      }
      
      const completion = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: fullMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.3,
        max_tokens: maxOutputTokens,
        stream,
        user: userId, // for OpenAI abuse monitoring});
      
      if (!stream) {
        const response = completion as OpenAI.Chat.Completions.ChatCompletion;
        const content = response.choices[0]?.message?.content || '';
        outputTokens = this.encoder.encode(content).length;
        
        yield { type: 'text', content };
        
        if (response.choices[0]?.message?.tool_calls) {
          for (const toolCall of response.choices[0].message.tool_calls) {
            yield { type: 'tool_call', toolCall };
          }
        }
      } else {
        // Handle streaming with checkpoints
        const stream = completion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
        let accumulatedText = '';
        let currentToolCall: any = null;
        
        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (!choice) continue;
          
          // Handle text delta
          if (choice.delta?.content) {
            accumulatedText += choice.delta.content;
            outputTokens += this.encoder.encode(choice.delta.content).length;
            
            yield { type: 'text', content: choice.delta.content };
            
            // Save checkpoint every 100 chars
            if (accumulatedText.length - lastCheckpoint.length > 100) {
              lastCheckpoint = accumulatedText;
              // Could save to Redis/memory for recovery
            }
          }
          
          // Handle tool calls
          if (choice.delta?.tool_calls) {
            for (const toolCallDelta of choice.delta.tool_calls) {
              if (toolCallDelta.id) {
                // New tool call
                if (currentToolCall) {
                  yield { type: 'tool_call', toolCall: currentToolCall };
                }
                currentToolCall = {
                  id: toolCallDelta.id,
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || '',
                  },
                };
              } else if (currentToolCall && toolCallDelta.function?.arguments) {
                // Accumulate arguments
                currentToolCall.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
          
          // Check for finish
          if (choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls') {
            if (currentToolCall) {
              yield { type: 'tool_call', toolCall: currentToolCall };
            }
          }
        }
      }
      
      // Log costs
      const cost = this.calculateCost(inputTokens, outputTokens);
      await this.logUsage(userId || 'anonymous', inputTokens, outputTokens, cost);
      
      yield { type: 'done' };
      
    } catch (error) {
      console.error('OpenAI error:', error);
      
      // Try to recover with checkpoint
      if (lastCheckpoint) {
        yield { 
          type: 'text', 
          content: '\n\n[Stream interrupted. Partial response saved.]' 
        };
      }
      
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private detectPromptInjection(text: string): boolean {
    const injectionPatterns = [
      /ignore (all )?previous instructions/i,
      /disregard (the )?system prompt/i,
      /you are now/i,
      /forget everything/i,
      /new instructions:/i,
      /\[system\]/i,
      /\{\{system\}\}/i,
    ];
    
    return injectionPatterns.some(pattern => pattern.test(text));
  }
  
  private async logUsage(
    userId: string, 
    inputTokens: number, 
    outputTokens: number, 
    cost: number
  ): Promise<void> {
    // Log to database
    const { error } = await getSupabaseServerClient()
      .from('usage_logs')
      .insert({
        user_id: userId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: cost,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Failed to log usage:', error);
    }
  }
}

let instance: OpenAIService | null = null;

export function getOpenAI(): OpenAIService {
  if (!instance) {
    instance = new OpenAIService();
  }
  return instance;
}
