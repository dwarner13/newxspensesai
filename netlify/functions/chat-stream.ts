import type { Handler } from '@netlify/functions'
import { openai } from './_shared/openai'
import { supabaseAdmin } from './supabase'
import { saveMessage, saveFact } from './_shared/memory'
import { routeToEmployee } from './_shared/router'

const CHAT_MODEL = 'gpt-4o-mini'

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  try {
    const { userId, messages, employee } = JSON.parse(event.body || '{}')
    
    if (!userId || !Array.isArray(messages) || messages.length === 0) {
      return { 
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'bad_request' }) 
      }
    }

    // 1) Save latest user message
    const userMsg = messages[messages.length - 1]
    const userMsgId = await saveMessage(userId, 'user', userMsg.content, employee || 'prime-boss')

    // 2) Get recent chat history for context (simplified memory)
    let recalls: any[] = []
    try {
      const { data: recentMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('content, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6)
      
      recalls = (recentMessages || [])
        .reverse()
        .slice(0, 4)
        .map(m => ({ text: `${m.role}: ${m.content}` }))
    } catch (error) {
      console.log("Memory lookup failed:", error)
    }

    // 3) Route to employee
    const target = routeToEmployee(employee ?? null, messages, recalls)

    // 4) Stream from OpenAI
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      stream: true,
      messages: [
        { role: 'system', content: target.systemPrompt },
        ...recalls.map(r => ({ role: 'system' as const, content: `Context: ${r.text}` })),
        ...messages
      ]
    })

    let fullText = ''
    const chunks: string[] = []

    // Collect all chunks
    for await (const part of completion) {
      const token = part.choices?.[0]?.delta?.content ?? ''
      if (token) {
        fullText += token
        chunks.push(token)
      }
    }

    // 5) Save assistant message
    const aiMsgId = await saveMessage(userId, 'assistant', fullText, target.slug)

    // 6) Extract facts asynchronously (don't wait for it)
    extractAndSaveFacts(userId, fullText, aiMsgId).catch(err => 
      console.log('Fact extraction failed:', err)
    )

    return { 
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        content: fullText, 
        employee: target.slug,
        chunks // For future streaming UI
      }) 
    }
  } catch (err: any) {
    console.error('chat_error', err)
    return { 
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'chat_failed', 
        detail: String(err?.message || err) 
      }) 
    }
  }
}

// Background fact extraction
async function extractAndSaveFacts(userId: string, text: string, messageId: string) {
  try {
    const toolResp = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      messages: [
        { 
          role: 'system', 
          content: 'Extract 1-3 short, durable facts about the user from this conversation. Return as JSON: {"facts": ["fact1", "fact2"]}' 
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' }
    })
    
    const raw = toolResp.choices[0]?.message?.content ?? '{"facts":[]}'
    const parsed = JSON.parse(raw)
    const facts: string[] = Array.isArray(parsed.facts) ? parsed.facts : []
    
    for (const f of facts) {
      if (typeof f === 'string' && f.trim().length > 5) {
        await saveFact(userId, f.trim(), messageId)
      }
    }
  } catch (err) {
    console.log('Fact extraction error:', err)
  }
}






