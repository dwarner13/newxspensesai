// Enhanced Prime Chat Interface with Learning Integration
import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Crown, Users, Zap, Brain, Target, DollarSign, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AI_EMPLOYEES, getActiveEmployees } from '../../config/ai-employees';
import { AIRouter, ConversationManager, handoffTemplates } from '../../systems/AIEmployeeSystem';
import { AIResponseEngine, AIResponse } from '../../systems/AIResponseEngine';
import AILearningService from '../../services/AILearningService';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  employee?: {
    id: string;
    name: string;
    emoji: string;
    role: string;
  };
  timestamp: string;
  handoff?: {
    from: string;
    to: string;
    reason: string;
  };
  feedback?: {
    type: 'thumbs_up' | 'thumbs_down' | 'rating';
    value?: number;
  };
}

interface EnhancedPrimeChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const EnhancedPrimeChat: React.FC<EnhancedPrimeChatProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState('prime');
  const [suggestedEmployees, setSuggestedEmployees] = useState<string[]>([]);
  const [userPreferences, setUserPreferences] = useState<Record<string, any>>({});
  
  const conversationManager = useRef(new ConversationManager());
  const responseEngine = useRef(new AIResponseEngine());
  const learningService = useRef(new AILearningService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user preferences and conversation history
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        // Load user preferences
        const preferences = await learningService.current.getUserPreferences(user.id, currentEmployee);
        setUserPreferences(preferences);
        
        // Load recent conversation history
        const history = await learningService.current.getConversationHistory(user.id, currentEmployee, 5);
        if (history.length > 0) {
          const historyMessages: ChatMessage[] = history.map(conv => ({
            id: `history-${conv.id}`,
            type: 'ai',
            content: conv.response,
            employee: {
              id: conv.employee_id,
              name: AI_EMPLOYEES[conv.employee_id]?.name || 'Unknown',
              emoji: AI_EMPLOYEES[conv.employee_id]?.emoji || '🤖',
              role: AI_EMPLOYEES[conv.employee_id]?.role || 'AI Assistant'
            },
            timestamp: conv.timestamp
          }));
          setMessages(prev => [...historyMessages, ...prev]);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user, currentEmployee]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with Prime greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingMessage: ChatMessage = {
        id: 'prime-greeting',
        type: 'ai',
        content: `👑 **Welcome! I'm Prime, your AI CEO.**

I've assembled your complete financial team of 30+ specialized AI employees. We're ready to tackle any financial challenge you have.

**What can we accomplish together today?**
• Upload and process documents
• Analyze spending patterns  
• Optimize taxes and deductions
• Create debt payoff strategies
• Set and track financial goals
• And much more!

Just tell me what you need, and I'll connect you with the right expert.`,
        employee: {
          id: 'prime',
          name: 'Prime',
          emoji: '👑',
          role: 'CEO/Orchestrator'
        },
        timestamp: new Date().toISOString()
      };
      setMessages([greetingMessage]);
    }
  }, [isOpen, messages.length]);

  // Handle user message with learning integration
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Get conversation context with user preferences
      const context = {
        ...conversationManager.current.getContext(),
        userPreferences,
        userId: user.id
      };
      
      // Route to appropriate employee(s)
      const router = new AIRouter(context);
      const targetEmployees = router.routeToEmployee(messageContent);
      
      // Generate response from primary employee
      const primaryEmployee = targetEmployees[0];
      const response: AIResponse = await responseEngine.current.generateEmployeeResponse(
        primaryEmployee,
        messageContent,
        context
      );

      // Update current employee
      if (primaryEmployee !== currentEmployee) {
        conversationManager.current.updateCurrentEmployee(primaryEmployee);
        setCurrentEmployee(primaryEmployee);
      }

      // Create AI response message
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: response.message,
        employee: {
          id: response.employee.id,
          name: response.employee.name,
          emoji: response.employee.emoji,
          role: response.employee.role
        },
        timestamp: response.timestamp
      };

      // Store conversation in learning system
      await learningService.current.storeConversation({
        user_id: user.id,
        employee_id: response.employee.id,
        message: messageContent,
        response: response.message,
        handoff_from: currentEmployee !== response.employee.id ? currentEmployee : undefined,
        handoff_to: response.suggestedHandoff,
        handoff_reason: response.suggestedHandoff ? 'specialized analysis' : undefined});

      // Add handoff message if needed
      if (response.suggestedHandoff && response.suggestedHandoff !== primaryEmployee) {
        const handoffEmployee = AI_EMPLOYEES[response.suggestedHandoff];
        const handoffMessage: ChatMessage = {
          id: `handoff-${Date.now()}`,
          type: 'ai',
          content: handoffTemplates.primeToSpecialist(handoffEmployee, 'specialized analysis'),
          employee: {
            id: 'prime',
            name: 'Prime',
            emoji: '👑',
            role: 'CEO/Orchestrator'
          },
          timestamp: new Date().toISOString(),
          handoff: {
            from: 'prime',
            to: response.suggestedHandoff,
            reason: 'specialized analysis'
          }
        };
        
        setMessages(prev => [...prev, handoffMessage, aiMessage]);
        
        // Update to new employee
        conversationManager.current.updateCurrentEmployee(response.suggestedHandoff);
        setCurrentEmployee(response.suggestedHandoff);
        
        // Record handoff
        await learningService.current.recordHandoff({
          from_employee: 'prime',
          to_employee: response.suggestedHandoff,
          reason: 'specialized analysis',
          success: true});
      } else {
        setMessages(prev => [...prev, aiMessage]);
      }

      // Update suggested employees
      if (response.collaborators && response.collaborators.length > 0) {
        setSuggestedEmployees(response.collaborators);
      }

    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: `I apologize, but I encountered an issue processing your request. Let me try a different approach.`,
        employee: {
          id: 'prime',
          name: 'Prime',
          emoji: '👑',
          role: 'CEO/Orchestrator'
        },
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle feedback on AI responses
  const handleFeedback = async (messageId: string, feedbackType: 'thumbs_up' | 'thumbs_down' | 'rating', value?: number) => {
    if (!user) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message || !message.employee) return;
    
    try {
      await learningService.current.storeUserFeedback(
        user.id,
        messageId,
        message.employee.id,
        feedbackType,
        feedbackType === 'rating' ? value?.toString() : undefined,
        value
      );
      
      // Update message with feedback
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, feedback: { type: feedbackType, value } }
          : m
      ));
      
    } catch (error) {
      console.error('Error storing feedback:', error);
    }
  };

  // Quick action buttons
  const quickActions = getActiveEmployees().map(employee => ({
    id: employee.id,
    name: employee.name,
    emoji: employee.emoji,
    role: employee.role,
    color: getEmployeeColor(employee.id)
  }));

  const handleQuickAction = async (employeeId: string) => {
    const employee = AI_EMPLOYEES[employeeId];
    if (!employee) return;

    const message = `I need help with ${employee.role.toLowerCase()}`;
    setInputMessage(message);
    
    // Trigger send after setting message
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  // Get employee color based on department
  const getEmployeeColor = (employeeId: string): string => {
    const colors: Record<string, string> = {
      prime: 'bg-gradient-to-r from-purple-500 to-blue-500',
      byte: 'bg-blue-500',
      crystal: 'bg-purple-500',
      tag: 'bg-green-500',
      ledger: 'bg-yellow-500',
      goalie: 'bg-orange-500',
      blitz: 'bg-red-500'
    };
    return colors[employeeId] || 'bg-gray-500';
  };

  // Employee suggestion component
  const EmployeeSuggestion = ({ employeeId }: { employeeId: string }) => {
    const employee = AI_EMPLOYEES[employeeId];
    if (!employee) return null;

    return (
      <div
        className="bg-gray-800 border border-gray-600 rounded-lg p-3 mb-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{employee.emoji}</span>
          <div>
            <div className="text-sm font-medium text-white">{employee.name}</div>
            <div className="text-xs text-gray-400">{employee.role}</div>
          </div>
          <button
            onClick={() => handleQuickAction(employeeId)}
            className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Connect
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Prime AI Team</h2>
              <p className="text-sm text-gray-400">Your complete financial AI workforce</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current Employee Status */}
        <div className="px-6 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">{AI_EMPLOYEES[currentEmployee]?.emoji}</span>
            <span className="text-white font-medium">{AI_EMPLOYEES[currentEmployee]?.name}</span>
            <span className="text-gray-400 text-sm">is handling your request</span>
            {isProcessing && (
              <div className="ml-auto flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Processing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.type === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                {/* Employee info for AI messages */}
                {message.type === 'ai' && message.employee && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{message.employee.emoji}</span>
                    <span className="text-xs text-gray-400">{message.employee.name}</span>
                    {message.handoff && (
                      <span className="text-xs text-blue-400">
                        → {AI_EMPLOYEES[message.handoff.to]?.name}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Message bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                
                {/* Feedback buttons for AI messages */}
                {message.type === 'ai' && !message.feedback && (
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => handleFeedback(message.id, 'thumbs_up')}
                      className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                      title="Good response"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, 'thumbs_down')}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Poor response"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                {/* Show feedback if given */}
                {message.feedback && (
                  <div className="mt-1">
                    {message.feedback.type === 'thumbs_up' && (
                      <span className="text-green-400 text-xs">👍 Helpful</span>
                    )}
                    {message.feedback.type === 'thumbs_down' && (
                      <span className="text-red-400 text-xs">👎 Not helpful</span>
                    )}
                    {message.feedback.type === 'rating' && (
                      <span className="text-yellow-400 text-xs">
                        ⭐ {message.feedback.value}/5
                      </span>
                    )}
                  </div>
                )}
                
                {/* Timestamp */}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-3 border-t border-gray-700">
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className={`${action.color} hover:opacity-80 text-white px-3 py-2 rounded-lg text-sm transition-opacity flex items-center gap-2 whitespace-nowrap`}
              >
                <span>{action.emoji}</span>
                {action.name}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Suggestions */}
        {suggestedEmployees.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-2">Suggested team members:</div>
            <div className="space-y-2">
              {suggestedEmployees.map((employeeId) => (
                <EmployeeSuggestion key={employeeId} employeeId={employeeId} />
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              multiple
              accept=".pdf,.csv,.xlsx,.jpg,.png,.jpeg"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              title="Upload Documents"
            >
              <Upload className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Prime and the team anything..."
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              disabled={isProcessing}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            Prime coordinates your complete AI financial team • 7 active employees, 23+ coming soon
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPrimeChat;
