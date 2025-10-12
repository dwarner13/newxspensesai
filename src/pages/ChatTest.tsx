import React, { useState } from 'react';
import { sendChat } from '../services/chatApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  employee?: string;
}

export default function ChatTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState('prime');

  // TODO: Replace with real auth
  const userId = 'test-user-uuid-replace-with-auth';

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Use the new chat API with real AI
      const { text: reply, employee } = await sendChat({
        userId,
        message: messageText,
        mock: false  // Set to true to test without using AI credits
      });

      setCurrentEmployee(employee);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
        employee
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback response
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again!",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
          <div className="bg-gray-700 text-white p-3 border-b border-gray-600">
            <h1 className="text-lg font-bold">Chat Test - Real AI</h1>
            <p className="text-gray-300 text-sm">
              Current: <span className="font-semibold text-blue-300">{currentEmployee}</span>
            </p>
          </div>
          
          <div className="h-64 overflow-y-auto p-3 space-y-3 bg-gray-800">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-6">
                <p className="text-sm">Start chatting with Real AI!</p>
                <p className="text-xs mt-1 text-gray-500">
                  Try: "Help me categorize expenses" or "Show me my receipts"
                </p>
                <p className="text-xs mt-2 text-yellow-400">
                  ⚡ Using real OpenAI GPT-4o-mini
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-200 border border-gray-600'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-600">
                  <p className="text-sm">
                    <span className="inline-block animate-pulse">🤖</span> {currentEmployee} is thinking...
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-600 p-3 bg-gray-800">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}