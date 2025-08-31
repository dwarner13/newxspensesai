const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  handoff?: {
    slug: string;
    capability?: string;
    payload?: Record<string, any>;
  };
}

export async function chatWithBoss(
  messages: ChatMessage[],
  onStream?: (chunk: string) => void
): Promise<ChatResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your environment.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

              // Parse handoff from the response
          const handoffMatch = content.match(/```handoff\s*(\{.*?\})\s*```/s);
          let handoff;

          if (handoffMatch) {
            try {
              handoff = JSON.parse(handoffMatch[1]);
            } catch (e) {
              console.warn('Failed to parse handoff JSON:', e);
            }
          }

          return {
            content,
            handoff,
          };
  } catch (error) {
    console.error('Error chatting with Boss:', error);
    throw error;
  }
}
