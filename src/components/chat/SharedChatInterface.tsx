/**
 * Shared Chat Interface Component
 * 
 * Phase 3.3: Unified chat component for all AI employees
 * 
 * Features:
 * - Real-time streaming (SSE)
 * - Tool execution UI (Phase 3.1)
 * - Handoff context display (Phase 3.2)
 * - Employee-specific branding from registry
 * - Modal or page mode
 * 
 * Usage:
 *   <SharedChatInterface
 *     employeeSlug="prime-boss"
 *     isOpen={isOpen}
 *     onClose={onClose}
 *     mode="modal"
 *   />
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Send, User } from 'lucide-react';
import { useStreamChat } from '../../ui/hooks/useStreamChat';
import { getEmployee } from '../../employees/registry';
import { ToolExecutionList, type ToolCall } from './ToolExecution';
import type { EmployeeProfile } from '../../employees/registry';

interface SharedChatInterfaceProps {
  /** Canonical employee slug (e.g., 'prime-boss', 'crystal-ai') */
  employeeSlug: string;
  
  /** Whether chat is open (for modal mode) */
  isOpen?: boolean;
  
  /** Close handler (for modal mode) */
  onClose?: () => void;
  
  /** Display mode: 'modal' (overlay) or 'page' (full page) */
  mode?: 'modal' | 'page';
  
  /** Optional customizations (overrides registry data) */
  customizations?: {
    emoji?: string;
    title?: string;
    subtitle?: string;
    welcomeMessage?: string;
    placeholder?: string;
    colors?: {
      primary?: string;
      background?: string;
    };
  };
  
  /** Session ID for conversation continuity */
  sessionId?: string;
  
  /** Custom className for container */
  className?: string;
}

