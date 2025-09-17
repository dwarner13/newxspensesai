import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  Send, 
  Loader2,
  Target,
  Brain,
  Mic,
  Paperclip,
  Upload,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  saveConversation,
  logAIInteraction,
  getRecentConversations
} from '../../lib/ai-employees';

interface FinleyMessage {
  role: 'user' | 'finley' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function AIFinancialAssistantPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<FinleyMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation and load Finley's config
  useEffect(() => {
    const initializeFinley = async () => {
      if (!user?.id) return;

      // Use a persistent conversation ID based on user ID
      const persistentConversationId = `finley-${user.id}`;
      setConversationId(persistentConversationId);

      // Load Finley's configuration
      await getEmployeeConfig('finley');

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'finley', persistentConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as FinleyMessage[]);
      } else {
        // If no conversation with persistent ID, try to get the most recent conversation
        const recentConversations = await getRecentConversations(user.id, 'finley', 1);
        if (recentConversations.length > 0) {
          const recentConversation = recentConversations[0];
          setMessages(recentConversation.messages as FinleyMessage[]);
          setConversationId(recentConversation.conversation_id);
        }
      }
    };

    initializeFinley();
  }, [user?.id]);

  // Handle activity context from sidebar navigation
  useEffect(() => {
    const activityContext = location.state?.activityContext;
    if (activityContext && user?.id) {
      // Auto-send a message about the activity
      const activityMessage = `I see ${activityContext.aiName} was ${activityContext.activityTitle.toLowerCase()} ${activityContext.timestamp}. Can you tell me more about this?`;
      setTimeout(() => {
        sendMessage(activityMessage);
      }, 1000);
    }
  }, [location.state, user?.id]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
      
      // Auto-send message about uploaded files
      const fileNames = newFiles.map(f => f.name).join(', ');
      sendMessage(`I uploaded ${fileNames}`);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !user?.id) return;

    const userMessage: FinleyMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate brilliant, context-aware responses based on XspensesAI features
      let aiResponse: FinleyMessage;
      
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes('hi') || lowerContent.includes('hello') || lowerContent.includes('hey')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `👋 Hi ${userName}! I'm your XspensesAI Financial Assistant. How can I help you today?`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 800,
            tokens_used: 50,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('smart import') || lowerContent.includes('upload') || lowerContent.includes('categorize') || lowerContent.includes('upload document') || lowerContent.includes('process statement')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `Great choice! Byte is our document processing superstar. Let me get them...\n\n*Byte joins the conversation*\n\nByte: "Hey ${userName}! 📄 I'm Byte, and I absolutely love processing documents! I can handle bank statements, receipts, CSV files - you name it. I'm super fast and accurate too. What do you have for me to work on?"`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 120,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('add category') || lowerContent.includes('create category') || lowerContent.includes('new category') || lowerContent.includes('can you add a category')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `Perfect! Tag is our categorization wizard. Let me grab them...\n\n*Tag joins the conversation*\n\nTag: "Hey ${userName}! 🏷️ I heard you want to add a category. I'm all about keeping things organized! What kind of category are you thinking? Something for work expenses, entertainment, or maybe something totally unique?"`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 120,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('smart categories') || lowerContent.includes('categorization')) {
        aiResponse = {
          role: 'finley',
          content: `🧠 **Smart Categories**\n\nAuto-categorizes transactions. Gets smarter over time!`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 800,
            tokens_used: 60,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('transaction') || lowerContent.includes('analysis') || lowerContent.includes('spending')) {
        aiResponse = {
          role: 'finley',
          content: `📊 **Transaction Analysis** reveals the hidden stories in your spending:\n\n• **Trend Analysis**: Spot spending patterns across months and years\n• **Category Breakdown**: See exactly where your money goes\n• **Spending Alerts**: Get notified about unusual transactions\n• **Predictive Insights**: Forecast future spending based on patterns\n\nI can help you dive deep into any specific time period or category. What would you like to analyze?`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1300,
            tokens_used: 170,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('goal') || lowerContent.includes('concierge') || lowerContent.includes('set goal') || lowerContent.includes('financial goal')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `Hey ${userName}! I think Goalie would be perfect for this. Let me get them for you...\n\n*Goalie joins the conversation*\n\nGoalie: "Hey ${userName}! 👋 I heard you're thinking about financial goals. That's awesome! I love helping people turn their dreams into reality. What's on your mind? Are you saving for something specific, or maybe looking to pay off debt?"`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 120,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('receipt') || lowerContent.includes('scan')) {
        aiResponse = {
          role: 'finley',
          content: `📄 **Receipt Processing** makes expense tracking effortless:\n\n• **Instant OCR**: Extract data from any receipt in seconds\n• **Smart Matching**: Automatically match receipts to transactions\n• **Expense Validation**: Verify amounts and categories\n• **Digital Storage**: Never lose a receipt again\n\nJust snap a photo and watch the AI do the rest. It's like having a personal assistant for every purchase!`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1250,
            tokens_used: 165,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('automation') || lowerContent.includes('workflow')) {
        aiResponse = {
          role: 'finley',
          content: `⚡ **Smart Automation** streamlines your financial management:\n\n• **Auto-Categorization**: Set rules for recurring transactions\n• **Bill Reminders**: Never miss a payment again\n• **Budget Alerts**: Get notified when approaching limits\n• **Report Generation**: Automatic weekly and monthly reports\n\nI can help you set up custom automations that work with your specific financial habits. What would you like to automate?`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1350,
            tokens_used: 180,
            model_used: 'gpt-4'
          }
        };
      } else {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
        role: 'finley',
          content: `🤖 Hi ${userName}! I'm your XspensesAI Financial Assistant, and I'm here to help you master your finances!\n\nI can assist you with:\n• **Smart Import AI** - Upload and categorize transactions\n• **Smart Categories** - AI-powered expense insights\n• **Transaction Analysis** - Deep spending analysis\n• **AI Goal Concierge** - Set and track financial goals\n• **Receipt Processing** - Scan and process receipts\n• **Smart Automation** - Automate your workflows\n\nWhat would you like to explore? I'm here to make your financial journey smarter and more efficient!`,
        timestamp: new Date().toISOString(),
        metadata: {
            processing_time_ms: 1500,
            tokens_used: 200,
            model_used: 'gpt-4'
          }
        };
      }

      setMessages(prev => [...prev, aiResponse]);

      // Save conversation
      const conversationMessages = [...messages, userMessage, aiResponse].map(msg => ({
        ...msg,
        role: msg.role === 'finley' ? 'assistant' as const : msg.role
      }));
      await saveConversation(user.id, 'finley', conversationId, conversationMessages);

      // Log interaction
      await logAIInteraction(user.id, 'finley', 'chat', JSON.stringify({
        messageCount: messages.length + 2,
        conversationId
      }));

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-32">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome to XspensesAI Assistant
        </h2>
        <p className="text-white/60 text-sm mb-3">
          Your intelligent guide to mastering expense management and financial insights
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">AI Ready</span>
          </div>
          <div className="text-2xl">🧠</div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Chat Messages Area */}
          <div className="overflow-y-auto p-2 space-y-2 h-[200px]" ref={messagesEndRef}>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-4xl">
                  <p className="text-white/60 text-sm mb-4">Start a conversation with Finley to begin your financial journey</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md px-2 py-1.5 rounded text-left ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className="text-sm leading-tight whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-green-400" />
                      <span className="text-xs text-white/70">AI is analyzing...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Core AI Tools Section - Always Visible */}
          <div className="mt-6">
            <div className="text-center max-w-4xl mx-auto">
              {/* Core AI Tools Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4">CORE AI TOOLS</h3>
                <p className="text-white/60 text-sm mb-6">Essential AI-powered features for your financial journey</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Smart Import AI */}
                  <div className="bg-gradient-to-br from-blue-900/60 to-cyan-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Upload size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Smart Import AI</h3>
                        <p className="text-sm text-white/60">Last Used: 2 hours ago</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendMessage("Help me with Smart Import AI")}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                    >
                      Upload Documents
                    </button>
                  </div>

                  {/* Smart Categories */}
                  <div className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <Brain size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Smart Categories</h3>
                        <p className="text-sm text-white/60">Accuracy: 99.7%</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendMessage("Help me with Smart Categories")}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                      Categorize Expenses
                    </button>
                  </div>

                  {/* Transaction Analysis */}
                  <div className="bg-gradient-to-br from-red-900/60 to-pink-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <BarChart3 size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Transaction Analysis</h3>
                        <p className="text-sm text-white/60">Accuracy: 96%</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendMessage("Help me with Transaction Analysis")}
                      className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-red-600 hover:to-pink-600 transition-all"
                    >
                      Analyze Spending
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Planning & Analysis Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">PLANNING & ANALYSIS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <button
                    onClick={() => sendMessage("Help me with AI Goal Concierge")}
                    className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-1">AI Goal Concierge</h3>
                      <p className="text-white/60 text-xs leading-tight">Set and track financial goals</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendMessage("Help me with Receipt Processing")}
                    className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-1">Receipt Processing</h3>
                      <p className="text-white/60 text-xs leading-tight">Scan and process receipts</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendMessage("Help me with Smart Automation")}
                    className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-1">Smart Automation</h3>
                      <p className="text-white/60 text-xs leading-tight">Automate your workflows</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* High-Tech Input Area */}
          <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-1 bg-white/10 rounded px-2 py-1 text-xs text-white">
                    <span className="truncate max-w-20">{file.name}</span>
                    <button 
                      onClick={() => removeAttachment(index)}
                      className="text-white/60 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about Smart Import AI, Smart Categories..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                    disabled={isLoading}
                  />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-white/60" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                <Mic className="w-3.5 h-3.5 text-white/60" />
              </button>
                  <button
                onClick={() => !isLoading && sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                  >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
                  </button>
                </div>
          </div>
        </div>
      </div>
    </div>
  );
} 