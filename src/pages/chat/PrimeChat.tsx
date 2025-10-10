/**
 * Prime Chat Page - Central AI Hub
 * =================================
 * All user interactions start here. Prime delegates to specialists as needed.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Crown, User, Loader2, Sparkles, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PrimeChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputMessage, setInputMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  // Use centralized chat hook with Prime
  const {
    messages,
    sessionId,
    isLoading,
    error,
    sendMessage,
    createOrUseSession,
  } = useChat({
    employeeSlug: 'prime-boss',
    apiEndpoint: '/.netlify/functions/chat',
  });

  // Initialize Prime session on mount
  useEffect(() => {
    createOrUseSession('prime-boss');
  }, [createOrUseSession]);

  // Auto-send message from query param ?m=...
  useEffect(() => {
    const autoMessage = searchParams.get('m');
    if (autoMessage && !autoSentRef.current && !isLoading && sessionId) {
      autoSentRef.current = true;
      sendMessage(decodeURIComponent(autoMessage));
    }
  }, [searchParams, sendMessage, isLoading, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    await sendMessage(inputMessage);
    setInputMessage('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick action suggestions
  const quickActions = [
    {
      label: '📄 Import Documents',
      message: 'Prime, ask Byte (byte-doc) to import my latest statements and receipts. Then summarize what you found.',
    },
    {
      label: '🏷️ Categorize Transactions',
      message: 'Prime, ask Tag (tag-ai) to categorize October transactions and show the top categories.',
    },
    {
      label: '💰 Tax Review',
      message: 'Prime, ask Ledger (ledger-tax) to flag potential October tax-deductible items and summarize safely.',
    },
    {
      label: '🔮 Spending Forecast',
      message: 'Prime, ask Crystal (crystal-analytics) to forecast next month\'s spending and explain the two biggest drivers.',
    },
  ];

  const handleQuickAction = (message: string) => {
    setInputMessage(message);
    setShowHelp(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Prime</h1>
                <p className="text-sm text-gray-600">CEO & Strategic Orchestrator</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {sessionId && (
                <div className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1 rounded-lg">
                  Session: {sessionId.substring(0, 8)}...
                </div>
              )}
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Welcome Message */}
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Crown className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                👑 Welcome! I'm Prime
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Your strategic AI CEO coordinating 30+ specialized employees.
                I understand your needs and delegate to the right experts automatically.
              </p>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.message)}
                    className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-purple-300 hover:shadow-md transition-all"
                  >
                    <div className="font-semibold text-gray-900 mb-1">{action.label}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{action.message}</div>
                  </button>
                ))}
              </div>

              {/* Help Text */}
              <div className="mt-8 text-sm text-gray-500">
                💡 Tip: Just tell me what you need. I'll coordinate with the right specialists.
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-3 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                    message.role === 'user'
                      ? 'bg-gray-200'
                      : 'bg-gradient-to-br from-purple-600 to-blue-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-gray-600" />
                  ) : (
                    <Crown className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-5 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {/* Tool Calls */}
                  {message.metadata?.tool_calls && message.metadata.tool_calls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300/30">
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        <Sparkles className="w-3 h-3" />
                        <span>
                          Coordinating with:{' '}
                          {message.metadata.tool_calls.map((tc: any) => tc.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] mt-2 opacity-60">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3 bg-white rounded-2xl px-5 py-3 border border-purple-200 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-purple-900 font-medium">
                  Prime is coordinating your request...
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Error</div>
                  <div>{error.message}</div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Help Suggestions */}
          {showHelp && (
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-900 text-sm">Quick Actions</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.message)}
                    className="text-left text-xs bg-white rounded-lg px-3 py-2 hover:bg-purple-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{action.label}</div>
                    <div className="text-gray-600 line-clamp-1">{action.message}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="flex items-end space-x-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
              title="Show quick actions"
            >
              <ChevronDown
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  showHelp ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Prime anything... (I'll coordinate with specialists automatically)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>👑 Powered by centralized AI runtime</span>
            {sessionId && (
              <span className="font-mono">Session: {sessionId.substring(0, 12)}...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

