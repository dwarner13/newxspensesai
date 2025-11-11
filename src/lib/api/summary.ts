/**
 * Summary API - Fetch conversation summary
 */

export interface SummaryResponse {
  summary?: string;
  agent?: string;
  updated_at?: string;
}

/**
 * Fetch conversation summary
 */
export async function fetchSummary(convoId: string): Promise<SummaryResponse> {
  const response = await fetch('/.netlify/functions/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ convoId })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch summary: ${response.status}`);
  }

  return response.json();
}










