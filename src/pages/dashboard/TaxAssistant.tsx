import { useState, useEffect, useRef } from 'react';
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
  const [messages, setMessages] = useState<LedgerMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState('overview');
  
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
    <>
      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
              {activeView === 'overview' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <h2
                      className="text-xl font-bold text-white mb-1"
                    >
                      Tax Assistant
                    </h2>
                    <p
                      className="text-white/60 text-sm mb-3"
                    >
                      Your intelligent guide to tax preparation, deductions, and optimization for freelancers
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: BarChart3, title: "Tax Analysis", desc: "Real-time savings analysis", color: "from-green-500 to-emerald-500", view: "analysis" },
                        { icon: Upload, title: "Document Upload", desc: "AI-powered document processing", color: "from-blue-500 to-cyan-500", view: "upload" },
                        { icon: Users, title: "AI Tax Team", desc: "Meet your tax experts", color: "from-purple-500 to-violet-500", view: "team" },
                        { icon: Calculator, title: "Find Deductions", desc: "Discover hidden savings", color: "from-orange-500 to-yellow-500", view: "deductions" },
                        { icon: FileText, title: "Tax Preparation", desc: "Complete tax prep guide", color: "from-red-500 to-pink-500", view: "preparation" },
                        { icon: MessageCircle, title: "Chat with Ledger", desc: "AI tax assistant", color: "from-indigo-500 to-purple-500", view: "chat" }
                      ].map((item, index) => (
                        <button
                          key={item.title}
                          onClick={() => setActiveView(item.view)}
                          className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-green-500/10"
                        >
                          <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                            <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeView === 'analysis' ? (
                <div
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Real-Time Tax Analysis</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">AI-powered analysis of your financial data to maximize tax savings and ensure compliance</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">Estimated Tax Savings</h3>
                          <p className="text-white/60 text-sm">Based on your income</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/70">Quarterly Payments</span>
                          <span className="text-green-400 font-semibold">$2,847</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Annual Deductions</span>
                          <span className="text-blue-400 font-semibold">$8,420</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Home Office</span>
                          <span className="text-purple-400 font-semibold">$3,240</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Business Expenses</span>
                          <span className="text-orange-400 font-semibold">$4,180</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Calculator className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">Tax Optimization</h3>
                          <p className="text-white/60 text-sm">AI recommendations</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <h4 className="text-white font-medium text-sm">Maximize SEP-IRA</h4>
                          <p className="text-white/70 text-xs">Contribute $6,000 more to save $1,800</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                          <h4 className="text-white font-medium text-sm">Health Savings</h4>
                          <p className="text-white/70 text-xs">HSA contribution could save $1,200</p>
                        </div>
                        <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                          <h4 className="text-white font-medium text-sm">Equipment Purchase</h4>
                          <p className="text-white/70 text-xs">Section 179 deduction available</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">Compliance Status</h3>
                          <p className="text-white/60 text-sm">Tax requirements</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Quarterly Payments</span>
                          <span className="text-green-400 text-sm">✓ Current</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Record Keeping</span>
                          <span className="text-green-400 text-sm">✓ Complete</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">1099 Forms</span>
                          <span className="text-yellow-400 text-sm">⚠ Pending</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Annual Filing</span>
                          <span className="text-blue-400 text-sm">📅 Due Apr 15</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'upload' ? (
                <div
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">AI Document Processing</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Upload your financial documents for AI-powered analysis and automatic categorization</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Document Upload</h3>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/40 transition-colors cursor-pointer">
                        <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                        <p className="text-white/70 mb-2">Drag & drop files here or click to browse</p>
                        <p className="text-white/50 text-sm">Supports: PDF, JPG, PNG, CSV, Excel</p>
                        <button className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                          Choose Files
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Uploads</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium text-sm">Bank Statement - Chase</p>
                              <p className="text-white/60 text-xs">Dec 2024 • 47 transactions</p>
                            </div>
                          </div>
                          <span className="text-green-400 text-xs">✓ Processed</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="text-white font-medium text-sm">Receipts Bundle</p>
                              <p className="text-white/60 text-xs">Nov 2024 • 23 receipts</p>
                            </div>
                          </div>
                          <span className="text-green-400 text-xs">✓ Processed</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="text-white font-medium text-sm">Invoice Template</p>
                              <p className="text-white/60 text-xs">Template • Ready to use</p>
                            </div>
                          </div>
                          <span className="text-blue-400 text-xs">📋 Template</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">AI Processing Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">847</div>
                        <p className="text-white/70 text-sm">Transactions Analyzed</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">$12,340</div>
                        <p className="text-white/70 text-sm">Deductible Expenses Found</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400 mb-1">94%</div>
                        <p className="text-white/70 text-sm">Automation Accuracy</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'team' ? (
                <div
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">AI Tax Expert Team</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Meet your specialized AI tax experts, each with deep knowledge in different areas of tax law and freelancer needs</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">📊</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">Ledger</h3>
                          <p className="text-green-400 text-sm font-medium mb-1">Tax Analysis Specialist</p>
                          <p className="text-white/70 text-xs">Expert in tax calculations and optimization</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-white/70">Active</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 text-sm font-medium">"I analyze your financial data to maximize deductions and ensure compliance"</p>
                        <p className="text-white/70 text-xs">Specializes in: Quarterly payments, deductions, tax planning</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70">Performance</span>
                          <span className="text-green-400 font-medium">98%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">🏠</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">Deduction Detective</h3>
                          <p className="text-blue-400 text-sm font-medium mb-1">Deduction Specialist</p>
                          <p className="text-white/70 text-xs">Finds every possible deduction for freelancers</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-white/70">Active</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 text-sm font-medium">"I uncover hidden deductions you never knew existed"</p>
                        <p className="text-white/70 text-xs">Specializes in: Home office, business expenses, mileage</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70">Performance</span>
                          <span className="text-blue-400 font-medium">95%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">📋</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">Compliance Officer</h3>
                          <p className="text-purple-400 text-sm font-medium mb-1">Compliance Specialist</p>
                          <p className="text-white/70 text-xs">Ensures you meet all tax requirements</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-white/70">Active</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 text-sm font-medium">"I keep you compliant and penalty-free"</p>
                        <p className="text-white/70 text-xs">Specializes in: Deadlines, forms, record keeping</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70">Performance</span>
                          <span className="text-purple-400 font-medium">97%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">💰</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">Retirement Planner</h3>
                          <p className="text-orange-400 text-sm font-medium mb-1">Retirement Specialist</p>
                          <p className="text-white/70 text-xs">Optimizes retirement contributions for tax savings</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-xs text-white/70">Working</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 text-sm font-medium">"I help you save for retirement while minimizing taxes"</p>
                        <p className="text-white/70 text-xs">Specializes in: SEP-IRA, Solo 401(k), HSA</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70">Performance</span>
                          <span className="text-orange-400 font-medium">93%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">🏢</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">Business Structure</h3>
                          <p className="text-red-400 text-sm font-medium mb-1">Entity Specialist</p>
                          <p className="text-white/70 text-xs">Advises on business structure optimization</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-white/70">Active</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 text-sm font-medium">"I help you choose the right business structure"</p>
                        <p className="text-white/70 text-xs">Specializes in: LLC, S-Corp, C-Corp elections</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70">Performance</span>
                          <span className="text-red-400 font-medium">96%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-3xl">📈</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-1">Growth Strategist</h3>
                          <p className="text-pink-400 text-sm font-medium mb-1">Growth Specialist</p>
                          <p className="text-white/70 text-xs">Plans tax-efficient business growth</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-white/70">Active</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/80 text-sm font-medium">"I help you grow your business tax-efficiently"</p>
                        <p className="text-white/70 text-xs">Specializes in: Scaling, hiring, equipment purchases</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70">Performance</span>
                          <span className="text-pink-400 font-medium">94%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'deductions' ? (
                <div
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Hidden Deductions Discovery</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">AI-powered deduction finder that uncovers every possible tax savings opportunity for freelancers</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Top Deduction Categories</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">Home Office Deduction</h4>
                            <span className="text-green-400 font-semibold">$3,240</span>
                          </div>
                          <p className="text-white/70 text-sm">Based on 12% of your home used for business</p>
                        </div>
                        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">Business Equipment</h4>
                            <span className="text-blue-400 font-semibold">$2,180</span>
                          </div>
                          <p className="text-white/70 text-sm">Computers, software, office supplies</p>
                        </div>
                        <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">Professional Development</h4>
                            <span className="text-purple-400 font-semibold">$1,240</span>
                          </div>
                          <p className="text-white/70 text-sm">Courses, certifications, conferences</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Hidden Opportunities</h3>
                      <div className="space-y-4">
                        <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                          <h4 className="text-white font-medium text-sm">Phone & Internet</h4>
                          <p className="text-white/70 text-xs">50% business use = $480 deduction</p>
                        </div>
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                          <h4 className="text-white font-medium text-sm">Health Insurance Premiums</h4>
                          <p className="text-white/70 text-xs">Self-employed health insurance = $3,600</p>
                        </div>
                        <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                          <h4 className="text-white font-medium text-sm">Mileage & Travel</h4>
                          <p className="text-white/70 text-xs">Business travel at $0.655/mile = $820</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Total Deduction Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">$8,420</div>
                        <p className="text-white/70 text-sm">Total Deductions</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">$2,526</div>
                        <p className="text-white/70 text-sm">Tax Savings (30% bracket)</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400 mb-1">23%</div>
                        <p className="text-white/70 text-sm">Deduction Rate</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400 mb-1">$1,200</div>
                        <p className="text-white/70 text-sm">Additional Opportunities</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'preparation' ? (
                <div
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Complete Tax Preparation Guide</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Step-by-step guide to prepare your taxes like a professional, with AI assistance at every step</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Tax Preparation Checklist</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm">Gather Income Documents</h4>
                            <p className="text-white/70 text-xs">1099s, W-2s, bank statements</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm">Organize Expenses</h4>
                            <p className="text-white/70 text-xs">Receipts, mileage logs, invoices</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium text-sm">Calculate Deductions</h4>
                            <p className="text-white/70 text-xs">Home office, equipment, travel</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Key Forms for Freelancers</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-white/5 rounded-lg">
                          <h4 className="text-white font-medium text-sm mb-1">Form 1040</h4>
                          <p className="text-white/70 text-xs">Main tax return form</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg">
                          <h4 className="text-white font-medium text-sm mb-1">Schedule C</h4>
                          <p className="text-white/70 text-xs">Business income and expenses</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg">
                          <h4 className="text-white font-medium text-sm mb-1">Schedule SE</h4>
                          <p className="text-white/70 text-xs">Self-employment tax calculation</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Tax Deadlines & Important Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-400 mb-1">Jan 31</div>
                        <p className="text-white/70 text-sm">1099 Forms Due</p>
                      </div>
                      <div className="text-center p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400 mb-1">Apr 15</div>
                        <p className="text-white/70 text-sm">Tax Filing Deadline</p>
                      </div>
                      <div className="text-center p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400 mb-1">Jun 15</div>
                        <p className="text-white/70 text-sm">Q2 Estimated Tax</p>
                      </div>
                      <div className="text-center p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-orange-400 mb-1">Oct 15</div>
                        <p className="text-white/70 text-sm">Extension Deadline</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'chat' ? (
                <div
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Chat with Ledger AI</h2>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
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
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                        placeholder="Ask Ledger about tax deductions, preparation, compliance..."
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
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-bold text-white mb-2">Feature Coming Soon</h3>
                    <p className="text-white/70">This feature is under development</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {messages.length > 0 && activeView === 'chat' && (
              <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask Ledger about tax deductions, preparation, compliance..."
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
            )}
          </div>
        </div>
      </div>
    </>
  );
};