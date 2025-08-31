import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import { chatWithBoss, ChatMessage } from '../../lib/boss/openaiClient';
import { BOSS_SYSTEM_PROMPT } from '../../lib/boss/prompt';
import { useBossActions } from '../../lib/boss/actions';
import { BossIntent } from '../../lib/boss/intents';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: {
    intent: string;
    confidence: number;
    cta: string;
    route: string;
  };
}

const EXAMPLE_QUERIES = [
  'Import a bank PDF',
  'Why is a transaction uncategorized?',
  'Start a financial therapy session',
  'Set a savings goal',
  'Predict my spending next month'
];

export default function AIBoss() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { go } = useBossActions();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for OpenAI (include system prompt)
      const openaiMessages: ChatMessage[] = [
        { role: 'system', content: BOSS_SYSTEM_PROMPT },
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: input.trim() }
      ];

      const response = await chatWithBoss(openaiMessages);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        intent: response.intent
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response from Boss');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  const handleIntentAction = (intent: BossIntent) => {
    go(intent);
  };

  return (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="bg-gradient-to-br from-purple-600/10 to-cyan-600/10 border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 p-6 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Boss</h2>
              <p className="text-purple-200">Ask what to do — I'll route you.</p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="p-6">
          {/* Messages */}
          <div className="space-y-4 mb-6 min-h-[200px] max-h-[400px] overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ask me anything about your finances or what you want to do next.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Intent Action Button */}
                  {message.role === 'assistant' && message.intent && message.intent.confidence >= 0.5 && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <button
                        onClick={() => handleIntentAction(message.intent!.intent as BossIntent)}
                        className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-cyan-600 transition-all duration-200 hover:scale-105"
                      >
                        {message.intent.cta}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Boss is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Example Queries */}
          {messages.length === 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="bg-white/5 hover:bg-white/10 border border-white/20 text-white/80 hover:text-white px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask the Boss what you want to do..."
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                rows={2}
                disabled={isLoading}
                aria-label="Ask the AI Boss"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white p-3 rounded-xl hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 flex-shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
