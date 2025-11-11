import React, { useRef, useEffect } from 'react';
import { Send, X, Tag, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePrimeChat } from '../../hooks/usePrimeChat';
import HeaderStrip from '../../components/HeaderStrip';
import SystemStatus from '../../components/SystemStatus';

export default function TagChat() {
  const { user } = useAuth();
  
  // Grade 4 explanation: usePrimeChat hook connects us to the chat server
  // We pass 'tag' to tell it we want to chat with Tag specifically
  const { messages, send, headers, input, setInput, isStreaming } = usePrimeChat(
    user?.id || 'anonymous',
    undefined,
    'tag'
  );
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Grade 4 explanation: Check localStorage for any payload handoff from other pages
  useEffect(() => {
    const payload = localStorage.getItem('tag:payload');
    if (payload) {
      try {
        const data = JSON.parse(payload);
        if (data && typeof data === 'object') {
          send(JSON.stringify(data));
          localStorage.removeItem('tag:payload');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Handle send
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    send(input);
    // input is cleared by hook
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-blue-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Tag AI</h1>
              <p className="text-blue-300 text-sm">Transaction Categorizer</p>
            </div>
          </div>
          <button
            onClick={() => window.close()}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Day 16: System Status Panel */}
        <SystemStatus headers={headers} />
        
        {/* Grade 4 explanation: HeaderStrip shows headers from the server response */}
        <HeaderStrip headers={headers} />
        
        {/* Show if session summary was applied */}
        {headers?.["X-Session-Summary"] && (
          <div className="mb-2 text-xs px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
            Context-Summary (recent) applied
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === 'assistant' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Tag className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.createdAt && (
                      <p className="text-xs opacity-70 mt-2">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <Tag className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Tag is categorizing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
          <div className="flex space-x-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Send JSON rows or describe transactions to categorize..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 border-none outline-none resize-none"
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}







