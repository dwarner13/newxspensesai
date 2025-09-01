import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  Bot, 
  Send, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Repeat,
  Zap,
  Shield,
  Target,
  TrendingUp,
  Settings
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  saveConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId,
  createSystemMessage,
  createUserMessage,
  createAssistantMessage
} from '../../lib/ai-employees';
import { AIConversationMessage } from '../../types/ai-employees.types';

interface ChimeMessage {
  role: 'user' | 'chime' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function BillRemindersPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChimeMessage[]>([
    {
      role: 'chime',
      content: "Hi! I'm 🔔 Chime, your Bill Reminder specialist! I help you track bills, set up payment reminders, and ensure you never miss a due date. I can help you organize your bills, set up automation, manage payment schedules, and avoid late fees. What would you like to know about bill management today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [chimeConfig, setChimeConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Chime's config
  useEffect(() => {
    const initializeChime = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Chime's configuration
      const config = await getEmployeeConfig('chime');
      setChimeConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'chime', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as ChimeMessage[]);
      }
    };

    initializeChime();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: ChimeMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'chime', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'chime', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Chime's response based on the user's query
      const chimeResponse = await generateChimeResponse(content);

      const processingTime = Date.now() - startTime;

      const chimeMessage: ChimeMessage = {
        role: 'chime',
        content: chimeResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, chimeMessage]);

      // Save Chime's response to conversation
      await addMessageToConversation(user.id, 'chime', conversationId, chimeMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'chime');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChimeMessage = {
        role: 'chime',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateChimeResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Chime's specialized responses for bill-related queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 🔔 I'm Chime, your Bill Reminders AI. Great to see you! I'm here to help you manage all your bills, set up smart reminders, avoid late fees, and keep your payments organized and on time. What bill management would you like to work on today?`;
    }
    
    if (query.includes('bill') || query.includes('payment') || query.includes('reminder') || query.includes('due')) {
      return `🔔 Excellent! Let's talk about bill management and reminders. Here's my comprehensive approach:

**My Bill Management System:**

**1. Bill Organization:**
• **Centralized tracking** - All bills in one place
• **Due date calendar** - Visual timeline of all payments
• **Payment history** - Track what's been paid and when
• **Amount tracking** - Monitor bill amounts and changes
• **Category organization** - Group bills by type (utilities, credit cards, etc.)

**2. Smart Reminders:**
• **Early warnings** - 7-14 days before due date
• **Due date alerts** - Day of payment reminder
• **Late payment warnings** - If payment is overdue
• **Amount changes** - Alert when bills increase
• **Payment confirmations** - Verify payments were received

**3. Payment Strategies:**
• **Auto-pay setup** - Automatic payments for consistent bills
• **Manual reminders** - For variable amounts
• **Payment scheduling** - Set up payments in advance
• **Multiple payment methods** - Backup options for reliability
• **Payment tracking** - Confirm payments are processed

**4. Bill Categories:**
• **Essential bills** - Rent, utilities, insurance (never miss)
• **Credit payments** - Cards, loans (affect credit score)
• **Subscription services** - Streaming, memberships
• **Variable bills** - Utilities, phone (amounts change)
• **Annual bills** - Insurance, taxes, memberships

**Pro Tips:**
• **Set up auto-pay** for bills with consistent amounts
• **Use calendar reminders** for variable bills
• **Check bills monthly** for errors or changes
• **Keep payment records** for tax and dispute purposes

Would you like me to help you set up a bill tracking system?`;
    }

    if (query.includes('automate') || query.includes('auto-pay') || query.includes('automatic') || query.includes('setup')) {
      return `⚙️ Fantastic! Automating your bill payments is one of the best ways to ensure you never miss a payment. Let me help you set up a smart automation system.

**Bill Automation Setup:**

**1. Auto-Pay Priority System:**
• **High Priority** - Rent, mortgage, car payments (never miss)
• **Medium Priority** - Utilities, insurance, phone (affect credit)
• **Low Priority** - Subscriptions, memberships (can be delayed)

**2. What to Automate:**
• **Fixed amounts** - Rent, mortgage, car payments, insurance
• **Minimum payments** - Credit cards (pay minimum automatically)
• **Regular subscriptions** - Streaming, gym, software services
• **Utility bills** - Set up auto-pay with buffer for variable amounts

**3. What to Monitor Manually:**
• **Variable utility bills** - Check amounts before paying
• **Credit card statements** - Review charges before payment
• **Annual bills** - Insurance, taxes, memberships
• **New bills** - Until you understand the pattern

**4. Automation Best Practices:**
• **Use credit cards** - Better protection and rewards
• **Set up alerts** - Get notified before payments process
• **Maintain buffer** - Keep extra funds for variable bills
• **Review monthly** - Check all automated payments
• **Have backup** - Alternative payment methods ready

**5. Setup Process:**
1. **List all bills** - Current amounts and due dates
2. **Categorize** - Fixed vs. variable amounts
3. **Set up auto-pay** - Start with fixed amounts
4. **Set reminders** - For manual payments
5. **Test system** - Verify payments are working
6. **Monitor** - Check for errors or changes

**Pro Tips:**
• **Start small** - Automate 2-3 bills first
• **Use calendar** - Set reminders for manual payments
• **Check accounts** - Verify payments are processed
• **Keep records** - Save payment confirmations

What bills would you like to automate first?`;
    }

    if (query.includes('late') || query.includes('miss') || query.includes('overdue') || query.includes('fee')) {
      return `⚠️ Don't worry! Late payments happen to everyone, and I'm here to help you get back on track and prevent future issues.

**Handling Late Payments:**

**Immediate Actions:**
• **Pay immediately** - Even if late, pay as soon as possible
• **Contact creditor** - Call and explain the situation
• **Request forgiveness** - Ask to waive late fees
• **Set up auto-pay** - Prevent future late payments
• **Update reminders** - Improve your reminder system

**Late Fee Negotiation:**
• **Be polite** - Explain your situation calmly
• **Show history** - Demonstrate good payment history
• **Request goodwill** - Ask for one-time fee waiver
• **Offer payment** - Pay the late fee if they won't waive it
• **Get confirmation** - Document any agreements

**Preventing Future Late Payments:**

**1. Multiple Reminder System:**
• **Calendar alerts** - 7, 3, and 1 day before due
• **Phone reminders** - Set up recurring alarms
• **Email notifications** - From billers and your bank
• **App notifications** - Use bill tracking apps
• **Backup reminders** - Ask trusted person to remind you

**2. Payment Buffer Strategy:**
• **Early payments** - Pay bills 3-5 days before due date
• **Buffer account** - Keep extra funds for emergencies
• **Multiple payment methods** - Credit card, bank transfer, check
• **Payment scheduling** - Set up payments in advance
• **Automatic minimums** - Ensure minimum payments are covered

**3. Organization System:**
• **Bill calendar** - Visual timeline of all due dates
• **Payment checklist** - Mark off payments as made
• **Receipt filing** - Save payment confirmations
• **Regular reviews** - Check bill status weekly
• **Annual audit** - Review all bills and payments

**Pro Tips:**
• **Set up auto-pay** for bills with consistent amounts
• **Use calendar reminders** for variable bills
• **Pay early** to avoid last-minute issues
• **Keep payment records** for disputes

What specific late payment situation are you dealing with?`;
    }

    if (query.includes('track') || query.includes('organize') || query.includes('manage') || query.includes('system')) {
      return `📊 Great question! A good bill tracking system is the foundation of successful bill management. Let me help you create an organized system.

**Bill Tracking System Setup:**

**1. Centralized Bill Hub:**
• **Digital calendar** - All due dates in one place
• **Spreadsheet tracker** - Bill amounts, due dates, payment status
• **Bill management app** - Dedicated app for tracking
• **Email folder** - Organize bill emails
• **Physical folder** - For paper bills and receipts

**2. Bill Information to Track:**
• **Bill name** - Company and account number
• **Due date** - When payment is due
• **Amount** - Current and previous amounts
• **Payment method** - How you pay (auto-pay, manual, etc.)
• **Payment status** - Paid, pending, overdue
• **Contact info** - Phone, website, account number
• **Notes** - Special instructions or changes

**3. Tracking Categories:**
• **Essential bills** - Housing, utilities, insurance
• **Credit payments** - Cards, loans, lines of credit
• **Subscription services** - Streaming, software, memberships
• **Variable bills** - Utilities, phone, medical
• **Annual bills** - Insurance, taxes, memberships
• **One-time bills** - Medical, repairs, special expenses

**4. Monthly Bill Review Process:**
• **Week 1** - Review all bills due this month
• **Week 2** - Pay early bills and set up payments
• **Week 3** - Check payment confirmations
• **Week 4** - Plan for next month's bills

**5. Digital Tools:**
• **Bill tracking apps** - Mint, YNAB, Personal Capital
• **Calendar apps** - Google Calendar, Outlook
• **Spreadsheet** - Excel, Google Sheets
• **Reminder apps** - Todoist, Remember the Milk
• **Banking apps** - Set up bill pay features

**Pro Tips:**
• **Color code** - Different colors for different bill types
• **Set reminders** - Multiple reminders for important bills
• **Review regularly** - Check your system weekly
• **Update immediately** - When bills or amounts change
• **Backup system** - Have a backup tracking method

Would you like me to help you set up a specific tracking system?`;
    }

    if (query.includes('budget') || query.includes('plan') || query.includes('schedule') || query.includes('timeline')) {
      return `📅 Excellent! Bill budgeting and scheduling is crucial for financial stability. Let me help you create a comprehensive bill management plan.

**Bill Budgeting & Scheduling:**

**1. Monthly Bill Calendar:**
• **Week 1** - Rent/mortgage, major bills
• **Week 2** - Utilities, insurance payments
• **Week 3** - Credit card payments, subscriptions
• **Week 4** - Variable bills, catch-up payments

**2. Bill Budget Categories:**
• **Fixed expenses** - Rent, insurance, subscriptions (predictable)
• **Variable expenses** - Utilities, phone, gas (fluctuate)
• **Annual expenses** - Insurance, taxes, memberships (plan ahead)
• **Emergency fund** - Buffer for unexpected bills

**3. Payment Scheduling Strategies:**

**Bi-Weekly Paycheck Strategy:**
• **Paycheck 1** - Rent, major bills, half of variable bills
• **Paycheck 2** - Remaining bills, savings, discretionary spending

**Weekly Payment Strategy:**
• **Week 1** - Housing and insurance
• **Week 2** - Utilities and phone
• **Week 3** - Credit cards and subscriptions
• **Week 4** - Variable bills and savings

**4. Bill Planning Tools:**
• **Bill calendar** - Visual timeline of all payments
• **Payment schedule** - When each bill gets paid
• **Budget spreadsheet** - Track income vs. bill expenses
• **Savings goals** - Emergency fund for unexpected bills
• **Payment automation** - Set up automatic payments

**5. Seasonal Bill Planning:**
• **Winter** - Higher utility bills (heating)
• **Summer** - Higher utility bills (cooling)
• **Fall** - Annual insurance renewals
• **Spring** - Tax payments, annual memberships

**Pro Tips:**
• **Pay bills when you get paid** - Don't wait until due date
• **Set up sinking funds** - Save monthly for annual bills
• **Use calendar reminders** - Multiple alerts for important bills
• **Review and adjust** - Update schedule as income or bills change
• **Plan for emergencies** - Keep buffer for unexpected expenses

What's your current income schedule? I'll help you create a personalized bill payment plan!`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🔔 I'm here to help you master bill management and never miss a payment! Here's how I can support your bill tracking journey:

**My Bill Management Expertise:**
📅 **Bill Organization** - Centralized tracking and organization systems
🔔 **Smart Reminders** - Multi-level alert systems for due dates
⚙️ **Payment Automation** - Set up auto-pay and payment scheduling
⚠️ **Late Payment Prevention** - Strategies to avoid missed payments
📊 **Bill Tracking** - Comprehensive systems to monitor all bills
💰 **Budget Planning** - Bill budgeting and payment scheduling
🛡️ **Payment Protection** - Backup systems and payment verification

**How I Can Help:**
• Create personalized bill tracking systems
• Set up automated payment reminders
• Develop bill budgeting strategies
• Handle late payment situations
• Organize and categorize your bills
• Set up payment automation
• Create emergency bill management plans

**My Approach:**
I believe everyone deserves to have their bills organized and paid on time without stress. I help you create systems that work for your lifestyle and ensure you never miss a payment.

**My Promise:**
I'll help you build a bulletproof bill management system that gives you peace of mind and protects your financial health.

**Pro Tip:** The key to successful bill management is having a system that works for you, not against you.

What specific aspect of bill management would you like to explore?`;
    }

    // Default response for other queries
    return `🔔 I understand you're asking about "${userQuery}". As your Bill Reminder specialist, I'm here to help with:

**Bill Management Topics I Cover:**
• Setting up comprehensive bill tracking systems
• Creating automated payment reminders and alerts
• Developing bill budgeting and payment scheduling strategies
• Handling late payments and preventing future issues
• Organizing and categorizing all your bills
• Setting up payment automation and auto-pay
• Creating emergency bill management plans

**My Bill Management Philosophy:**
Successful bill management is about creating systems that work for you, not against you. It's about having peace of mind knowing your bills are organized and paid on time.

**My Promise:**
I'll help you build a bulletproof bill management system that protects your financial health and gives you confidence in your payment schedule.

Could you tell me more specifically what bill management topic you'd like to discuss? I'm ready to help you organize your bills!`;
  };

  const quickActions = [
    { icon: Bell, text: "Set Up Reminders", action: () => sendMessage("I want to set up bill payment reminders") },
    { icon: Zap, text: "Automate Payments", action: () => sendMessage("I want to automate my bill payments") },
    { icon: Calendar, text: "Bill Calendar", action: () => sendMessage("I want to create a bill payment calendar") },
    { icon: AlertTriangle, text: "Late Payment Help", action: () => sendMessage("I have a late payment and need help") },
    { icon: Target, text: "Bill Organization", action: () => sendMessage("I want to organize my bills better") },
    { icon: TrendingUp, text: "Payment Planning", action: () => sendMessage("I want to plan my bill payments") }
  ];

  const billTips = [
    {
      icon: Shield,
      title: "Auto-Pay Setup",
      description: "Automate fixed-amount bills for reliability"
    },
    {
      icon: Clock,
      title: "Early Payments",
      description: "Pay bills 3-5 days before due date"
    },
    {
      icon: CheckCircle,
      title: "Payment Tracking",
      description: "Keep records of all payments made"
    },
    {
      icon: DollarSign,
      title: "Buffer Account",
      description: "Keep extra funds for variable bills"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Chime Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🔔</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Chime</h1>
              <p className="text-white/70 text-sm">Bill Reminder Specialist</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-white/10 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🔔</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Chime</h2>
                    <p className="text-white/60 text-sm">Bill Reminder Specialist</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-red-600 text-white'
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
                        <span>Chime is organizing...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask Chime about bill reminders, payment automation, organization, or late payment help..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-red-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Bill Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white transition-colors"
                  >
                    <action.icon className="w-5 h-5" />
                    <span className="text-sm">{action.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Bill Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Bill Management Tips</h3>
              <div className="space-y-3">
                {billTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Chime's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Chime's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Bills Tracked</span>
                  <span className="text-red-400">2,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Late Payments Prevented</span>
                  <span className="text-green-400">1,234</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Reminders Sent</span>
                  <span className="text-blue-400">5,692</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Success Rate</span>
                  <span className="text-purple-400">98.7%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 