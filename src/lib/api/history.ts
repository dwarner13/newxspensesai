/**
 * History API - Fetch conversation history
 */

export interface HistoryMessage {
  role: 'user' | 'assistant' | 'system';
  agent?: string;
  content: string;
  created_at: string;
}

export interface HistoryResponse {
  messages: HistoryMessage[];
}

/**
 * Fetch conversation history
 */
export async function fetchHistory(convoId: string): Promise<HistoryResponse> {
  const response = await fetch('/.netlify/functions/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ convoId })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.status}`);
  }

  return response.json();
}


