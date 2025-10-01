import React, { useState, useEffect } from 'react';
import { Heart, X, Send, Sparkles } from 'lucide-react';
import { useAtom } from 'jotai';
import { isTherapistModalOpenAtom, therapistTriggerAtom } from '../../lib/uiStore';
interface TherapistMessage {
  id: string;
  type: 'therapist' | 'user';
  message: string;
  timestamp: Date;
}

const TherapistModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isTherapistModalOpenAtom);
  const [therapistTrigger] = useAtom(therapistTriggerAtom);
  const [messages, setMessages] = useState<TherapistMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Generate context-aware initial message
  const generateInitialMessage = () => {
    const { context } = therapistTrigger;
    
    switch (context.type) {
      case 'category_repeated_edit':
        return `Hey, I noticed you've been adjusting the "${context.category}" category ${context.edits} times. It's totally normal to feel uncertain about categorizing expenses. Want to talk about what's going on?`;
      
      case 'spending_spike':
        return `I see there's been a significant increase in your ${context.category} spending. Big changes in spending patterns can bring up a lot of emotions. How are you feeling about this?`;
      
      case 'time_based':
        return `It's been ${context.daysSinceLastVisit} days since you last checked in with your finances. Sometimes we avoid things when they feel overwhelming. Want to talk about what's been on your mind?`;
      
      case 'mood_based':
        return `I picked up on some stress in your recent activity. Money can be really emotional, and it's okay to feel overwhelmed. Want to unpack what's going on?`;
      
      case 'guilt_pattern':
        return `I notice you've been making some changes that suggest you might be feeling guilty about certain expenses. Guilt around money is very common. Let's talk about it?`;
      
      default:
        return `I'm here to support you with whatever's on your mind about money. What would you like to talk about?`;
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialMessage: TherapistMessage = {
        id: '1',
        type: 'therapist',
        message: generateInitialMessage(),
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }
  }, [isOpen, messages.length, therapistTrigger]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: TherapistMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI therapist response
    setTimeout(() => {
      const therapistResponse = generateTherapistResponse(inputMessage, therapistTrigger.context);
      const therapistMessage: TherapistMessage = {
        id: (Date.now() + 1).toString(),
        type: 'therapist',
        message: therapistResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, therapistMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateTherapistResponse = (userMessage: string, context: any): string => {
    const message = userMessage.toLowerCase();
    
    // Context-aware responses
    if (context.type === 'category_repeated_edit') {
      if (message.includes('unsure') || message.includes('confused')) {
        return "It's completely normal to feel unsure about categorizing expenses. There's no perfect way to do it. What matters most is that you're being mindful about your spending. Can you tell me more about what makes you feel uncertain?";
      }
      if (message.includes('guilt') || message.includes('bad')) {
        return "I hear that guilt coming through. Many people feel guilty about certain types of spending, even when it's reasonable. Let's explore where that guilt might be coming from. What do you think triggers these feelings?";
      }
    }

    if (context.type === 'spending_spike') {
      if (message.includes('stress') || message.includes('worried')) {
        return "It's natural to feel stressed when spending patterns change. Change can be scary, especially with money. Let's talk about what's behind this increase. Is there something specific that's been on your mind?";
      }
    }

    // General therapeutic responses
    if (message.includes('feel bad') || message.includes('guilty')) {
      return "I want you to know that feeling guilty about money is incredibly common. You're not alone in this. Can you tell me more about what's making you feel this way?";
    }

    if (message.includes('overwhelm') || message.includes('stress')) {
      return "Money stress can feel really overwhelming. It's okay to feel this way. Let's break this down together. What's the biggest source of stress for you right now?";
    }

    if (message.includes('don\'t know') || message.includes('confused')) {
      return "It's totally okay to feel confused about money. Financial literacy isn't something we're all taught. Let's work through this together. What would be most helpful for you to understand better?";
    }

    // Default empathetic response
    return "Thank you for sharing that with me. I can hear how you're feeling, and I want you to know that your feelings are valid. Money can bring up a lot of emotions. What would be most helpful for you right now?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-t-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">AI Financial Therapist</h2>
                    <p className="text-pink-100 text-sm">Safe space to talk about money</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-gradient-to-r from-pink-50 to-purple-50 text-gray-800 border border-pink-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.type === 'therapist' && (
                        <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Heart className="w-3 h-3 text-pink-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{message.message}</p>
                        <p className="text-xs opacity-60 mt-2">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center">
                        <Heart className="w-3 h-3 text-pink-600" />
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Share your thoughts and feelings about money..."
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TherapistModal; 