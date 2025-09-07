import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  CreditCard, 
  Send, 
  Loader2,
  Calculator,
  Target,
  Brain,
  Mic,
  Paperclip,
  MoreVertical,
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
  generateConversationId
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
  const [messages, setMessages] = useState<FinleyMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Finley's config
  useEffect(() => {
    const initializeFinley = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Finley's configuration
      await getEmployeeConfig('finley');

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'finley', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as FinleyMessage[]);
      }
    };

    initializeFinley();
  }, [user?.id]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      
      if (lowerContent.includes('smart import') || lowerContent.includes('upload') || lowerContent.includes('categorize')) {
        aiResponse = {
          role: 'finley',
          content: `🚀 **Smart Import AI** is one of our most powerful features! Here's how it works:\n\n• **Automatic Categorization**: Upload your bank statements and watch as AI instantly categorizes every transaction\n• **Pattern Recognition**: Learns from your spending habits to improve accuracy over time\n• **Multi-Format Support**: Works with CSV, PDF, and direct bank connections\n• **Real-time Processing**: Get insights in seconds, not hours\n\nTry uploading a recent statement to see the magic happen! The AI will identify patterns you never noticed before.`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 180,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('smart categories') || lowerContent.includes('categorization')) {
        aiResponse = {
          role: 'finley',
          content: `🧠 **Smart Categories** uses advanced AI to understand your spending patterns:\n\n• **Dynamic Learning**: Gets smarter with every transaction you review\n• **Custom Categories**: Create personalized categories that match your lifestyle\n• **Anomaly Detection**: Flags unusual spending patterns automatically\n• **Visual Insights**: See your spending breakdown in beautiful charts\n\nPro tip: The more you interact with the categorization suggestions, the more accurate they become. It's like having a personal finance expert that never sleeps!`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1100,
            tokens_used: 160,
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
      } else if (lowerContent.includes('goal') || lowerContent.includes('concierge')) {
        aiResponse = {
          role: 'finley',
          content: `🎯 **AI Goal Concierge** is your personal financial coach:\n\n• **Smart Goal Setting**: AI suggests realistic goals based on your income and spending\n• **Progress Tracking**: Monitor your goals with beautiful visualizations\n• **Actionable Insights**: Get specific recommendations to stay on track\n• **Milestone Celebrations**: Celebrate your wins with personalized rewards\n\nWhat financial goal would you like to work on? I can help you create a personalized plan!`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1400,
            tokens_used: 175,
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
        aiResponse = {
        role: 'finley',
          content: `🤖 I'm your XspensesAI Financial Assistant, and I'm here to help you master your finances!\n\nI can assist you with:\n• **Smart Import AI** - Upload and categorize transactions\n• **Smart Categories** - AI-powered expense insights\n• **Transaction Analysis** - Deep spending analysis\n• **AI Goal Concierge** - Set and track financial goals\n• **Receipt Processing** - Scan and process receipts\n• **Smart Automation** - Automate your workflows\n\nWhat would you like to explore? I'm here to make your financial journey smarter and more efficient!`,
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
    <div className="h-full flex flex-col">
      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={messagesEndRef}>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
        <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                  >
                    <Brain className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-white mb-3"
                  >
                    Welcome to XspensesAI Assistant
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/60 text-base mb-6"
                  >
                    Your intelligent guide to mastering expense management and financial insights
                  </motion.p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl mx-auto">
                    {[
                      { icon: Upload, title: "Smart Import AI", desc: "Upload and categorize transactions", color: "from-blue-500 to-cyan-500" },
                      { icon: Brain, title: "Smart Categories", desc: "AI-powered expense insights", color: "from-green-500 to-emerald-500" },
                      { icon: BarChart3, title: "Transaction Analysis", desc: "Deep spending analysis", color: "from-red-500 to-pink-500" },
                      { icon: Target, title: "AI Goal Concierge", desc: "Set and track financial goals", color: "from-purple-500 to-violet-500" },
                      { icon: FileText, title: "Receipt Processing", desc: "Scan and process receipts", color: "from-orange-500 to-yellow-500" },
                      { icon: Zap, title: "Smart Automation", desc: "Automate workflows", color: "from-indigo-500 to-purple-500" }
                    ].map((item, index) => (
                      <motion.button
                        key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => sendMessage(`Help me with ${item.title.toLowerCase()}`)}
                        className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[60px]"
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                          <item.icon className="w-5 h-5 text-white" />
            </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                          <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
            </div>
                      </motion.button>
                    ))}
                  </div>
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
                    className={`max-w-sm px-3 py-2 rounded-lg text-left ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
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

          {/* High-Tech Input Area */}
          <div className="p-6 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about Smart Import AI, Smart Categories, or any XspensesAI feature..."
                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                    disabled={isLoading}
                  />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Paperclip className="w-5 h-5 text-white/60" />
                </button>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <Mic className="w-5 h-5 text-white/60" />
              </button>
                  <button
                onClick={() => !isLoading && sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                className="px-6 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
                  >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
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