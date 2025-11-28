/**
 * Summarizer - Generate conversation summaries
 */

import { supabaseAdmin } from '../supabase';

interface SummarizeConvoParams {
  convoId: string;
}

/**
 * Summarize conversation by fetching last messages and calling OpenAI
 */
export async function summarizeConvo(params: SummarizeConvoParams): Promise<string> {
  const { convoId } = params;
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return 'Summary unavailable (API key not configured).';
  }

  try {
    // SELECT last ~12 messages for convoId (user+assistant) sorted asc
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('convo_id', convoId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
      .limit(12);

    if (error) {
      console.error('[summarizer] Failed to fetch messages:', error);
      return 'Summary unavailable (database error).';
    }

    // If conversation is too short, return default string
    if (!messages || messages.length < 2) {
      return 'Conversation just started.';
    }

    // Build conversation text from messages
    const conversationText = messages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return `${role}: ${content}`;
      })
      .join('\n\n');

    // Build prompt
    const prompt = `Summarize key facts, open tasks, and numbers from this conversation. Keep it to 8-12 lines. Do not include any PII (personally identifiable information).

Conversation:
${conversationText}

Summary:`;

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a conversation summarizer. Extract key facts, tasks, and numbers. Keep summaries concise (8-12 lines). Never include PII.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[summarizer] OpenAI API error:', response.status, errorText);
      return 'Summary unavailable (API error).';
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || 'Summary unavailable.';

    return summary;

  } catch (error: any) {
    console.error('[summarizer] Error summarizing conversation:', error);
    return 'Summary unavailable (error).';
  }
}

