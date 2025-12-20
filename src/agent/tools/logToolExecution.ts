import { getSupabaseServerClient } from '../../server/db';
import { wrapAsync } from '../../types/result';

export interface LogToolExecutionParams {
  userId: string;
  employeeSlug: string;
  toolId: string;
  mode: 'explain-only' | 'propose-confirm' | 'auto-pilot';
  autonomyLevel: number; // 0–3
  inputSummary?: string;
  affectedCount?: number | null;
  status: 'success' | 'error' | 'skipped' | 'cancelled';
  errorMessage?: string | null;
}

/**
 * Logs a tool execution to the tool_executions table for audit and monitoring.
 * This function is fire-and-forget - errors are logged but don't throw.
 */
export async function logToolExecution(params: LogToolExecutionParams): Promise<void> {
  const client = getSupabaseServerClient();
  
  const result = await wrapAsync(async () => {
    const { error } = await client
      .from('tool_executions')
      .insert({
        user_id: params.userId,
        employee_slug: params.employeeSlug,
        tool_id: params.toolId,
        mode: params.mode,
        autonomy_level: params.autonomyLevel,
        input_summary: params.inputSummary || null,
        affected_count: params.affectedCount ?? null,
        status: params.status,
        error_message: params.errorMessage || null,
      });
    
    if (error) throw error;
  });
  
  // Log errors but don't throw - tool execution logging should never break tool execution
  if (!result.ok) {
    console.error('[logToolExecution] Failed to log tool execution:', {
      toolId: params.toolId,
      userId: params.userId,
      error: result.error?.message,
    });
  }
}

/**
 * Extracts affected_count from tool result if available.
 * Looks for common patterns: result.updated, result.count, result.affected, etc.
 */
export function extractAffectedCount(result: any): number | null {
  if (!result || typeof result !== 'object') {
    return null;
  }
  
  // Common patterns in tool results
  if (typeof result.updated === 'number') return result.updated;
  if (typeof result.count === 'number') return result.count;
  if (typeof result.affected === 'number') return result.affected;
  if (typeof result.affected_count === 'number') return result.affected_count;
  if (Array.isArray(result.transactions) && result.transactions.length > 0) {
    return result.transactions.length;
  }
  if (Array.isArray(result.items) && result.items.length > 0) {
    return result.items.length;
  }
  
  return null;
}

/**
 * Generates a short summary of tool input for logging.
 * Truncates long inputs and removes sensitive data.
 */
export function generateInputSummary(toolId: string, input: any): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  
  try {
    // Create a safe summary object (exclude sensitive fields)
    const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'ssn', 'credit_card'];
    const summary: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(input)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        summary[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        summary[key] = value.substring(0, 100) + '...';
      } else {
        summary[key] = value;
      }
    }
    
    const summaryStr = JSON.stringify(summary);
    // Limit total length
    return summaryStr.length > 500 ? summaryStr.substring(0, 500) + '...' : summaryStr;
  } catch (error) {
    return undefined;
  }
}











