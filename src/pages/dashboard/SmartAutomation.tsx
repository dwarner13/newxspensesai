import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Settings, 
  Bot, 
  Send, 
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Target,
  BarChart3,
  Shield,
  Lightbulb,
  Cpu,
  Workflow,
  Cog
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

interface BlitzMessage {
  role: 'user' | 'blitz' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function SmartAutomation() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<BlitzMessage[]>([
    {
      role: 'blitz',
      content: "Hi! I'm ⚡ Blitz, your Smart Automation specialist! I help you automate repetitive financial tasks and create efficient workflows that save time and reduce manual work. I can help you set up automatic categorization, payment scheduling, expense tracking, and much more. What would you like to automate in your financial life today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [blitzConfig, setBlitzConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Blitz's config
  useEffect(() => {
    const initializeBlitz = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Blitz's configuration
      const config = await getEmployeeConfig('automa');
      setBlitzConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'automa', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as BlitzMessage[]);
      }
    };

    initializeBlitz();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: BlitzMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'automa', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'automa', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Blitz's response based on the user's query
      const blitzResponse = await generateBlitzResponse(content);

      const processingTime = Date.now() - startTime;

      const blitzMessage: BlitzMessage = {
        role: 'blitz',
        content: blitzResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, blitzMessage]);

      // Save Blitz's response to conversation
      await addMessageToConversation(user.id, 'automa', conversationId, blitzMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'automa');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: BlitzMessage = {
        role: 'blitz',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateBlitzResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();

    // Blitz's specialized responses for automation-related queries
    if (query.includes('automate') || query.includes('automation') || query.includes('workflow') || query.includes('efficiency')) {
      return `⚡ Fantastic! Let's talk about financial automation and creating efficient workflows. Here's my approach to automating your financial life:

**My Automation Framework:**

**1. Transaction Automation:**
• **Auto-categorization** - Automatically categorize transactions based on merchant, amount, and patterns
• **Smart rules** - Set up rules for recurring transactions and special cases
• **Bulk processing** - Handle multiple transactions at once
• **Pattern recognition** - Learn from your manual categorizations

**2. Payment Automation:**
• **Auto-pay setup** - Automatic payments for bills with fixed amounts
• **Payment scheduling** - Schedule payments in advance
• **Recurring transfers** - Automatic savings and investment contributions
• **Payment reminders** - Smart alerts before due dates

**3. Expense Tracking Automation:**
• **Receipt scanning** - Automatically extract data from receipts
• **Expense categorization** - Auto-categorize business vs. personal expenses
• **Mileage tracking** - Automatic mileage logging for business trips
• **Expense reports** - Generate reports automatically

**4. Investment Automation:**
• **Dollar-cost averaging** - Automatic investment contributions
• **Rebalancing** - Automatic portfolio rebalancing
• **Dividend reinvestment** - Automatic DRIP setup
• **Tax-loss harvesting** - Automatic tax optimization

**5. Budget Automation:**
• **Spending alerts** - Notifications when approaching budget limits
• **Category tracking** - Automatic budget vs. actual comparisons
• **Savings goals** - Automatic progress tracking
• **Expense forecasting** - Predict future spending based on patterns

**Pro Tips:**
• **Start small** - Automate one process at a time
• **Test thoroughly** - Verify automation works before relying on it
• **Monitor regularly** - Check automation performance monthly
• **Have backups** - Keep manual processes as fallbacks

What specific financial process would you like to automate?`;
    }

    if (query.includes('rule') || query.includes('setup') || query.includes('configure') || query.includes('create')) {
      return `🔧 Excellent! Let's set up automation rules to streamline your financial processes. Here's how to create effective automation:

**Automation Rule Setup:**

**1. Transaction Categorization Rules:**
• **Merchant Rules** - "Always categorize Starbucks as Coffee & Dining"
• **Amount Rules** - "Transactions over $100 in Food = Special Occasion"
• **Date Rules** - "Weekend dining = Entertainment, weekday = Food"
• **Location Rules** - "Gas stations near home = Personal, near work = Business"
• **Pattern Rules** - "Monthly subscriptions = Recurring Expenses"

**2. Payment Automation Rules:**
• **Fixed Amount Bills** - "Auto-pay rent of $1,500 on the 1st"
• **Variable Bills** - "Pay minimum on credit cards, manual review for full payment"
• **Savings Rules** - "Transfer 20% of paycheck to savings account"
• **Investment Rules** - "Invest $500 in index funds every payday"

**3. Alert and Notification Rules:**
• **Spending Alerts** - "Notify when dining expenses exceed $300/month"
• **Budget Alerts** - "Alert when 80% of category budget is used"
• **Payment Alerts** - "Remind 3 days before bill due date"
• **Savings Alerts** - "Notify when emergency fund drops below $5,000"

**4. Workflow Automation Rules:**
• **Receipt Processing** - "Auto-categorize receipts from email"
• **Expense Reports** - "Generate monthly expense report on 1st"
• **Tax Preparation** - "Export tax-related transactions quarterly"
• **Goal Tracking** - "Update progress on savings goals weekly"

**Setting Up Rules:**
1. **Identify repetitive tasks** - What do you do manually every month?
2. **Define triggers** - What conditions should start the automation?
3. **Set actions** - What should happen when triggered?
4. **Test the rule** - Apply to historical data first
5. **Monitor performance** - Check accuracy and adjust as needed

**Pro Tips:**
• **Start with simple rules** - Build complexity gradually
• **Use clear conditions** - Avoid ambiguous triggers
• **Set up exceptions** - Handle special cases
• **Review regularly** - Update rules as your situation changes

What specific rule would you like to create?`;
    }

    if (query.includes('workflow') || query.includes('process') || query.includes('streamline') || query.includes('efficiency')) {
      return `🔄 Great question! Let's create efficient workflows that streamline your financial processes. Here's my approach to workflow optimization:

**Financial Workflow Automation:**

**1. Monthly Financial Review Workflow:**
• **Week 1** - Auto-generate spending report and categorize transactions
• **Week 2** - Review budget vs. actual, adjust categories if needed
• **Week 3** - Check savings progress, update goals
• **Week 4** - Plan for next month, set up new automation rules

**2. Bill Payment Workflow:**
• **Auto-pay setup** - Fixed amounts paid automatically
• **Manual review** - Variable bills reviewed and paid manually
• **Payment confirmation** - Verify all payments were processed
• **Late payment prevention** - Alerts for any missed payments

**3. Expense Tracking Workflow:**
• **Receipt capture** - Scan receipts immediately after purchase
• **Auto-categorization** - Apply rules to categorize expenses
• **Manual review** - Review and adjust categorizations weekly
• **Report generation** - Create expense reports automatically

**4. Investment Management Workflow:**
• **Regular contributions** - Automatic investment deposits
• **Portfolio review** - Monthly performance analysis
• **Rebalancing** - Automatic portfolio adjustments
• **Tax optimization** - Quarterly tax-loss harvesting

**5. Savings Goal Workflow:**
• **Goal tracking** - Monitor progress toward savings goals
• **Automatic transfers** - Regular contributions to goal accounts
• **Progress updates** - Weekly progress notifications
• **Goal adjustments** - Modify goals based on changing circumstances

**Workflow Optimization Tips:**
• **Eliminate manual steps** - Automate everything possible
• **Reduce decision fatigue** - Use rules instead of manual choices
• **Create checkpoints** - Regular reviews to ensure accuracy
• **Build in flexibility** - Allow for exceptions and changes
• **Measure efficiency** - Track time saved and accuracy improvements

**Pro Tips:**
• **Map current processes** - Identify bottlenecks and inefficiencies
• **Start with high-impact** - Focus on processes you do frequently
• **Test thoroughly** - Verify workflows work before full implementation
• **Iterate and improve** - Continuously optimize based on results

What specific workflow would you like to streamline?`;
    }

    if (query.includes('time') || query.includes('save') || query.includes('efficient') || query.includes('productivity')) {
      return `⏰ Time is your most valuable asset! Let me show you how automation can save you hours every month and boost your financial productivity.

**Time-Saving Automation Benefits:**

**1. Transaction Management:**
• **Manual categorization** - 2-3 hours/month → **Automated** - 5 minutes/month
• **Receipt processing** - 1-2 hours/month → **Automated** - 10 minutes/month
• **Expense tracking** - 3-4 hours/month → **Automated** - 15 minutes/month
• **Payment scheduling** - 1 hour/month → **Automated** - 5 minutes/month

**2. Monthly Financial Review:**
• **Manual review** - 4-6 hours/month → **Automated** - 30 minutes/month
• **Report generation** - 2-3 hours/month → **Automated** - 5 minutes/month
• **Budget tracking** - 2 hours/month → **Automated** - 10 minutes/month
• **Goal monitoring** - 1 hour/month → **Automated** - 5 minutes/month

**3. Investment Management:**
• **Manual contributions** - 30 minutes/month → **Automated** - 0 minutes/month
• **Portfolio rebalancing** - 2 hours/quarter → **Automated** - 10 minutes/quarter
• **Tax optimization** - 4 hours/year → **Automated** - 1 hour/year
• **Performance tracking** - 1 hour/month → **Automated** - 5 minutes/month

**4. Bill Management:**
• **Manual bill payments** - 2-3 hours/month → **Automated** - 10 minutes/month
• **Payment tracking** - 1 hour/month → **Automated** - 5 minutes/month
• **Late fee prevention** - Saves $50-200/year in fees
• **Credit score protection** - Prevents late payment dings

**Total Time Savings:**
• **Before automation** - 15-20 hours/month
• **After automation** - 2-3 hours/month
• **Time saved** - 12-17 hours/month (3-4 hours/week!)
• **Annual savings** - 144-204 hours/year

**Productivity Benefits:**
• **Reduced stress** - No more worrying about missed payments
• **Better accuracy** - Fewer human errors in categorization
• **Consistent habits** - Automation builds good financial habits
• **More insights** - Better data leads to better decisions
• **Goal achievement** - Faster progress toward financial goals

**Pro Tips:**
• **Start with high-impact** - Automate the most time-consuming tasks first
• **Measure your time** - Track how long tasks take before and after automation
• **Celebrate savings** - Acknowledge the time you've freed up
• **Invest saved time** - Use extra time for financial education or goal planning

What's your biggest time-consuming financial task? I'll help you automate it!`;
    }

    if (query.includes('integrate') || query.includes('connect') || query.includes('sync') || query.includes('api')) {
      return `🔗 Excellent! Let's talk about integrating your financial tools and creating seamless connections between your accounts and apps.

**Financial Integration Strategies:**

**1. Bank Account Integration:**
• **Real-time sync** - Automatic transaction import from all accounts
• **Multi-account support** - Connect checking, savings, credit cards
• **Secure connections** - Bank-level security for data protection
• **Error handling** - Automatic retry and error notifications

**2. Payment System Integration:**
• **Credit card sync** - Automatic transaction categorization
• **Bill pay integration** - Direct payment from bank accounts
• **Digital wallet sync** - Apple Pay, Google Pay, PayPal
• **Subscription tracking** - Monitor recurring payments

**3. Investment Platform Integration:**
• **Brokerage accounts** - Sync investment transactions
• **Retirement accounts** - 401(k), IRA, Roth IRA tracking
• **Portfolio performance** - Real-time investment tracking
• **Dividend tracking** - Automatic dividend income recording

**4. Expense Management Integration:**
• **Receipt apps** - Connect receipt scanning apps
• **Expense reports** - Automatic report generation
• **Business expenses** - Separate personal and business tracking
• **Mileage tracking** - GPS-based mileage logging

**5. Goal and Budget Integration:**
• **Savings goals** - Automatic progress tracking
• **Budget alerts** - Real-time spending notifications
• **Goal visualization** - Progress charts and milestones
• **Achievement celebrations** - Automatic goal completion notifications

**Integration Best Practices:**
• **Start with essentials** - Connect your most-used accounts first
• **Verify security** - Ensure all connections use encryption
• **Test thoroughly** - Verify data accuracy after integration
• **Monitor regularly** - Check for sync issues or errors
• **Have backups** - Keep manual processes as fallbacks

**Popular Integrations:**
• **Banking** - Chase, Bank of America, Wells Fargo, local banks
• **Credit Cards** - Visa, Mastercard, American Express
• **Investments** - Vanguard, Fidelity, Charles Schwab, Robinhood
• **Payment Apps** - PayPal, Venmo, Zelle, Cash App
• **Expense Apps** - Expensify, Receipt Bank, Shoeboxed

**Pro Tips:**
• **Use OAuth** - More secure than sharing passwords
• **Enable notifications** - Get alerts for sync issues
• **Regular audits** - Verify data accuracy monthly
• **Update connections** - Refresh integrations when needed

What accounts or apps would you like to integrate?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `⚡ I'm here to help you automate your financial life and create efficient workflows! Here's how I can support your automation journey:

**My Automation Expertise:**
🔧 **Rule Creation** - Set up smart automation rules for financial tasks
🔄 **Workflow Design** - Create efficient processes and workflows
⏰ **Time Optimization** - Save hours with automated financial management
🔗 **System Integration** - Connect your financial tools and accounts
📊 **Process Analysis** - Identify automation opportunities
🛡️ **Security & Reliability** - Ensure safe and dependable automation
📈 **Performance Monitoring** - Track automation effectiveness

**How I Can Help:**
• Create personalized automation rules and workflows
• Set up automatic categorization and payment systems
• Design efficient financial management processes
• Integrate your financial tools and accounts
• Optimize your time and reduce manual work
• Monitor and improve automation performance
• Troubleshoot automation issues and errors

**My Approach:**
I believe everyone deserves to have their financial tasks automated so they can focus on what matters most. I help you create systems that work reliably and save you significant time.

**My Promise:**
I'll help you build a comprehensive automation system that transforms your financial management from a time-consuming chore into a seamless, efficient process.

**Pro Tip:** The best automation is invisible—it works so well you forget it's there!

What specific aspect of financial automation would you like to explore?`;
    }

    // Default response for other queries
    return `⚡ I understand you're asking about "${userQuery}". As your Smart Automation specialist, I'm here to help with:

**Automation Topics I Cover:**
• Creating smart automation rules for financial tasks
• Designing efficient workflows and processes
• Setting up automatic categorization and payments
• Integrating financial tools and accounts
• Optimizing time and reducing manual work
• Monitoring and improving automation performance
• Troubleshooting automation issues and errors

**My Automation Philosophy:**
Financial automation should make your life easier, not more complicated. I help you create systems that work reliably in the background, giving you more time and peace of mind.

**My Promise:**
I'll help you build automation systems that transform your financial management from a time-consuming chore into a seamless, efficient process.

Could you tell me more specifically what automation topic you'd like to discuss? I'm ready to help you streamline your financial life!`;
  };

  const quickActions = [
    { icon: Zap, text: "Create Rules", action: () => sendMessage("I want to create automation rules") },
    { icon: Workflow, text: "Design Workflows", action: () => sendMessage("I want to design efficient workflows") },
    { icon: Clock, text: "Save Time", action: () => sendMessage("I want to save time with automation") },
    { icon: Cog, text: "Set Up Automation", action: () => sendMessage("I want to set up financial automation") },
    { icon: Cpu, text: "System Integration", action: () => sendMessage("I want to integrate my financial tools") },
    { icon: Target, text: "Process Optimization", action: () => sendMessage("I want to optimize my financial processes") }
  ];

  const automationTips = [
    {
      icon: Lightbulb,
      title: "Start Small",
      description: "Automate one process at a time"
    },
    {
      icon: Shield,
      title: "Test Thoroughly",
      description: "Verify automation works before relying on it"
    },
    {
      icon: RefreshCw,
      title: "Monitor Regularly",
      description: "Check automation performance monthly"
    },
    {
      icon: BarChart3,
      title: "Measure Impact",
      description: "Track time saved and efficiency gains"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Blitz Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">⚡</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Blitz</h1>
              <p className="text-white/70 text-sm">Smart Automation Specialist</p>
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
                  <div className="text-xl">⚡</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Blitz</h2>
                    <p className="text-white/60 text-sm">Smart Automation Specialist</p>
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
                        ? 'bg-yellow-600 text-white'
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
                        <span>Blitz is optimizing...</span>
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
                    placeholder="Ask Blitz about automation, workflows, time-saving, or system integration..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-yellow-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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
              <h3 className="text-lg font-semibold text-white mb-4">Automation Actions</h3>
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

            {/* Automation Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Automation Tips</h3>
              <div className="space-y-3">
                {automationTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Blitz's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Blitz's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Automations Created</span>
                  <span className="text-yellow-400">1,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Time Saved</span>
                  <span className="text-green-400">2,156 hrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Success Rate</span>
                  <span className="text-blue-400">98.3%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Active Workflows</span>
                  <span className="text-purple-400">324</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
