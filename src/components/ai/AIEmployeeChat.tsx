/**
 * AI Employee Chat Component
 * 
 * Demonstrates the shared data, specialized AI employee tasks system
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAIEmployees, useAIEmployee, useAICollaboration } from '../../hooks/useAIEmployees';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Users, 
  Brain, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Crown
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  employeeName?: string;
  insights?: string[];
  actions?: string[];
  confidence?: number;
  executionTime?: number;
  timestamp: Date;
  collaboration?: boolean;
}

interface AIEmployeeChatProps {
  userId: string;
  initialEmployee?: string;
}

const AIEmployeeChat: React.FC<AIEmployeeChatProps> = ({ userId, initialEmployee }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(initialEmployee || '');
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    askAIEmployee, 
    isLoading, 
    error, 
    systemStatus,
    getAvailableEmployees,
    getEmployeeCapabilities 
  } = useAIEmployees(userId);

  const { requestComprehensiveReview } = useAICollaboration(userId);

  // Employee configurations
  const employeeConfigs = {
    Tag: { emoji: '🏷️', color: 'from-teal-500 to-cyan-600', description: 'Categorization & Organization' },
    Blitz: { emoji: '⚡', color: 'from-yellow-500 to-orange-600', description: 'Debt Payoff & Strategy' },
    Crystal: { emoji: '🔮', color: 'from-indigo-500 to-blue-600', description: 'Predictions & Forecasting' },
    Fortune: { emoji: '💰', color: 'from-green-500 to-emerald-600', description: 'Budget Reality & Accountability' },
    Goalie: { emoji: '🥅', color: 'from-purple-500 to-pink-600', description: 'Goal Progress & Achievement' },
    Wisdom: { emoji: '🧠', color: 'from-blue-500 to-indigo-600', description: 'Strategic Analysis & Planning' },
    SavageSally: { emoji: '💅', color: 'from-pink-500 to-rose-600', description: 'Reality Checks & Tough Love' },
    Prime: { emoji: '👑', color: 'from-purple-600 to-pink-600', description: 'AI Boss & Coordination' }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'system',
        content: 'Welcome to your AI financial team! I\'m Prime, your AI boss. I can coordinate our specialized employees to help with any financial task. Try asking about categorization, debt payoff, predictions, budgets, goals, or request a comprehensive review!',
        employeeName: 'Prime',
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      let response;
      
      // Check for collaboration requests
      if (input.toLowerCase().includes('comprehensive') || input.toLowerCase().includes('overview')) {
        response = await requestComprehensiveReview(input);
      } else {
        response = await askAIEmployee({
          userInput: input,
          requestedEmployee: selectedEmployee || undefined,
          includeFinancialData: true});
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        employeeName: response.employeeName,
        insights: response.insights,
        actions: response.actions,
        confidence: response.confidence,
        executionTime: response.executionTime,
        timestamp: new Date(),
        collaboration: !!response.collaboration
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getEmployeeConfig = (employeeName: string) => {
    return employeeConfigs[employeeName as keyof typeof employeeConfigs] || {
      emoji: '🤖',
      color: 'from-gray-500 to-slate-600',
      description: 'AI Assistant'
    };
  };

  const availableEmployees = getAvailableEmployees();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Crown size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Financial Team</h2>
              <p className="text-white/70 text-sm">Prime coordinating {availableEmployees.length} specialists</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${systemStatus.dataLoaded ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-white/70 text-sm">
              {systemStatus.dataLoaded ? 'Data Loaded' : 'Loading Data...'}
            </span>
          </div>
        </div>
      </div>

      {/* Employee Selector */}
      <div className="bg-white/5 border-b border-white/10 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowEmployeeSelector(!showEmployeeSelector)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 text-white transition-colors"
          >
            <Users size={16} />
            {selectedEmployee ? (
              <span className="flex items-center gap-2">
                <span className="text-lg">{getEmployeeConfig(selectedEmployee).emoji}</span>
                {selectedEmployee}
              </span>
            ) : (
              'Select Employee'
            )}
          </button>
          
          <button
            onClick={() => requestComprehensiveReview()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 rounded-lg text-white font-semibold transition-all"
          >
            <Sparkles size={16} />
            Full Team Review
          </button>
        </div>

        
          {showEmployeeSelector && (
            <div
              className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2"
            >
              {availableEmployees.map(employee => (
                <button
                  key={employee}
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowEmployeeSelector(false);
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedEmployee === employee
                      ? 'bg-white/20 border-white/40'
                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{getEmployeeConfig(employee).emoji}</div>
                    <div className="text-white font-semibold text-sm">{employee}</div>
                    <div className="text-white/60 text-xs">{getEmployeeConfig(employee).description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type !== 'user' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 bg-gradient-to-r ${getEmployeeConfig(message.employeeName || 'AI').color} rounded-full flex items-center justify-center`}>
                    <span className="text-sm">{getEmployeeConfig(message.employeeName || 'AI').emoji}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{message.employeeName || 'AI'}</div>
                    <div className="text-white/60 text-xs">
                      {message.timestamp.toLocaleTimeString()}
                      {message.confidence && (
                        <span className="ml-2">
                          Confidence: {(message.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {message.executionTime && (
                        <span className="ml-2">
                          <Clock size={12} className="inline mr-1" />
                          {(message.executionTime / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`p-4 rounded-2xl ${
                message.type === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                  : message.type === 'system'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-white/5 text-white border border-white/10'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {message.insights && message.insights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={16} className="text-blue-400" />
                      <span className="text-blue-400 font-semibold text-sm">Insights</span>
                    </div>
                    <ul className="space-y-1">
                      {message.insights.map((insight, index) => (
                        <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                          <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-green-400" />
                      <span className="text-green-400 font-semibold text-sm">Recommended Actions</span>
                    </div>
                    <ul className="space-y-1">
                      {message.actions.map((action, index) => (
                        <li key={index} className="text-white/80 text-sm flex items-start gap-2">
                          <Zap size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div
            className="flex justify-start"
          >
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
              <Loader2 size={20} className="text-white animate-spin" />
              <span className="text-white">AI team is analyzing your request...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask your AI financial team anything..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEmployeeChat;
