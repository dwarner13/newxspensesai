import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  FileText, 
  Send, 
  Users,
  BarChart3,
  Upload,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  addMessageToConversation,
  incrementConversationCount,
  logAIInteraction,
  generateConversationId
} from '../../lib/ai-employees';

interface LedgerMessage {
  role: 'user' | 'ledger' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function TaxAssistant() {
  console.log('🚀🚀🚀 LOADING NEW 6-BOX GRID LAYOUT - Tax Assistant Dashboard!');
  console.log('🚨 COMPONENT IS RENDERING - YOU SHOULD SEE 6 BOXES!');
  const { user } = useAuth();
  const [messages, setMessages] = useState<LedgerMessage[]>([
    {
      role: 'ledger',
      content: "Hello! I'm 📊 Ledger, your Tax Assistant AI! I help you navigate tax preparation, maximize deductions, ensure compliance, and optimize your tax strategy. I can help you understand tax laws, identify deductions, organize records, plan for tax season, and ensure you're getting the most from your tax returns. What tax-related question or task would you like to explore today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Enhanced state for tax assistant features

  // Initialize conversation and load Ledger's config
  useEffect(() => {
    const initializeLedger = async () => {
      if (!user?.id) return;

      try {
        const config = await getEmployeeConfig('ledger');
        if (config) {
          console.log('Ledger config loaded:', config);
        }

        // Generate or get existing conversation ID
        const newConversationId = generateConversationId();
        setConversationId(newConversationId);

        // Load existing conversation if available
        const existingConversation = await getConversation(user.id, 'ledger', newConversationId);
        if (existingConversation && existingConversation.messages.length > 0) {
          const ledgerMessages = existingConversation.messages.map(msg => ({
            role: msg.role as 'user' | 'ledger' | 'system',
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata
          }));
          setMessages(ledgerMessages);
        }
      } catch (error) {
        console.error('Error initializing Ledger:', error);
      }
    };

    initializeLedger();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: LedgerMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Add user message to conversation
      await addMessageToConversation(user?.id || 'anonymous', 'ledger', conversationId, {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString()
      });

      // Generate AI response
      const aiResponse = generateTaxResponse(content.trim());
      
      const ledgerMessage: LedgerMessage = {
        role: 'ledger',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: Math.random() * 1000 + 500,
          tokens_used: Math.floor(Math.random() * 100) + 50,
          model_used: 'ledger-tax-assistant'
        }
      };

      setMessages(prev => [...prev, ledgerMessage]);

      // Add AI response to conversation
      await addMessageToConversation(user?.id || 'anonymous', 'ledger', conversationId, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      });

      // Log interaction
      await logAIInteraction(user?.id || 'anonymous', 'ledger', 'chat', content.trim(), aiResponse.length, 500);

      // Increment conversation count
      await incrementConversationCount('ledger', user?.id || 'anonymous');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: LedgerMessage = {
        role: 'ledger',
        content: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTaxResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('deduction') || lowerQuery.includes('deduct')) {
      return `💡 Great question about deductions! Let me help you identify potential tax deductions for your business:

**Common Business Deductions:**
• **Office Expenses** - Rent, utilities, supplies, equipment
• **Professional Services** - Legal, accounting, consulting fees
• **Marketing & Advertising** - Website, social media, print ads
• **Travel & Meals** - Business trips, client meetings (50% meals)
• **Vehicle Expenses** - Mileage or actual expenses for business use
• **Home Office** - If you work from home exclusively
• **Professional Development** - Courses, certifications, conferences
• **Software & Subscriptions** - Business tools, cloud services
• **Insurance** - Business liability, professional indemnity
• **Bank Fees** - Business account fees, credit card processing

**Pro Tips:**
• Keep detailed receipts and records
• Document business purpose for all expenses
• Track mileage with dates and destinations
• Separate business and personal expenses
• Consider quarterly estimated tax payments

What specific type of deduction are you looking to claim? I can provide more detailed guidance!`;
    }

    if (lowerQuery.includes('quarterly') || lowerQuery.includes('estimated') || lowerQuery.includes('payment')) {
      return `📅 Excellent question about quarterly tax payments! Here's what you need to know:

**Who Needs to Pay Quarterly:**
• Self-employed individuals
• Freelancers and contractors
• Small business owners
• Anyone who owes $1,000+ in taxes

**Payment Deadlines:**
• Q1: April 15 (Jan-Mar income)
• Q2: June 15 (Apr-May income)
• Q3: September 15 (Jun-Aug income)
• Q4: January 15 (Sep-Dec income)

**How to Calculate:**
• Estimate your annual income
• Calculate expected tax liability
• Pay 25% each quarter
• Adjust based on actual income

**Benefits of Quarterly Payments:**
• Avoid penalties and interest
• Better cash flow management
• Reduces year-end tax burden
• Helps with budgeting

**Pro Tips:**
• Use Form 1040-ES for calculations
• Set up automatic payments
• Keep detailed income records
• Adjust payments as income changes

Would you like help calculating your quarterly payment amount?`;
    }

    if (lowerQuery.includes('record') || lowerQuery.includes('organize') || lowerQuery.includes('document') || lowerQuery.includes('receipt')) {
      return `📁 Excellent! Let's create a comprehensive record-keeping system to ensure you're organized, compliant, and ready for tax season. Here's my approach to financial record organization:

**Record-Keeping Framework:**
• **Digital First** - Use cloud storage for all documents
• **Categorize Everything** - Separate by expense type and date
• **Backup Regularly** - Multiple copies in different locations
• **Review Monthly** - Catch errors and missing receipts early

**Essential Records to Keep:**
• **Income Records** - Invoices, payment confirmations, bank statements
• **Expense Receipts** - All business-related purchases
• **Mileage Logs** - Date, destination, purpose, miles driven
• **Home Office** - Square footage, utility bills, rent/mortgage
• **Equipment Purchases** - Receipts, warranties, depreciation schedules
• **Professional Development** - Course certificates, conference receipts

**Organization System:**
• **By Category** - Office, Travel, Marketing, Professional Services
• **By Date** - Monthly folders with year-month format
• **By Project** - If you work on multiple projects
• **By Client** - If you have multiple income sources

**Digital Tools I Recommend:**
• **Receipt Scanning** - Use your phone camera with OCR
• **Cloud Storage** - Google Drive, Dropbox, or OneDrive
• **Expense Tracking** - QuickBooks, FreshBooks, or similar
• **Mileage Apps** - MileIQ, Everlance, or built-in phone apps

**Pro Tips:**
• **Scan Immediately** - Don't wait, receipts fade and get lost
• **Use Consistent Naming** - Date_Category_Amount_Description
• **Set Reminders** - Monthly review and organization
• **Keep Physical Copies** - For high-value items and equipment

What specific type of records are you looking to organize? I can provide more detailed guidance for your situation!`;
    }

    if (lowerQuery.includes('optimize') || lowerQuery.includes('minimize') || lowerQuery.includes('reduce') || lowerQuery.includes('save')) {
      return `🎯 Fantastic! Let's optimize your tax strategy to minimize your tax burden and maximize your savings. Here's my comprehensive approach to tax optimization:

**1. Income Optimization:**
• **Timing** - Defer income to next year if in lower bracket
• **Batching** - Group expenses in high-income years
• **Retirement Contributions** - Maximize 401(k), IRA, SEP-IRA
• **Health Savings** - Use HSA for medical expenses

**2. Expense Maximization:**
• **Accelerate Deductions** - Prepay expenses when beneficial
• **Depreciation** - Use Section 179 for equipment
• **Home Office** - Calculate both methods (simplified vs actual)
• **Vehicle** - Compare standard mileage vs actual expenses

**3. Business Structure:**
• **Entity Selection** - LLC, S-Corp, C-Corp considerations
• **Election Timing** - When to make entity elections
• **Salary vs Distributions** - Optimize S-Corp compensation
• **Retirement Plans** - Choose best plan for your situation

**4. Tax Credits:**
• **Research & Development** - R&D tax credit for innovation
• **Work Opportunity** - WOTC for hiring certain employees
• **Energy Credits** - Solar, wind, energy-efficient equipment
• **Child Care** - Dependent care credit and FSA

**5. Retirement Planning:**
• **Contribution Limits** - Maximize all available accounts
• **Roth vs Traditional** - Tax diversification strategy
• **Catch-up Contributions** - Age 50+ additional contributions
• **Backdoor Roth** - High-income Roth IRA strategy

**6. Investment Strategy:**
• **Tax-Loss Harvesting** - Offset gains with losses
• **Asset Location** - Tax-efficient fund placement
• **Long-term Holdings** - Favor long-term capital gains
• **Municipal Bonds** - Tax-free income consideration

**7. Year-End Planning:**
• **Income Shifting** - Move income between tax years
• **Expense Acceleration** - Pay bills before year-end
• **Charitable Giving** - Donate appreciated assets
• **Estimated Payments** - Adjust for current year changes

**8. Quarterly Reviews:**
• **Quarterly Reviews** - Review tax situation quarterly
• **Estimated Payments** - Optimize estimated tax payments
• **Withholding Adjustments** - Adjust W-4 withholding for optimal cash flow
• **Documentation** - Maintain organized records throughout year
• **Professional Consultation** - Regular meetings with tax advisor
• **Legislation Monitoring** - Stay informed about tax law changes

**9. Long-Term Strategies:**
• **Tax Bracket Planning** - Plan for current and future tax brackets
• **Retirement Planning** - Optimize retirement account strategies
• **Estate Planning** - Minimize estate and inheritance taxes
• **Business Succession** - Plan for business transfer and tax implications
• **Investment Planning** - Develop tax-efficient investment strategies
• **Insurance Planning** - Use life insurance for tax-advantaged wealth transfer

**Pro Tips:**
• **Start Early** - Tax optimization requires year-round planning
• **Think Long-Term** - Consider multi-year strategies, not just current year
• **Stay Flexible** - Be ready to adjust strategies based on changing circumstances
• **Document Everything** - Maintain detailed records for all optimization strategies
• **Seek Professional Help** - Complex strategies require expert guidance
• **Monitor Changes** - Stay informed about tax law changes that affect your strategy

What specific aspect of tax optimization would you like to explore?`;
    }

    if (lowerQuery.includes('record') || lowerQuery.includes('organize') || lowerQuery.includes('document') || lowerQuery.includes('receipt')) {
      return `📁 Excellent! Let's create a comprehensive record-keeping system to ensure you're organized, compliant, and ready for tax season. Here's my approach to financial record organization:

**Record-Keeping Framework:**
• **Digital First** - Use cloud storage for all documents
• **Categorize Everything** - Separate by expense type and date
• **Backup Regularly** - Multiple copies in different locations
• **Review Monthly** - Catch errors and missing receipts early

**Essential Records to Keep:**
• **Income Records** - Invoices, payment confirmations, bank statements
• **Expense Receipts** - All business-related purchases
• **Mileage Logs** - Date, destination, purpose, miles driven
• **Home Office** - Square footage, utility bills, rent/mortgage
• **Equipment Purchases** - Receipts, warranties, depreciation schedules
• **Professional Development** - Course certificates, conference receipts

**Organization System:**
• **By Category** - Office, Travel, Marketing, Professional Services
• **By Date** - Monthly folders with year-month format
• **By Project** - If you work on multiple projects
• **By Client** - If you have multiple income sources

**Digital Tools I Recommend:**
• **Receipt Scanning** - Use your phone camera with OCR
• **Cloud Storage** - Google Drive, Dropbox, or OneDrive
• **Expense Tracking** - QuickBooks, FreshBooks, or similar
• **Mileage Apps** - MileIQ, Everlance, or built-in phone apps

**Pro Tips:**
• **Scan Immediately** - Don't wait, receipts fade and get lost
• **Use Consistent Naming** - Date_Category_Amount_Description
• **Set Reminders** - Monthly review and organization
• **Keep Physical Copies** - For high-value items and equipment

What specific type of records are you looking to organize? I can provide more detailed guidance for your situation!`;
    }

    // Default response
    return `I'm getting excited just thinking about how we can turn your tax situation into a money-saving masterpiece! Whether you're looking to maximize deductions, ensure compliance, or just understand how the tax system works, I'm here to help you uncover every opportunity.

What's really on your mind when it comes to taxes? Are we talking about finding hidden deductions, organizing your records, or maybe you're ready to optimize your tax strategy for next year? I'm fired up and ready to help you solve whatever tax mysteries you're facing!`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-white mb-1"
          >
            Tax Assistant
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/60 text-sm mb-3"
          >
            Your intelligent guide to tax preparation, deductions, and optimization
          </motion.p>
        </div>

        {/* Chat Interface with Integrated Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
        >
          {/* Chat Header */}
          <div className="bg-white/10 px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Ledger AI Chat</h3>
                <p className="text-white/60 text-xs">Your intelligent tax assistant</p>
              </div>
            </div>
          </div>

          {/* 6-Box Grid Inside Chat */}
          <div className="p-4 border-b border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {/* Box 1: Tax Analysis */}
              <motion.button
                onClick={() => console.log('Tax Analysis clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Tax Analysis</h3>
                  <p className="text-white/60 text-xs leading-tight">Real-time savings</p>
                </div>
              </motion.button>

              {/* Box 2: Document Upload */}
              <motion.button
                onClick={() => console.log('Upload Documents clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Upload Docs</h3>
                  <p className="text-white/60 text-xs leading-tight">Bank statements</p>
                </div>
              </motion.button>

              {/* Box 3: AI Tax Team */}
              <motion.button
                onClick={() => console.log('AI Tax Team clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">AI Tax Team</h3>
                  <p className="text-white/60 text-xs leading-tight">Meet experts</p>
                </div>
              </motion.button>

              {/* Box 4: Find Deductions */}
              <motion.button
                onClick={() => console.log('Find Deductions clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Find Deductions</h3>
                  <p className="text-white/60 text-xs leading-tight">Hidden savings</p>
                </div>
              </motion.button>

              {/* Box 5: Tax Preparation */}
              <motion.button
                onClick={() => console.log('Tax Preparation clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Tax Prep</h3>
                  <p className="text-white/60 text-xs leading-tight">Complete guide</p>
                </div>
              </motion.button>

              {/* Box 6: Chat with AI */}
              <motion.button
                onClick={() => console.log('Chat with AI clicked')}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">Chat with AI</h3>
                  <p className="text-white/60 text-xs leading-tight">Ask questions</p>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Messages Area - Empty for now */}
          <div className="h-80 overflow-y-auto p-4">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to Help!</h3>
                <p className="text-white/60 text-sm">Click on any card above or type a message below to get started</p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder="Ask Ledger about tax deductions, preparation, compliance..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
    </div>
  );
}