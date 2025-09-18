import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Loader2,
  BarChart3,
  MessageCircle,
  Users,
  Play,
  Upload,
  CheckCircle
} from 'lucide-react';

// AI Bill Protection Interfaces
interface AIProtectionSpecialist {
  id: string;
  name: string;
  title: string;
  emoji: string;
  specialty: string;
  description: string;
  bio: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'active' | 'working' | 'idle';
  currentTask?: string;
  performance: number;
}

interface ProtectionMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  ai: string;
}

export default function BillRemindersPage() {
  const [selectedAI, setSelectedAI] = useState('chime');
  
  // Chat state
  const [messages, setMessages] = useState<ProtectionMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Protection Team
  const protectionTeam: AIProtectionSpecialist[] = [
    {
      id: 'chime',
      name: 'Chime',
      title: 'AI Bill Guardian & Payment Protection Master',
      emoji: '🔔',
      specialty: '100% Payment Success Rate',
      description: 'Never Miss a Payment',
      bio: 'Your personal AI bill guardian who ensures you never miss a payment again. Chime monitors, reminds, and protects your financial commitments with military precision.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      status: 'active',
      currentTask: 'Monitoring all protected bills',
      performance: 100
    },
    {
      id: 'shield',
      name: 'Shield',
      title: 'Payment Security & Fraud Protection',
      emoji: '🛡️',
      specialty: 'Real-time Security Monitoring',
      description: 'Bulletproof Payment Security',
      bio: 'Works with Chime to protect every payment from fraud and security threats. Shield ensures your financial transactions are always safe and secure.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      status: 'working',
      currentTask: 'Scanning for security threats',
      performance: 98
    },
    {
      id: 'crystal',
      name: 'Crystal',
      title: 'Predictive Bill Analysis & Smart Scheduling',
      emoji: '🔮',
      specialty: 'Future Bill Prediction',
      description: 'Anticipates Your Bills',
      bio: 'Helps Chime predict upcoming bills and optimize payment timing. Crystal uses AI to suggest the best payment strategies for maximum financial efficiency.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      status: 'working',
      currentTask: 'Analyzing payment patterns',
      performance: 95
    },
    {
      id: 'wisdom',
      name: 'Wisdom',
      title: 'Strategic Payment Planning & Optimization',
      emoji: '🧠',
      specialty: 'Payment Strategy Optimization',
      description: 'Maximizes Your Money',
      bio: 'Provides strategic insights to Chime\'s payment system, ensuring optimal cash flow and helping you avoid late fees and penalties.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      status: 'active',
      currentTask: 'Optimizing payment strategies',
      performance: 92
    }
  ];

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ProtectionMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      ai: selectedAI
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const query = content.toLowerCase();
      let aiResponse = '';

      if (selectedAI === 'chime') {
        if (query.includes('upload') || query.includes('statement') || query.includes('bill')) {
          aiResponse = `🔔 **Chime - AI Bill Guardian & Payment Protection Master**

Perfect! I'm excited to help you protect your bills! Here's what my team and I can do:

**🔮 Crystal's Analysis:**
• **Automatic Bill Extraction** - AI reads statements and finds all bills
• **Merchant Recognition** - AI identifies companies and categorizes bills
• **Amount Prediction** - AI predicts bill amounts based on historical data
• **Due Date Learning** - AI learns payment cycles and predicts due dates

**🛡️ Shield's Security:**
• **Fraud Detection** - Real-time monitoring for suspicious activity
• **Payment Verification** - Ensures all payments are legitimate
• **Account Protection** - Secures your financial information
• **Transaction Monitoring** - 24/7 security surveillance

**📄 Supported Statements:**
• Bank statements (PDF, images)
• Credit card statements
• Utility bills and invoices
• Subscription confirmations
• Loan statements

**Upload your statements** and watch me work my protection magic! I'll extract all bill information and set up intelligent reminders!`;
        } else if (query.includes('reminder') || query.includes('alert') || query.includes('notification')) {
          aiResponse = `🔔 **Chime's Smart Reminder System**

I'll send you intelligent, personalized reminders via text and email:

**📱 Smart Text Reminders:**
• "Hey! Your $89.50 electric bill is due in 3 days. I noticed you usually pay on Tuesdays - want me to schedule it for tomorrow?"
• "⚠️ High Priority: Your $1,200 rent is due tomorrow! I've set up auto-pay as backup. You're all protected! 🛡️"
• "Good news! I found a $15.99 Netflix charge on your statement. Want me to set up reminders for next month?"

**📧 Intelligent Email Alerts:**
• Detailed bill information with payment options
• Visual payment calendar with due dates
• Payment history and trend analysis
• Personalized recommendations

**🧠 AI Learning Features:**
• Learns your payment preferences (time of day, day of week)
• Adapts reminder frequency based on your response patterns
• Predicts bill amounts based on seasonal patterns
• Identifies new bills automatically from statements

**Current Protection Status:**
• Bills Protected: 12
• Payment Success Rate: 100%
• Late Fees Prevented: $0
• Protection Level: 95%

Ready to set up your intelligent reminder system?`;
        } else {
          aiResponse = `🔔 **Hey there! I'm Chime, your AI Bill Guardian!**

I'm here to transform your bill management from stress into seamless, intelligent protection with 100% payment success rate.

**My Team and I Can Help With:**
• **Statement Analysis** - Upload statements for automatic bill extraction
• **Smart Reminders** - Intelligent text/email notifications
• **Payment Protection** - 100% success rate guarantee
• **Fraud Security** - Real-time payment monitoring
• **Bill Organization** - Automatic categorization and tracking

**Current Protection Status:**
• Payment Success Rate: 100%
• Late Fees: $0
• Bills Protected: 12
• 24/7 Monitoring: Active

**What would you like to protect first?** Upload a statement or ask me about setting up reminders!`;
        }
      } else if (selectedAI === 'shield') {
        aiResponse = `🛡️ **Shield - Payment Security & Fraud Protection**

Hello! I'm Shield, your payment security specialist. I work with Chime to protect every payment from fraud and security threats.

**My Specialties:**
• **Real-time Security Monitoring** - 24/7 fraud detection
• **Payment Verification** - Ensures all transactions are legitimate
• **Account Protection** - Secures your financial information
• **Transaction Monitoring** - Continuous security surveillance

**Current Security Status:**
• Security Level: 95%
• Threats Detected: 0
• Payments Secured: 12
• Fraud Prevention: 100%

**How I Can Help:**
• Monitor all payment transactions for suspicious activity
• Verify payment authenticity before processing
• Protect your account information from breaches
• Provide real-time security alerts

**Let me keep your payments bulletproof!** 🛡️💪`;
      } else if (selectedAI === 'crystal') {
        aiResponse = `🔮 **Crystal - Predictive Bill Analysis & Smart Scheduling**

Greetings! I'm Crystal, your predictive analysis specialist. I help predict upcoming bills and optimize payment timing using advanced AI.

**My Specialties:**
• **Future Bill Prediction** - Anticipate upcoming bills
• **Smart Scheduling** - Optimize payment timing
• **Pattern Analysis** - Identify payment patterns and trends
• **Amount Forecasting** - Predict bill amounts accurately

**Current Analysis:**
• Bills Analyzed: 12
• Prediction Accuracy: 95%
• Upcoming Bills: 3 identified
• Optimization Opportunities: 2 found

**How I Can Help:**
• Analyze your payment patterns for optimization
• Predict upcoming bills before they arrive
• Suggest optimal payment timing for cash flow
• Identify bills at risk of being missed

**Let me predict and optimize your bill payments!** 🔮✨`;
      } else if (selectedAI === 'wisdom') {
        aiResponse = `🧠 **Wisdom - Strategic Payment Planning & Optimization**

Hello! I'm Wisdom, your strategic planning specialist. I provide strategic insights to maximize your payment efficiency and avoid late fees.

**My Specialties:**
• **Payment Strategy Optimization** - Maximize payment efficiency
• **Cash Flow Planning** - Optimize payment timing
• **Late Fee Prevention** - Strategic payment scheduling
• **Financial Optimization** - Make every payment count

**Current Optimization:**
• Payment Efficiency: 95%
• Late Fees Avoided: $0
• Cash Flow Optimized: 3 strategies active
• Savings Generated: $127 this month

**How I Can Help:**
• Calculate optimal payment strategies
• Plan payment timing for maximum efficiency
• Identify opportunities to avoid late fees
• Create long-term payment plans

**Let me optimize your payment strategy!** 🧠💰`;
      }

      const aiMessage: ProtectionMessage = {
        role: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        ai: selectedAI
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]" ref={messagesEndRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to Chime's Bill Protection Command Center
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
                    >
                      Your AI-powered financial protection system that never sleeps
                    </motion.p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Upload, title: "Smart Upload AI", desc: "Upload and analyze bill statements", color: "from-green-500 to-emerald-500" },
                        { icon: MessageCircle, title: "AI Chat Assistant", desc: "Get personalized bill protection advice", color: "from-blue-500 to-cyan-500" },
                        { icon: CheckCircle, title: "Payment Protection", desc: "100% payment success guarantee", color: "from-purple-500 to-violet-500" },
                        { icon: BarChart3, title: "Bill Analysis", desc: "Analyze your bill patterns", color: "from-red-500 to-pink-500" },
                        { icon: Users, title: "AI Team", desc: "Meet your protection specialists", color: "from-orange-500 to-yellow-500" },
                        { icon: Play, title: "Protection Theater", desc: "Live bill protection scenarios", color: "from-indigo-500 to-purple-500" }
                      ].map((item, index) => (
                        <motion.button
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => sendMessage(`Help me with ${item.title.toLowerCase()}`)}
                          className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-green-500/10"
                        >
                          <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6 text-white" />
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
                      className={`max-w-md px-2 py-1.5 rounded text-left ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'bg-white/10 text-white/90'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {message.role === 'user' ? 'You' : protectionTeam.find(ai => ai.id === message.ai)?.name} • {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-sm">{message.content}</div>
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
                  <div className="bg-white/10 text-white/90 max-w-md px-2 py-1.5 rounded text-left">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Chime is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* High-Tech Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about bill protection, payment reminders, statement analysis..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all text-sm"
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={() => !isLoading && sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="px-2 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
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
    </>
  );
}
