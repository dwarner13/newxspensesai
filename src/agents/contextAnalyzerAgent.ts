import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function analyzeHighlightedContext({
  highlightedText,
  fullRowContext,
  userId
}: {
  highlightedText: string;
  fullRowContext: Record<string, any>;
  userId?: string;
}): Promise<{ suggestions?: string[]; error?: string }> {
  try {
    // Optionally, fetch user memory or context here using userId
    const prompt = `You are a financial assistant helping users make decisions about their spending. Based on the highlighted text and the full transaction row, suggest actions or insights the user might find useful.\n\nHighlighted text: ${highlightedText}\nFull transaction row: ${JSON.stringify(fullRowContext, null, 2)}\n\nRespond with 2-3 short, actionable suggestions as a JSON array of strings.`;
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful financial assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 200
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error('OpenAI error: ' + (err.error?.message || response.statusText));
    }
    const data = await response.json();
    // Try to parse the response as a JSON array
    let suggestions: string[] = [];
    try {
      const match = data.choices?.[0]?.message?.content?.match(/\[.*\]/s);
      if (match) {
        suggestions = JSON.parse(match[0]);
      } else {
        // fallback: split by line or bullet
        suggestions = (data.choices?.[0]?.message?.content || '').split(/\n|\d+\.|\-/).map((s: string) => s.trim()).filter(Boolean);
      }
    } catch (err) {
      suggestions = [(data.choices?.[0]?.message?.content || '').trim()];
    }
    return { suggestions };
  } catch (error) {
    return { error: (error as Error).message };
  }
} 