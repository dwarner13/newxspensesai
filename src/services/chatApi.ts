import { CHAT_ENDPOINT, verifyChatBackend } from '../lib/chatEndpoint';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function sendChat({ 
  userId, 
  convoId,
  messages, 
  employee,
  onToken
}: { 
  userId: string;
  convoId?: string;
  messages: Message[];
  employee?: string;
  onToken?: (token: string) => void;
}) {
  // Try streaming endpoint first
  try {
    console.log('[chatApi] using endpoint:', CHAT_ENDPOINT);
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, convoId, messages, employee })
    });
    
    // Verify we're hitting the v2 backend
    verifyChatBackend(res);
    
    if (!res.ok || !res.body) {
      throw new Error('stream_failed');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';
    let detectedEmployee = employee || 'prime-boss';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        
        // Only handle "data:" lines
        const dataLine = rawEvent.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        
        try {
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));
          
          if (payload.type === 'employee') {
            detectedEmployee = payload.employee;
          } else if (payload.type === 'token') {
            assembled += payload.token;
            if (onToken) onToken(payload.token);
          } else if (payload.type === 'note' && payload.note) {
            // Log note for debugging (could show UI toast here)
            console.log('📝 Note:', payload.note);
          } else if (payload.type === 'done') {
            // Stream complete
          }
        } catch (parseErr) {
          console.log('SSE parse error:', parseErr);
        }
      }
    }

    return { content: assembled, employee: detectedEmployee };
    
  } catch (error) {
    console.log("Streaming not available, using mock responses:", error);
  }

  // Fallback to mock responses
  const responses = {
    'prime-boss': "👑 Prime here! How can I help with your finances?",
    'byte-docs': "📄 Byte here! Need help with documents?",
    'tag-categorize': "🏷️ Tag here! Let me categorize your expenses.",
    'crystal-analytics': "🔮 Crystal here! I'll analyze your spending trends.",
    'ledger-tax': "📊 Ledger here! I can help with tax questions.",
    'goalie-goals': "🎯 Goalie here! Let's work on your financial goals."
  };

  // Simple keyword-based routing
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
  let selectedEmployee = employee || 'prime-boss';
  
  if (!employee) {
    if (/(receipt|invoice|upload|document)/i.test(lastMessage)) {
      selectedEmployee = 'byte-docs';
    } else if (/(category|categorize|tag)/i.test(lastMessage)) {
      selectedEmployee = 'tag-categorize';
    } else if (/(trend|report|analytics)/i.test(lastMessage)) {
      selectedEmployee = 'crystal-analytics';
    } else if (/(tax|deduction)/i.test(lastMessage)) {
      selectedEmployee = 'ledger-tax';
    } else if (/(goal|save|budget)/i.test(lastMessage)) {
      selectedEmployee = 'goalie-goals';
    }
  }

  // Simulate streaming with onToken callback
  const content = responses[selectedEmployee as keyof typeof responses] || responses['prime-boss'];
  
  if (onToken) {
    const words = content.split(' ');
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onToken(word + ' ');
    }
  }

  return { content, employee: selectedEmployee };
}

