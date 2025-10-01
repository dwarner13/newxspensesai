import React, { useState, useRef, useEffect } from 'react';
import { useAIFinancialAssistant } from '../../contexts/AIFinancialAssistantContext';
import { usePersonalPodcast } from '../../contexts/PersonalPodcastContext';
import { useAudio } from '../../contexts/AudioContext';
import { 
  MessageCircle, 
  Send, 
  Upload, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Music,
  Headphones,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';

export function AIFinancialAssistant() {
  const { 
    state, 
    processStatement, 
    addUserMessage, 
    generateAIResponse,
    suggestAudio,
    suggestPodcast,
    generateDailyBriefing
  } = useAIFinancialAssistant();
  
  const { generateEpisode } = usePersonalPodcast();
  const { playTrack } = useAudio();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.conversationHistory]);

  // Generate daily briefing on first open
  useEffect(() => {
    if (isOpen && state.conversationHistory.length === 0) {
      generateDailyBriefing();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addUserMessage(userMessage);

    // Simulate AI typing
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate AI response
    const aiResponse = await generateAIResponse(userMessage);
    setIsTyping(false);

    // Handle specific commands
    if (userMessage.toLowerCase().includes('upload') || userMessage.toLowerCase().includes('statement')) {
      await processStatement({});
    }

    if (userMessage.toLowerCase().includes('music') || userMessage.toLowerCase().includes('audio')) {
      const audioSuggestion = await suggestAudio('productivity');
      playTrack({
        id: 'ai-suggestion',
        title: audioSuggestion,
        artist: 'AI Recommendation',
        url: '#',
        duration: 180,
      });
    }

    if (userMessage.toLowerCase().includes('podcast')) {
      const podcastSuggestion = await suggestPodcast({});
      // Generate a personal podcast episode
      await generateEpisode('insight');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      addUserMessage(`I just uploaded my ${file.name}`);
      await processStatement({ fileName: file.name});
    }
  };

  const getMessageIcon = (type: 'user' | 'ai') => {
    return type === 'user' ? <User size={16} /> : <Bot size={16} />;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'spending_trend': return <TrendingUp size={16} className="text-blue-500" />;
      case 'budget_alert': return <AlertCircle size={16} className="text-red-500" />;
      case 'goal_progress': return <CheckCircle size={16} className="text-green-500" />;
      case 'achievement': return <Sparkles size={16} className="text-yellow-500" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center justify-center"
          >
            <MessageCircle size={24} />
            {state.insights.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">{state.insights.length}</span>
              </div>
            )}
          </button>
        )}
      

      {/* Chat Window */}
      
        {isOpen && (
          <div
            className={`fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden ${
              isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot size={20} />
                <span className="font-semibold">AI Financial Assistant</span>
                {state.isProcessing && (
                  <div className="flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span className="text-xs opacity-90">Processing...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white opacity-70 hover:opacity-100 transition-opacity"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Processing Status */}
                {state.isProcessing && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {state.currentTask}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        animate={{ width: `${state.processingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Insights Panel */}
                {state.insights.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Recent Insights
                    </h4>
                    <div className="space-y-2">
                      {state.insights.slice(0, 2).map((insight) => (
                        <div
                          key={insight.id}
                          className={`p-2 rounded-lg text-xs ${
                            insight.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                            insight.severity === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                            'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          <div className="flex items-center space-x-1">
                            {getInsightIcon(insight.type)}
                            <span className="font-medium">{insight.title}</span>
                          </div>
                          <p className="mt-1">{insight.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80">
                  
                    {state.conversationHistory.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex items-start space-x-2 max-w-[80%] ${
                            message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            message.type === 'user' 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}>
                            {getMessageIcon(message.type)}
                          </div>
                          <div
                            className={`px-3 py-2 rounded-lg text-sm ${
                              message.type === 'user'
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {message.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div
                      className="flex justify-start"
                    >
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Bot size={12} className="text-gray-500" />
                        </div>
                        <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
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

                {/* Quick Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-2 mb-3">
                    <label className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                      <Upload size={14} />
                      <span>Upload Statement</span>
                      <input
                        type="file"
                        accept=".pdf,.csv,.qfx,.ofx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => suggestAudio('productivity')}
                      className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-500 transition-colors"
                    >
                      <Music size={14} />
                      <span>Music</span>
                    </button>
                    <button
                      onClick={() => suggestPodcast({})}
                      className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 hover:text-purple-500 transition-colors"
                    >
                      <Headphones size={14} />
                      <span>Podcast</span>
                    </button>
                  </div>

                  {/* Input */}
                  <div className="flex items-center space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about your finances..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      
    </>
  );
} 