export const SharedChatInterface: React.FC<SharedChatInterfaceProps> = ({
  employeeSlug,
  isOpen = true,
  onClose,
  mode = 'modal',
  customizations,
  sessionId,
  className = '',
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load employee data from registry
  useEffect(() => {
    async function loadEmployee() {
      try {
        const emp = await getEmployee(employeeSlug);
        setEmployeeData(emp);
      } catch (error) {
        console.error(`[SharedChatInterface] Failed to load employee ${employeeSlug}:`, error);
      } finally {
        setIsLoadingEmployee(false);
      }
    }
    loadEmployee();
  }, [employeeSlug]);

  // Use streaming chat hook
  const {
    messages,
    isStreaming,
    error,
    isToolExecuting,
    currentTool,
    activeEmployeeSlug,
    sendMessage,
    clearMessages,
  } = useStreamChat({
    employeeSlug,
    conversationId: sessionId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = async () => {
    if (!inputMessage.trim() || isStreaming) return;
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

  // Get employee branding (from registry or customizations)
  const emoji = customizations?.emoji || employeeData?.emoji || '🤖';
  const title = customizations?.title || employeeData?.title || 'AI Assistant';
  const subtitle = customizations?.subtitle || (employeeData ? `${employeeData.title} — ${employeeData.capabilities.join(', ')}` : '');
  const welcomeMessage = customizations?.welcomeMessage || `Hello! I'm ${title}. How can I help you today?`;
  const placeholder = customizations?.placeholder || `Ask ${title} anything...`;
  
  // Color scheme (defaults based on employee slug)
  const getColorScheme = () => {
    if (customizations?.colors) {
      return customizations.colors;
    }
    
    // Default color schemes by employee
    const schemes: Record<string, { primary: string; background: string }> = {
      'prime-boss': { primary: 'from-purple-600 to-blue-600', background: 'from-purple-50 to-blue-50' },
      'byte-docs': { primary: 'from-blue-600 to-purple-600', background: 'from-blue-50 to-purple-50' },
      'tag-ai': { primary: 'from-teal-600 to-cyan-600', background: 'from-teal-50 to-cyan-50' },
      'crystal-ai': { primary: 'from-indigo-600 to-purple-600', background: 'from-indigo-50 to-purple-50' },
      'finley-ai': { primary: 'from-green-600 to-emerald-600', background: 'from-green-50 to-emerald-50' },
      'goalie-ai': { primary: 'from-purple-600 to-pink-600', background: 'from-purple-50 to-pink-50' },
      'liberty-ai': { primary: 'from-blue-600 to-indigo-600', background: 'from-blue-50 to-indigo-50' },
      'chime-ai': { primary: 'from-yellow-600 to-orange-600', background: 'from-yellow-50 to-orange-50' },
      'blitz-ai': { primary: 'from-orange-600 to-red-600', background: 'from-orange-50 to-red-50' },
      'ledger-tax': { primary: 'from-gray-600 to-slate-600', background: 'from-gray-50 to-slate-50' },
    };
    
    return schemes[employeeSlug] || { primary: 'from-gray-600 to-slate-600', background: 'from-gray-50 to-slate-50' };
  };

  const colors = getColorScheme();

  // Don't render if modal mode and not open
  if (mode === 'modal' && !isOpen) return null;

  // Loading state while fetching employee data
  if (isLoadingEmployee) {
    return (
      <div className={`${mode === 'modal' ? 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center' : ''} ${className}`}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
          <span className="text-gray-600">Loading {title}...</span>
        </div>
      </div>
    );
  }

  // Modal container
  const Container = mode === 'modal' ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[700px] flex flex-col ${className}`}>
        {renderContent()}
      </div>
    </div>
  ) : (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {renderContent()}
    </div>
  );

  function renderContent() {
    return (
      <>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r ${colors.background}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${colors.primary} rounded-full flex items-center justify-center`}>
              <span className="text-2xl">{emoji}</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
              {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {sessionId && (
              <span className="text-xs text-gray-400 font-mono">
                Session: {sessionId.substring(0, 8)}...
              </span>
            )}
            {mode === 'modal' && onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`w-20 h-20 bg-gradient-to-br ${colors.primary} rounded-full flex items-center justify-center mb-4`}>
                <span className="text-4xl">{emoji}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {welcomeMessage}
              </h3>
              {employeeData?.capabilities && employeeData.capabilities.length > 0 && (
                <div className="grid grid-cols-2 gap-3 max-w-lg text-sm text-left mt-4">
                  {employeeData.capabilities.slice(0, 4).map((cap, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${colors.background} p-3 rounded-lg border border-gray-200`}>
                      <div className="font-semibold text-gray-900 capitalize">{cap.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gray-200'
                      : `bg-gradient-to-br ${colors.primary}`
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-gray-600" />
                  ) : (
                    <span className="text-lg">{emoji}</span>
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-5 py-3 ${
                    message.role === 'user'
                      ? `bg-gradient-to-br ${colors.primary} text-white`
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  
                  {/* Phase 3.1: Tool execution UI */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300/50">
                      <ToolExecutionList 
                        toolCalls={message.toolCalls.map((tc) => ({
                          id: tc.id,
                          name: tc.name,
                          status: tc.status,
                          result: tc.result,
                          error: tc.error,
                        }))}
                      />
                    </div>
                  )}
                  
                  <p className="text-[10px] mt-2 opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                    {message.processingTime && (
                      <span className="ml-2">({(message.processingTime / 1000).toFixed(1)}s)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className={`flex items-center space-x-2 bg-gradient-to-r ${colors.background} rounded-2xl px-5 py-3 border border-gray-200`}>
                <Loader2 className={`w-4 h-4 animate-spin ${colors.primary.includes('purple') ? 'text-purple-600' : 'text-gray-600'}`} />
                <span className="text-sm text-gray-900 font-medium">
                  {title} is thinking{isToolExecuting && currentTool ? ` (using ${currentTool})` : ''}...
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                ⚠️ {error.message}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                disabled={isStreaming}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isStreaming}
              className={`px-6 py-3 bg-gradient-to-r ${colors.primary} text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg`}
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Footer info */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>💡 Powered by centralized chat runtime</span>
            {sessionId && (
              <span className="font-mono">Session: {sessionId.substring(0, 12)}...</span>
            )}
            {activeEmployeeSlug !== employeeSlug && (
              <span className="text-purple-600">🔄 Active: {activeEmployeeSlug}</span>
            )}
          </div>
        </div>
      </>
    );
  }

  return Container;
};

export default SharedChatInterface;



