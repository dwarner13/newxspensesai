/**
 * Agent Bridge - Server-Side Employee Calling
 * ============================================
 * Allows one employee to call another via internal HTTP
 */

interface AgentBridgeParams {
  userId: string;
  employeeSlug: string;
  message: string;
  parentSessionId: string;
  sessionId?: string;
  depth?: number;
  requestId?: string;
  originEmployee?: string;
}

interface AgentBridgeResponse {
  success: boolean;
  summary: string;
  result: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
  metadata?: any;
}

// Cycle detection cache (in-memory, sufficient for single-instance)
const activeRequests = new Map<string, { origin: string; target: string; startTime: number }>();

// Config
const MAX_DEPTH = 2;
const DEFAULT_TIMEOUT_MS = 15000;
const CHAT_ENDPOINT = process.env.NETLIFY_DEV === 'true' 
  ? 'http://localhost:8888/.netlify/functions/chat'
  : '/.netlify/functions/chat';

/**
 * Call another employee via internal HTTP
 */
export async function callEmployee(params: AgentBridgeParams): Promise<AgentBridgeResponse> {
  const {
    userId,
    employeeSlug,
    message,
    parentSessionId,
    sessionId,
    depth = 0,
    requestId = generateRequestId(),
    originEmployee = 'prime-boss',
  } = params;

  const startTime = Date.now();

  // Guard: Max depth
  if (depth >= MAX_DEPTH) {
    console.warn(`[AGENT_BRIDGE] Max depth ${MAX_DEPTH} reached for ${requestId}`);
    return {
      success: false,
      summary: 'Maximum delegation depth reached',
      result: 'I cannot delegate further. Please try a simpler request.',
      error: 'MAX_DEPTH_EXCEEDED',
    };
  }

  // Guard: Cycle detection
  const cycleKey = `${originEmployee}->${employeeSlug}:${message.substring(0, 50)}`;
  if (activeRequests.has(cycleKey)) {
    console.warn(`[AGENT_BRIDGE] Cycle detected: ${cycleKey}`);
    return {
      success: false,
      summary: 'Delegation cycle detected',
      result: 'I detected a circular delegation and stopped to prevent a loop.',
      error: 'CYCLE_DETECTED',
    };
  }

  // Mark request as active
  activeRequests.set(cycleKey, { origin: originEmployee, target: employeeSlug, startTime });

  try {
    console.log(`[AGENT_BRIDGE] ${requestId} | ${originEmployee} → ${employeeSlug} (depth=${depth})`);

    // Call our own chat endpoint (non-streaming)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-depth': String(depth + 1),
        'x-request-id': requestId,
        'x-origin-employee': originEmployee,
      },
      body: JSON.stringify({
        userId,
        employeeSlug,
        message,
        sessionId: sessionId || parentSessionId, // Use child session or parent
        stream: false, // Non-streaming for delegation
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    const duration = Date.now() - startTime;
    console.log(`[AGENT_BRIDGE] ${requestId} | Completed in ${duration}ms`);

    // Extract result
    const result = data.content || data.result || 'No response from specialist';
    const summary = result.length > 100 ? result.substring(0, 97) + '...' : result;

    return {
      success: true,
      summary,
      result,
      token_usage: data.tokens,
      metadata: {
        employeeSlug,
        duration,
        requestId,
      },
    };
  } catch (error) {
    const err = error as Error;
    const duration = Date.now() - startTime;

    console.error(`[AGENT_BRIDGE] ${requestId} | Error after ${duration}ms:`, err.message);

    // Handle specific errors
    if (err.name === 'AbortError') {
      return {
        success: false,
        summary: 'Request timed out',
        result: `The request to ${employeeSlug} timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. Please try again.`,
        error: 'TIMEOUT',
      };
    }

    return {
      success: false,
      summary: 'Delegation failed',
      result: `I encountered an error while contacting ${employeeSlug}: ${err.message}`,
      error: err.message,
    };
  } finally {
    // Cleanup
    activeRequests.delete(cycleKey);
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get active delegation stats (for monitoring)
 */
export function getActiveDelegations() {
  return {
    count: activeRequests.size,
    requests: Array.from(activeRequests.entries()).map(([key, value]) => ({
      key,
      ...value,
      duration: Date.now() - value.startTime,
    })),
  };
}
