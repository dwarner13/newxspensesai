/**
 * Universal AI Employee Chat Component
 * 
 * Updated to work with the universal AI employee system
 * Supports all 30 AI employees with personality-driven responses
 */

import React, { useState, useEffect, useRef } from 'react';
import { universalAIEmployeeManager } from '../../lib/universalAIEmployeeConnection';

interface Message {
  id: string;
  employee: string;
  name: string;
  message: string;
  timestamp: Date;
  actions?: string[];
  personality?: string;
  specialty?: string;
  isUser: boolean;
}

interface UniversalAIEmployeeChatProps {
  initialEmployeeId?: string;
  onEmployeeChange?: (employeeId: string) => void;
  className?: string;
}

export const UniversalAIEmployeeChat: React.FC<UniversalAIEmployeeChatProps> = ({
  initialEmployeeId = 'prime',
  onEmployeeChange,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(initialEmployeeId);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load available employees
    const employees = universalAIEmployeeManager.getAllEmployees();
    setAvailableEmployees(employees);
    
    // Set initial employee
    if (initialEmployeeId) {
      setCurrentEmployee(initialEmployeeId);
      onEmployeeChange?.(initialEmployeeId);
    }
  }, [initialEmployeeId, onEmployeeChange]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEmployeeChange = (employeeId: string) => {
    setCurrentEmployee(employeeId);
    onEmployeeChange?.(employeeId);
    setShowEmployeeSelector(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      employee: 'user',
      name: 'You',
      message: inputMessage,
      timestamp: new Date(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await universalAIEmployeeManager.chatWithEmployee(
        currentEmployee,
        inputMessage,
        {
          user_id: 'current-user', // TODO: Get from auth context
          sessionId: 'current-session'
        }
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        employee: response.employee,
        name: response.name,
        message: response.response,
        timestamp: new Date(),
        actions: response.actions,
        personality: response.personality,
        specialty: response.specialty,
        isUser: false
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        employee: currentEmployee,
        name: 'System',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    const employee = universalAIEmployeeManager.getEmployee(currentEmployee);
    employee?.clearHistory();
  };

  const getEmployeeInfo = (employeeId: string) => {
    return availableEmployees.find(emp => emp.id === employeeId);
  };

  const currentEmployeeInfo = getEmployeeInfo(currentEmployee);

  return (
    <div className={`universal-ai-employee-chat ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowEmployeeSelector(!showEmployeeSelector)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {currentEmployeeInfo?.name?.charAt(0) || 'A'}
                </div>
                <div className="text-left">
                  <div className="font-medium">{currentEmployeeInfo?.name || 'AI Employee'}</div>
                  <div className="text-xs text-blue-600">{currentEmployeeInfo?.specialty || 'Assistant'}</div>
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Employee Selector Dropdown */}
              {showEmployeeSelector && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">Choose AI Employee</h3>
                    <p className="text-sm text-gray-500">Select an AI employee to chat with</p>
                  </div>
                  <div className="p-2">
                    {availableEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        onClick={() => handleEmployeeChange(employee.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                          employee.id === currentEmployee ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                          {employee.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.specialty}</div>
                          <div className="text-xs text-gray-500 mt-1">{employee.personality}</div>
                        </div>
                        {employee.id === currentEmployee && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chat with {currentEmployeeInfo?.name || 'AI Employee'}
            </h3>
            <p className="text-gray-600 mb-4">
              {currentEmployeeInfo?.personality || 'Your AI financial assistant is ready to help!'}
            </p>
            <div className="text-sm text-gray-500">
              <p>Specialty: {currentEmployeeInfo?.specialty || 'General assistance'}</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {!message.isUser && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {message.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-gray-600">{message.name}</span>
                </div>
              )}
              
              <div className="text-sm whitespace-pre-wrap">{message.message}</div>
              
              {message.actions && message.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.actions.map((action, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {action.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              
              <div className={`text-xs mt-1 ${
                message.isUser ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {currentEmployeeInfo?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${currentEmployeeInfo?.name || 'AI Employee'}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalAIEmployeeChat;
