/**
 * LLM - Agent execution with tool support
 */

import { getVendorHint, saveVendorHint } from './memory';

interface RunAgentParams {
  agent: string;
  message: string;
  convoId: string;
  tools: Record<string, (...args: any[]) => Promise<any>>;
  userId?: string | null;
}

interface RunAgentResult {
  text: string;
  meta: {
    usedTools?: string[];
    model: string;
    error?: boolean;
  };
}

/**
 * Get system prompt for agent
 */
function systemPromptFor(agent: string): string {
  switch (agent.toLowerCase()) {
    case 'prime':
      return `You are Prime, a strategic financial cofounder. Your role is to provide safe, concise, and actionable financial advice. Be direct and practical. Focus on strategic decisions and delegate specialized tasks when appropriate. Keep responses under 3 sentences unless detailed analysis is requested.`;

    case 'tag':
      return `You are Tag, a transaction categorizer. Your job is to analyze transaction information and categorize it accurately. When categorizing transactions, output JSON in this exact format:
{
  "merchant": "merchant name",
  "amount": number,
  "date": "YYYY-MM-DD",
  "category": "category name",
  "confidence": 0.0-1.0
}
If the input lacks transaction details, respond conversationally but still attempt to categorize what's provided.`;

    case 'crystal':
      return `You are Crystal, an analytics expert specializing in summarization and data extraction. You excel at analyzing content, extracting key insights, and providing clear summaries. When tool context is provided, integrate it naturally into your analysis. Be thorough but concise.`;

    default:
      return `You are a helpful financial assistant. Provide clear, accurate, and actionable guidance.`;
  }
}

/**
 * Extract merchant name from message (naive extraction)
 * Tries: first quoted string, or first capitalized token
 */
function extractMerchant(message: string): string | null {
  // Try quoted string first
  const quotedMatch = message.match(/["']([^"']+)["']/);
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1].trim();
  }

  // Try capitalized token (2+ uppercase letters or word starting with uppercase)
  const capitalizedMatch = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
  if (capitalizedMatch && capitalizedMatch[1]) {
    return capitalizedMatch[1].trim();
  }

  return null;
}

/**
 * Parse JSON from text (handles code blocks and plain JSON)
 */
function parseJSONFromText(text: string): any | null {
  // Try to extract JSON from code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // Fall through to try plain JSON
    }
  }

  // Try to find JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Return null if parsing fails
    }
  }

  return null;
}

/**
 * Run agent with tools and OpenAI API
 */
export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const { agent, message, tools, userId } = params;
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      text: 'OpenAI API key not configured.',
      meta: { model: 'gpt-4o-mini', error: true }
    };
  }

  let userMessage = message;
  const usedTools: string[] = [];

  // For Tag agent: Get vendor hint if merchant is detected
  if (agent.toLowerCase() === 'tag') {
    const merchant = extractMerchant(message);
    if (merchant) {
      const hint = await getVendorHint(merchant, userId);
      if (hint) {
        userMessage += `\n\nHINT: prior category for ${merchant} is ${hint.category} (weight ${hint.weight}). Prefer unless contradicted.`;
      }
    }
  }

  // Check if message contains a URL and fetch it
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = message.match(urlPattern);
  
  if (urls && urls.length > 0 && tools['url.fetch']) {
    try {
      const url = urls[0];
      const fetchResult = await tools['url.fetch']({ url });
      usedTools.push('url.fetch');
      
      if (fetchResult.error) {
        userMessage += `\n\nTOOL CONTEXT: Error fetching URL ${url}: ${fetchResult.error}`;
      } else {
        const toolContext = [
          `TOOL CONTEXT:`,
          `URL: ${url}`,
          `Summary: ${fetchResult.summary || 'N/A'}`,
          `Snippet: ${fetchResult.snippet?.substring(0, 500) || 'N/A'}`
        ].join('\n');
        userMessage += `\n\n${toolContext}`;
      }
    } catch (error: any) {
      userMessage += `\n\nTOOL CONTEXT: Error fetching URL: ${error.message || 'Unknown error'}`;
    }
  }

  // Compose messages
  const messages = [
    { role: 'system' as const, content: systemPromptFor(agent) },
    { role: 'user' as const, content: userMessage }
  ];

  try {
    // Call OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response from model';

    // For Tag agent: Save vendor hint if JSON contains merchant and category
    if (agent.toLowerCase() === 'tag') {
      try {
        const jsonResult = parseJSONFromText(text);
        if (jsonResult && jsonResult.merchant && jsonResult.category) {
          await saveVendorHint(jsonResult.merchant, jsonResult.category, userId);
        }
      } catch (error) {
        // Silent fail - memory save is non-critical
        console.error('[llm] Failed to save vendor hint:', error);
      }
    }

    return {
      text,
      meta: {
        usedTools: usedTools.length > 0 ? usedTools : undefined,
        model: 'gpt-4o-mini'
      }
    };

  } catch (error: any) {
    console.error('[llm] OpenAI API error:', error);
    
    // Return safe fallback
    return {
      text: `I apologize, but I'm experiencing technical difficulties. Please try again in a moment.`,
      meta: {
        model: 'gpt-4o-mini',
        error: true
      }
    };
  }
}

