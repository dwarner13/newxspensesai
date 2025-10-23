/**
 * Dashboard Prime Chat Component
 * ================================
 * Integrated chat panel for the main dashboard
 * Uses existing /.netlify/functions/chat backend
 * Features: streaming, memory, routing, guardrails
 */

import React, { useState, useRef, useEffect } from 'react';
import { CHAT_ENDPOINT, verifyChatBackend } from '../../lib/chatEndpoint';
import { Send, Crown, User, Loader2, X, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { onBus } from '../../lib/bus';
import PrimeGreeting from './PrimeGreeting';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  employee?: string;
  isGreeting?: boolean;
}

interface DashboardPrimeChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialGreeting?: string;
  initialSuggestions?: Array<{ label: string; action?: string; route?: string; event?: { type: string; payload: any } }>;
}

// SSE Stream Reader Helper
async function readSSEStream(
  res: Response,
  {
    onDelta,
    onDone,
  }: {
    onDelta: (chunk: string) => void;
    onDone: (fullText: string) => void;
  }
) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split by SSE event delimiter
    const parts = buffer.split('\n\n');
    buffer = parts.pop()!;

    for (const part of parts) {
      // Lines look like:
      // data: {...}
      // OR
      // data: [DONE]
      const lines = part.split('\n');
      const dataLine = lines.find(l => l.startsWith('data: '));
      if (!dataLine) continue;
      const payload = dataLine.slice(6).trim();

      if (payload === '[DONE]') {
        // upstream complete
        continue;
      }

      try {
        const json = JSON.parse(payload);
        const frag = json?.choices?.[0]?.delta?.content ?? '';
        if (frag) {
          full += frag;
          onDelta(frag);
        }
      } catch {
        // Non-JSON payloads are ignored
      }
    }
  }

  // Flush any trailing buffer (usually empty for SSE)
  if (buffer.startsWith('data: ')) {
    try {
      const json = JSON.parse(buffer.slice(6).trim());
      const frag = json?.choices?.[0]?.delta?.content ?? '';
      if (frag) {
        full += frag;
        onDelta(frag);
      }
    } catch {}
  }

  onDone(full);
}

export default function DashboardPrimeChat({ isOpen, onClose, initialGreeting, initialSuggestions }: DashboardPrimeChatProps) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [greetingData, setGreetingData] = useState<{ greeting: string; suggestions: any[] } | null>(null);
  const [showGreeting, setShowGreeting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [convoId] = useState(() => {
    const stored = localStorage.getItem('prime_convo_id');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('prime_convo_id', newId);
    return newId;
  });

  // Listen for CHAT_OPEN bus events to update greeting
  useEffect(() => {
    const off = onBus('CHAT_OPEN', (payload) => {
      if (payload.greeting) {
        setGreetingData({
          greeting: payload.greeting,
          suggestions: payload.suggestions || [],
        });
        setShowGreeting(true);
        setMessages([]); // Clear messages for new greeting
      }
    });
    return () => off();
  }, []);

  // Set initial greeting if provided
  useEffect(() => {
    if (initialGreeting && isOpen && showGreeting && messages.length === 0) {
      setGreetingData({
        greeting: initialGreeting,
        suggestions: initialSuggestions || [],
      });
    }
  }, [isOpen, initialGreeting, initialSuggestions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message with streaming
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Create placeholder for assistant response
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Convert messages to API format
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
        employee: m.employee
      }));

      // Call chat API with streaming
      console.log('[DashboardPrimeChat] using endpoint:', CHAT_ENDPOINT);
      
      const payload = {
        userId,
        message: String(inputMessage ?? '').trim(), // avoid empty/undefined
        sessionId: convoId ?? undefined,
        mode: 'balanced' as const,
      };
      
      console.log('[PrimeChat] sending', payload);
      
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('[PrimeChat] resp', response.status, response.headers.get('X-Chat-Backend'));
      
      verifyChatBackend(response);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        try {
          const j = JSON.parse(text);
          throw new Error(`HTTP ${response.status}: ${j.error || text || 'Unknown error'}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${text || 'Unknown error'}`);
        }
      }
      
      const ct = response.headers.get('content-type') || '';
      
      if (ct.includes('text/event-stream')) {
        // --- STREAMING PATH ---
        console.log('[PrimeChat] Streaming response detected');
        
        await readSSEStream(response, {
          onDelta: (chunk) => {
            // Update the assistant bubble with more text
            setMessages(prev => prev.map(m => 
              m.id === assistantId 
                ? { ...m, content: m.content + chunk }
                : m
            ));
          },
          onDone: (fullText) => {
            console.log('[PrimeChat] Stream complete, length:', fullText.length);
            setIsLoading(false);
          },
        });
        
        setInputMessage('');
        return;
      }
      
      // --- JSON FALLBACK PATH ---
      const data = await response.json();
      console.log('[PrimeChat] JSON data', data);
      
      const assistantText =
        (typeof data.reply === 'string' && data.reply) ||
        (typeof data.assistant === 'string' && data.assistant) ||
        (typeof data.echo === 'string' && data.echo) ||
        (typeof data.message === 'string' && data.message) ||
        '';
      
      if (assistantText) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, content: assistantText, employee: data.employee || 'prime-boss' }
            : m
        ));
      } else {
        console.warn('[PrimeChat] JSON response without reply/assistant/echo keys:', data);
      }
      
      setInputMessage('');
      setIsLoading(false);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);

          const dataLine = rawEvent.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;

          try {
            const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));

            if (payload.type === 'employee') {
              // Update employee info
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, employee: payload.employee }
                    : msg
                )
              );
            } else if (payload.type === 'token') {
              // Append token to message
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + payload.token }
                    : msg
                )
              );
            } else if (payload.type === 'note') {
              // Could show notification for PII detection
              console.log('Note:', payload.note);
            } else if (payload.type === 'done') {
              // Stream complete
              console.log('Stream complete');
            }
          } catch (parseErr) {
            console.warn('SSE parse error:', parseErr);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Update message with error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: 'Sorry, there was an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col bg-[#0f172a] border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
      style={{
        width: isMinimized ? '320px' : '420px',
        height: isMinimized ? '60px' : '600px',
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Crown size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Prime AI</h3>
            <p className="text-xs text-white/80">Your AI CEO</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 size={16} className="text-white" />
            ) : (
              <Minimize2 size={16} className="text-white" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Close"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Messages - Hidden when minimized */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && showGreeting && greetingData ? (
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4 space-y-4">
                <PrimeGreeting 
                  greeting={greetingData.greeting} 
                  suggestions={greetingData.suggestions}
                />
                <button
                  onClick={() => setShowGreeting(false)}
                  className="w-full text-xs text-gray-400 hover:text-gray-300 py-2 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-6">
                <Crown className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p className="text-sm font-medium">Welcome to Prime Chat!</p>
                <p className="text-xs mt-1 text-gray-500">
                  I'm your strategic AI CEO. Ask me anything about your finances.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-start gap-2 max-w-[85%]">
                  {message.role === 'assistant' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Crown size={12} className="text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-200 border border-gray-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-[10px] mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={12} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-gray-800 text-gray-300 px-3 py-2 rounded-lg border border-gray-700">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Prime is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-3 bg-[#0f172a] flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Prime anything..."
                className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              ✅ Protected by guardrails • 🔒 PII detection active
            </p>
          </div>
        </>
      )}
    </div>
  );
}

