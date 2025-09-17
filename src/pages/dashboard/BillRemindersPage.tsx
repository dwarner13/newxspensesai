import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Loader2,
  BarChart3,
  MessageCircle,
  Users,
  Clock,
  Play,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Home,
  Car,
  Zap
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

interface ProtectionStats {
  paymentSuccess: number;
  lateFees: number;
  billMonitoring: number;
  setupSpeed: number;
  protectionLevel: number;
  billsProtected: number;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: 'protected' | 'pending' | 'overdue';
  protectionLevel: 'high' | 'medium' | 'low';
  aiStrategy: string;
  lastPaid?: string;
  nextDue?: string;
  merchant: string;
  accountNumber: string;
}

interface UploadedStatement {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'error';
  extractedBills?: Bill[];
  uploadedAt: string;
}

export default function BillRemindersPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedAI, setSelectedAI] = useState('chime');
  
  // Chat state
  const [messages, setMessages] = useState<ProtectionMessage[]>([
    {
      role: 'ai',
      content: "🔔 Welcome to AI Bill Protection! I'm Chime, your Bill Guardian, and together with my team (Shield, Crystal, and Wisdom), we transform bill management from stress into seamless, intelligent protection with 100% payment success rate. Upload your statements and watch us protect every payment!",
      timestamp: new Date().toISOString(),
      ai: 'chime'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Protection stats
  const [protectionStats, setProtectionStats] = useState<ProtectionStats>({
    paymentSuccess: 100,
    lateFees: 0,
    billMonitoring: 24,
    setupSpeed: 5,
    protectionLevel: 95,
    billsProtected: 12
  });

  // Bills state
  const [bills] = useState<Bill[]>([
    {
      id: 'rent1',
      name: 'Rent Payment',
      amount: 1200,
      dueDate: '2024-02-01',
      category: 'Housing',
      status: 'protected',
      protectionLevel: 'high',
      aiStrategy: 'Triple Reminder System',
      lastPaid: '2024-01-01',
      nextDue: '2024-02-01',
      merchant: 'Property Management Co',
      accountNumber: '****1234'
    },
    {
      id: 'car1',
      name: 'Car Payment',
      amount: 350,
      dueDate: '2024-02-15',
      category: 'Transportation',
      status: 'protected',
      protectionLevel: 'high',
      aiStrategy: 'Auto-Pay + Smart Reminders',
      lastPaid: '2024-01-15',
      nextDue: '2024-02-15',
      merchant: 'Auto Finance Co',
      accountNumber: '****5678'
    },
    {
      id: 'utility1',
      name: 'Electric Bill',
      amount: 89.50,
      dueDate: '2024-02-20',
      category: 'Utilities',
      status: 'protected',
      protectionLevel: 'medium',
      aiStrategy: 'Smart Budget Billing',
      lastPaid: '2024-01-20',
      nextDue: '2024-02-20',
      merchant: 'Power Company',
      accountNumber: '****9012'
    },
    {
      id: 'subscription1',
      name: 'Netflix Subscription',
      amount: 15.99,
      dueDate: '2024-02-05',
      category: 'Entertainment',
      status: 'protected',
      protectionLevel: 'low',
      aiStrategy: 'Annual Billing + Smart Reminders',
      lastPaid: '2024-01-05',
      nextDue: '2024-02-05',
      merchant: 'Netflix',
      accountNumber: '****3456'
    }
  ]);

  // Upload state
  const [uploadedStatements, setUploadedStatements] = useState<UploadedStatement[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProtectionStats(prev => ({
        ...prev,
        protectionLevel: Math.min(100, prev.protectionLevel + Math.floor(Math.random() * 2)),
        billsProtected: prev.billsProtected + Math.floor(Math.random() * 2)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
• Bills Protected: ${protectionStats.billsProtected}
• Payment Success Rate: ${protectionStats.paymentSuccess}%
• Late Fees Prevented: ${protectionStats.lateFees}
• Protection Level: ${protectionStats.protectionLevel}%

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
• Payment Success Rate: ${protectionStats.paymentSuccess}%
• Late Fees: ${protectionStats.lateFees}
• Bills Protected: ${protectionStats.billsProtected}
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
• Security Level: ${protectionStats.protectionLevel}%
• Threats Detected: 0
• Payments Secured: ${protectionStats.billsProtected}
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
• Bills Analyzed: ${protectionStats.billsProtected}
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
• Payment Efficiency: ${protectionStats.protectionLevel}%
• Late Fees Avoided: ${protectionStats.lateFees}
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

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    
    Array.from(files).forEach((file, index) => {
      const statement: UploadedStatement = {
        id: `stmt-${Date.now()}-${index}`,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'processing',
        uploadedAt: new Date().toISOString()
      };

      setUploadedStatements(prev => [...prev, statement]);

      // Simulate AI processing
      setTimeout(() => {
        setUploadedStatements(prev => prev.map(s => 
          s.id === statement.id 
            ? { 
                ...s, 
                status: 'completed',
                extractedBills: [
                  {
                    id: `bill-${Date.now()}-1`,
                    name: 'Electric Bill',
                    amount: 89.50,
                    dueDate: '2024-02-20',
                    category: 'Utilities',
                    status: 'protected',
                    protectionLevel: 'medium',
                    aiStrategy: 'Smart Budget Billing',
                    merchant: 'Power Company',
                    accountNumber: '****9012'
                  },
                  {
                    id: `bill-${Date.now()}-2`,
                    name: 'Internet Bill',
                    amount: 79.99,
                    dueDate: '2024-02-25',
                    category: 'Utilities',
                    status: 'protected',
                    protectionLevel: 'medium',
                    aiStrategy: 'Auto-Pay + Smart Reminders',
                    merchant: 'Internet Provider',
                    accountNumber: '****3456'
                  }
                ]
              }
            : s
        ));
      }, 2000 + index * 1000);
    });

    setTimeout(() => setIsUploading(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      {/* Header Section */}
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white mb-4"
        >
          Welcome to Chime's Bill Protection Command Center
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/80 text-lg mb-8"
        >
          Your AI-powered financial protection system that never sleeps
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setActiveView('chat')}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto mb-6"
        >
          <MessageCircle size={20} />
          Chat with Chime AI
        </motion.button>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Chime AI Active</span>
          </div>
          <div className="text-white/60">•</div>
          <div className="text-white/60 text-sm">24/7 Protection</div>
          <div className="text-white/60">•</div>
          <div className="text-white/60 text-sm">100% Success Rate</div>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mb-12"
      >
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-white/10">
          {[
            { key: 'overview', label: 'Protection Overview', icon: BarChart3 },
            { key: 'team', label: 'AI Team', icon: Users },
            { key: 'upload', label: 'Upload Statements', icon: Upload },
            { key: 'chat', label: 'AI Chat', icon: MessageCircle }
          ].map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveView(key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                activeView === key
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Overview Section */}
      {activeView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-12"
        >
          {/* Chime AI Performance Stats */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Chime AI Performance</h2>
            <p className="text-white/60">Real-time protection metrics</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-6 border border-green-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={24} className="text-white" />
                </div>
                <span className="text-green-400 text-sm font-semibold">+100%</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Payment Success</h3>
              <p className="text-white/80 text-sm">Never miss a payment again</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl shadow-2xl p-6 border border-red-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <span className="text-red-400 text-sm font-semibold">$0</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Late Fees</h3>
              <p className="text-white/80 text-sm">Eliminated completely</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-6 border border-blue-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock size={24} className="text-white" />
                </div>
                <span className="text-blue-400 text-sm font-semibold">24/7</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Bill Monitoring</h3>
              <p className="text-white/80 text-sm">Always watching</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl shadow-2xl p-6 border border-purple-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Zap size={24} className="text-white" />
                </div>
                <span className="text-purple-400 text-sm font-semibold">5x</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Setup Speed</h3>
              <p className="text-white/80 text-sm">Faster than manual</p>
            </motion.div>
          </div>

          {/* Protected Bills */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Protected Bills</h3>
              <p className="text-white/60">Your bills are under Chime's protection</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {bills.map((bill) => (
                <motion.div 
                  key={bill.id} 
                  whileHover={{ scale: 1.05 }}
                  className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        {bill.category === 'Housing' && <Home className="w-5 h-5 text-blue-400" />}
                        {bill.category === 'Transportation' && <Car className="w-5 h-5 text-green-400" />}
                        {bill.category === 'Utilities' && <Zap className="w-5 h-5 text-yellow-400" />}
                        {bill.category === 'Entertainment' && <CreditCard className="w-5 h-5 text-purple-400" />}
                      </div>
                      <h4 className="text-white font-semibold">{bill.name}</h4>
                    </div>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      bill.status === 'protected' ? 'bg-green-400' :
                      bill.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Amount</span>
                      <span className="text-white font-semibold">${bill.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Due Date</span>
                      <span className="text-white">{bill.dueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Protection</span>
                      <span className={`font-medium ${
                        bill.protectionLevel === 'high' ? 'text-green-400' :
                        bill.protectionLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {bill.protectionLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-400 text-xs font-medium">{bill.aiStrategy}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('upload')}
                className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Statements</span>
              </button>
              <button
                onClick={() => setActiveView('team')}
                className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors"
              >
                <Users className="w-5 h-5" />
                <span>Meet AI Team</span>
              </button>
              <button
                onClick={() => setActiveView('theater')}
                className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Protection Theater</span>
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-3 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat with AI</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Team Section */}
      {activeView === 'team' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Meet Chime's AI Protection Team</h2>
            <p className="text-white/70">Meet the AI specialists who make Chime's bill protection possible with their unique abilities and expertise</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {protectionTeam.map((member) => (
              <div key={member.id} className={`p-6 rounded-xl border ${member.bgColor} ${member.borderColor}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{member.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <p className={`text-sm font-medium ${member.color} mb-2`}>{member.title}</p>
                    <p className="text-white/70 text-sm">{member.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      member.status === 'active' ? 'bg-green-400' :
                      member.status === 'working' ? 'bg-yellow-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-white/70 capitalize">{member.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">{member.description}</p>
                  <p className="text-white/70 text-sm">{member.bio}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Performance</span>
                    <span className={`${member.color} font-medium`}>{member.performance}%</span>
                  </div>
                  {member.currentTask && (
                    <div className="text-xs text-white/60 italic">
                      Currently: {member.currentTask}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Protection Theater Section */}
      {activeView === 'theater' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Live Bill Protection Theater</h2>
            <p className="text-white/70">Experience Chime's magical protection in real-time as he consults with his AI team to safeguard your payments</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Rent Protection',
                emoji: '🏠',
                securityLevel: '100% Secure',
                billAmount: 1200,
                protectionStrategy: 'Triple Reminder System',
                aiStatus: '🛡️ Protected & Monitored',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/20'
              },
              {
                title: 'Car Payment Protection',
                emoji: '🚗',
                securityLevel: '100% Secure',
                billAmount: 350,
                protectionStrategy: 'Auto-Pay + Smart Reminders',
                aiStatus: '🛡️ Protected & Monitored',
                color: 'text-green-400',
                bgColor: 'bg-green-500/20'
              },
              {
                title: 'Utility Protection',
                emoji: '⚡',
                securityLevel: '100% Secure',
                billAmount: 89.50,
                protectionStrategy: 'Smart Budget Billing',
                aiStatus: '🛡️ Protected & Monitored',
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-500/20'
              },
              {
                title: 'Subscription Protection',
                emoji: '📺',
                securityLevel: '100% Secure',
                billAmount: 15.99,
                protectionStrategy: 'Annual Billing + Smart Reminders',
                aiStatus: '🛡️ Protected & Monitored',
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/20'
              }
            ].map((scenario, index) => (
              <div key={`scenario-${index}`} className={`p-6 rounded-xl border ${scenario.bgColor} hover:scale-105 transition-transform cursor-pointer`}>
                <div className="text-center">
                  <div className="text-4xl mb-4">{scenario.emoji}</div>
                  <h3 className={`font-bold text-lg ${scenario.color} mb-4`}>{scenario.title}</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Security Level</span>
                      <span className="text-white font-semibold">{scenario.securityLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Bill Amount</span>
                      <span className="text-white">${scenario.billAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Protection Strategy</span>
                      <span className="text-white text-xs">{scenario.protectionStrategy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">AI Guardian Status</span>
                      <span className="text-green-400 font-semibold">{scenario.aiStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Upload Statements Section */}
      {activeView === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Upload Your Statements</h2>
            <p className="text-white/70">Upload your bank and credit card statements for AI analysis and automatic bill extraction</p>
          </div>

          {/* Upload Area */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Financial Statements</h3>
              <p className="text-white/70 mb-6">Drag & drop your statements, or click to browse</p>
              
              <div
                className="border-2 border-dashed border-white/20 rounded-xl p-8 hover:border-green-500/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-4">📄</div>
                <p className="text-white/70 mb-2">Supported formats: PDF, PNG, JPG</p>
                <p className="text-white/50 text-sm">Bank statements, credit card statements, utility bills</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Choose Files'
                )}
              </button>
            </div>
          </div>

          {/* Uploaded Statements */}
          {uploadedStatements.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Uploaded Statements</h3>
              <div className="space-y-3">
                {uploadedStatements.map((statement) => (
                  <div key={statement.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-white/70" />
                      <div>
                        <p className="text-white font-medium">{statement.name}</p>
                        <p className="text-white/70 text-sm">
                          {statement.status === 'processing' ? 'AI analyzing...' : 
                           statement.status === 'completed' ? 'Bills extracted successfully' : 'Error processing'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statement.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                      {statement.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {statement.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Chat Section */}
      {activeView === 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Chat with Chime's AI Protection Team</h2>
            <p className="text-white/70">Get personalized assistance from our AI specialists</p>
          </div>

          {/* AI Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {protectionTeam.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedAI(member.id)}
                className={`p-4 rounded-xl border transition-all ${
                  selectedAI === member.id
                    ? `${member.bgColor} ${member.borderColor} scale-105`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{member.emoji}</div>
                  <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
                  <p className={`text-sm font-medium ${member.color} mb-2`}>{member.specialty}</p>
                  <p className="text-white/70 text-xs">{member.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Interface */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">{protectionTeam.find(ai => ai.id === selectedAI)?.emoji}</div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  Chat with {protectionTeam.find(ai => ai.id === selectedAI)?.name}
                </h3>
                <p className="text-white/70">
                  {protectionTeam.find(ai => ai.id === selectedAI)?.title}
                </p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
              {messages.filter(msg => msg.ai === selectedAI).map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{protectionTeam.find(ai => ai.id === selectedAI)?.name} is analyzing...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder={`Ask ${protectionTeam.find(ai => ai.id === selectedAI)?.name} about bill protection...`}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
