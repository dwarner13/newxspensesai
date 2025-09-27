import { Result, Ok, Err } from '../types/result';
import { AgentConfig, StreamEvent, LLMMessage } from '../types/ai';
import { redactText } from '../server/redact';
import { scopeGate } from './policies/capabilities';
import { buildSystemPrompt, OUT_OF_SCOPE_POLICY } from './prompts/base';
import { 
  saveMessage, 
  ensureConversation, 
  logAudit, 
  getRecentMessages,
  saveToolCall,
  saveCheckpoint 
} from '../server/db';
import { getOpenAI, OpenAIToolDef } from '../server/ai/openai';
import { toOpenAIToolDefs, pickTools, executeTool } from './tools';
import crypto from 'crypto';

export interface RunAgentContext {
  userId: string;
  conversationId?: string;
  sessionId?: string;
  abortSignal?: AbortSignal;
}

interface ToolConfirmationRequest {
  _requiresConfirm: true;
  toolId: string;
  summary: string;
  howToConfirm: string;
  originalInput: any;
}

export async function runAgent(
  config: AgentConfig,
  userText: string,
  ctx: RunAgentContext
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const startTime = Date.now();
  const openai = getOpenAI();
  
  return new ReadableStream({
    async start(controller) {
      let accumulatedResponse = '';
      let messageId: string | null = null;
      
      try {
        // Step 1: Redact PII
        const redactionResult = redactText(userText);
        if (!redactionResult.ok) throw redactionResult.error;
        const { redacted: redactedText, tokens } = redactionResult.value;
        
        // Step 2: Scope gate
        const scopeResult = scopeGate(redactedText);
        if (!scopeResult.ok) throw scopeResult.error;
        
        const { level, topic, confidence } = scopeResult.value;
        
        // Step 3: Ensure conversation
        const convResult = await ensureConversation(ctx.userId, ctx.conversationId);
        if (!convResult.ok) throw convResult.error;
        const conversationId = convResult.value;
        
        // Step 4: Save user message
        await saveMessage({
          userId: ctx.userId,
          conversationId,
          role: 'user',
          content: userText,
          redactedContent: redactedText,
          metadata: { tokens: Array.from(tokens.entries()) },
        });
        
        // Step 5: Handle out of scope
        if (level === 'unsupported') {
          const outOfScopeMsg = OUT_OF_SCOPE_POLICY.replace('{{TOPIC}}', topic);
          
          for (const char of outOfScopeMsg) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'text',
              content: char,
            })}\n\n`));
            await new Promise(r => setTimeout(r, 10));
          }
          
          await saveMessage({
            userId: ctx.userId,
            conversationId,
            role: 'assistant',
            content: outOfScopeMsg,
          });
          
          await logAudit({
            userId: ctx.userId,
            agentName: config.name,
            toolId: 'scope_gate',
            outcome: 'rejected',
            durationMs: Date.now() - startTime,
            metadata: { topic, confidence },
          });
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
          return;
        }
        
        // Step 6: Build message history
        const history = await loadConversationHistory(conversationId, 25);
        const systemPrompt = buildSystemPrompt(config);
        
        const messages: LLMMessage[] = [
          ...history,
          { role: 'user', content: redactedText },
        ];
        
        // Step 7: Get available tools (enhanced with team and proactive tools)
        const enhancedTools = [
          'delete_my_data',
          'export_my_data', 
          'ingest_statement_enhanced',
          'generate_monthly_report_enhanced',
          'detect_anomalies',
          'merchant_lookup',
          'bulk_categorize',
          'check_usage_limits',
          'record_usage',
          'manage_billing',
          'search_docs',
          'safe_web_research',
          'manage_knowledge_pack',
          'create_org',
          'invite_member',
          'set_reminder',
          'detect_anomalies_advanced'
        ];
        
        const tools = toOpenAIToolDefs(enhancedTools);
        const toolModules = pickTools(enhancedTools);
        
        // Step 8: Run LLM with streaming
        let toolCallsToProcess: any[] = [];
        let currentAssistantMessage = '';
        
        async function* runCompletion(): AsyncIterableIterator<any> {
          const stream = openai.runLLMWithTools({
            system: systemPrompt,
            messages,
            stream: true,
            userId: ctx.userId,
          });
          
          for await (const chunk of stream) {
            if (ctx.abortSignal?.aborted) {
              throw new Error('Request aborted');
            }
            
            switch (chunk.type) {
              case 'text':
                currentAssistantMessage += chunk.content || '';
                accumulatedResponse += chunk.content || '';
                yield {
                  type: 'text',
                  content: chunk.content,
                };
                
                // Save checkpoint every 200 chars
                if (accumulatedResponse.length % 200 === 0) {
                  await saveCheckpoint(conversationId, accumulatedResponse);
                }
                break;
                
              case 'tool_call':
                toolCallsToProcess.push(chunk.toolCall);
                yield {
                  type: 'tool_call',
                  tool: {
                    id: chunk.toolCall.id,
                    name: chunk.toolCall.function.name,
                  },
                };
                break;
                
              case 'error':
                throw new Error(chunk.error);
                
              case 'done':
                break;
            }
          }
        }
        
        // Initial completion
        for await (const event of runCompletion()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        
        // Step 9: Process tool calls
        while (toolCallsToProcess.length > 0) {
          const toolResults: LLMMessage[] = [];
          
          for (const toolCall of toolCallsToProcess) {
            const toolModule = toolModules[toolCall.function.name];
            if (!toolModule) {
              toolResults.push({
                role: 'tool',
                content: JSON.stringify({ error: 'Tool not found' }),
                tool_call_id: toolCall.id,
              });
              continue;
            }
            
            // Parse arguments
            let args: any;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch {
              toolResults.push({
                role: 'tool',
                content: JSON.stringify({ error: 'Invalid arguments' }),
                tool_call_id: toolCall.id,
              });
              continue;
            }
            
            // Check confirmation guard
            if ((toolModule.meta.requiresConfirm || toolModule.meta.mutates || toolModule.meta.costly) 
                && !args.confirm) {
              const confirmRequest: ToolConfirmationRequest = {
                _requiresConfirm: true,
                toolId: toolModule.id,
                summary: `This will ${toolModule.description.toLowerCase()}`,
                howToConfirm: 'Please confirm by saying "yes" or "confirm"',
                originalInput: args,
              };
              
              toolResults.push({
                role: 'tool',
                content: JSON.stringify(confirmRequest),
                tool_call_id: toolCall.id,
              });
              
              // Stream confirmation request
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'confirmation_required',
                tool: toolModule.id,
                summary: confirmRequest.summary,
              })}\n\n`));
              
              continue;
            }
            
            // Execute tool
            const toolStartTime = Date.now();
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'tool_executing',
                tool: toolModule.id,
              })}\n\n`));
              
              const result = await executeTool(toolModule, args, {
                userId: ctx.userId,
                conversationId,
                sessionId: ctx.sessionId,
                abortSignal: ctx.abortSignal,
              });
              
              toolResults.push({
                role: 'tool',
                content: JSON.stringify(result),
                tool_call_id: toolCall.id,
              });
              
              // Log tool execution
              await logAudit({
                userId: ctx.userId,
                agentName: config.name,
                toolId: toolModule.id,
                inputsHash: crypto.createHash('sha256').update(JSON.stringify(args)).digest('hex'),
                outcome: 'success',
                durationMs: Date.now() - toolStartTime,
                metadata: { result },
              });
              
              // Save tool call to DB
              await saveToolCall({
                conversationId,
                toolId: toolModule.id,
                input: args,
                output: result,
                durationMs: Date.now() - toolStartTime,
              });
              
            } catch (error) {
              console.error('Tool execution error:', error);
              
              toolResults.push({
                role: 'tool',
                content: JSON.stringify({
                  error: error instanceof Error ? error.message : 'Tool execution failed',
                }),
                tool_call_id: toolCall.id,
              });
              
              await logAudit({
                userId: ctx.userId,
                agentName: config.name,
                toolId: toolModule.id,
                outcome: 'error',
                durationMs: Date.now() - toolStartTime,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
          
          // Add tool results to messages
          messages.push({
            role: 'assistant',
            content: currentAssistantMessage,
            tool_calls: toolCallsToProcess,
          });
          messages.push(...toolResults);
          
          // Clear for next iteration
          toolCallsToProcess = [];
          currentAssistantMessage = '';
          
          // Continue conversation with tool results
          for await (const event of runCompletion()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        }
        
        // Step 10: Save final assistant message
        const msgResult = await saveMessage({
          userId: ctx.userId,
          conversationId,
          role: 'assistant',
          content: accumulatedResponse,
          metadata: {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            processingTime: Date.now() - startTime,
          },
        });
        
        if (msgResult.ok) {
          messageId = msgResult.value;
        }
        
        // Send done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'done',
          messageId,
          processingTime: Date.now() - startTime,
        })}\n\n`));
        
      } catch (error) {
        console.error('Agent error:', error);
        
        // Try to save partial response
        if (accumulatedResponse && messageId) {
          await saveMessage({
            userId: ctx.userId,
            conversationId: ctx.conversationId!,
            role: 'assistant',
            content: accumulatedResponse + '\n\n[Error: Response interrupted]',
            metadata: { partial: true, error: error.message },
          });
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          partial: accumulatedResponse.length > 0,
        })}\n\n`));
        
        await logAudit({
          userId: ctx.userId,
          agentName: config.name,
          toolId: 'process_message',
          outcome: 'error',
          durationMs: Date.now() - startTime,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        
      } finally {
        controller.close();
      }
    },
  });
}

async function loadConversationHistory(
  conversationId: string,
  limit: number
): Promise<LLMMessage[]> {
  const result = await getRecentMessages({ conversationId, limit });
  
  if (!result.ok) {
    console.error('Failed to load history:', result.error);
    return [];
  }
  
  const messages = result.value;
  let history: LLMMessage[] = [];
  let totalChars = 0;
  const maxChars = 12000; // ~3k tokens
  
  // Convert and trim
  for (const msg of messages.reverse()) {
    const content = msg.redacted_content || msg.content;
    
    if (totalChars + content.length > maxChars) {
      break; // Stop if we exceed limit
    }
    
    history.push({
      role: msg.role as any,
      content,
      tool_call_id: msg.tool_call_id,
    });
    
    totalChars += content.length;
  }
  
  return history;
}
