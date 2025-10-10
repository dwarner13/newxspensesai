/**
 * Delegate Tool - Prime's Tool for Calling Specialists
 * =====================================================
 * Allows Prime to delegate tasks to specialist employees
 */

import { callEmployee } from '../internal/agentBridge';

interface DelegateParams {
  targetEmployee: string;
  objective: string;
  context?: string;
  maxDepth?: number;
  timeoutMs?: number;
}

interface DelegateContext {
  userId: string;
  sessionId: string;
  employeeSlug: string;
  depth?: number;
  requestId?: string;
}

interface DelegateResponse {
  success: boolean;
  targetEmployee: string;
  summary: string;
  result: string;
  metadata?: any;
}

/**
 * Delegate Tool - Main Handler
 */
export async function delegateTool(
  params: DelegateParams,
  context: DelegateContext
): Promise<DelegateResponse> {
  const { targetEmployee, objective, context: additionalContext } = params;
  const { userId, sessionId, employeeSlug, depth = 0, requestId } = context;

  console.log(`[TOOL:DELEGATE] ${employeeSlug} → ${targetEmployee}: "${objective.substring(0, 50)}..."`);

  // Validate target employee
  const validEmployees = [
    'byte-doc',
    'tag-ai',
    'crystal-analytics',
    'ledger-tax',
    'goalie-coach',
    'blitz-debt',
  ];

  if (!validEmployees.includes(targetEmployee)) {
    return {
      success: false,
      targetEmployee,
      summary: 'Invalid employee',
      result: `I don't have a specialist named "${targetEmployee}". Available specialists: ${validEmployees.join(', ')}.`,
    };
  }

  // Build message for target employee
  let message = objective;
  if (additionalContext) {
    message += `\n\nContext: ${additionalContext}`;
  }

  // Call via agent bridge
  const response = await callEmployee({
    userId,
    employeeSlug: targetEmployee,
    message,
    parentSessionId: sessionId,
    depth,
    requestId,
    originEmployee: employeeSlug,
  });

  if (!response.success) {
    return {
      success: false,
      targetEmployee,
      summary: response.summary,
      result: response.result,
      metadata: { error: response.error },
    };
  }

  return {
    success: true,
    targetEmployee,
    summary: response.summary,
    result: response.result,
    metadata: {
      token_usage: response.token_usage,
      duration: response.metadata?.duration,
    },
  };
}

/**
 * Tool Definition (for OpenAI function calling)
 */
export const delegateToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'delegate',
    description: 'Delegate a task to a specialist AI employee. Use when the user asks you to coordinate with or ask another employee.',
    parameters: {
      type: 'object',
      properties: {
        targetEmployee: {
          type: 'string',
          enum: [
            'byte-doc',
            'tag-ai',
            'crystal-analytics',
            'ledger-tax',
            'goalie-coach',
            'blitz-debt',
          ],
          description: 'The specialist employee to delegate to',
        },
        objective: {
          type: 'string',
          description: 'Clear, concise instruction for the specialist (e.g., "Categorize October transactions")',
        },
        context: {
          type: 'string',
          description: 'Optional additional context to help the specialist',
        },
      },
      required: ['targetEmployee', 'objective'],
    },
  },
};
