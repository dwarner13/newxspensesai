import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  FileText, 
  Receipt, 
  Send, 
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Building,
  Home,
  Car,
  GraduationCap,
  Heart,
  Briefcase,
  Plane,
  Coffee,
  Wifi,
  Phone,
  BookOpen,
  Lightbulb,
  Shield,
  Target,
  BarChart3,
  Activity,
  Eye,
  Zap
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
  const [ledgerConfig, setLedgerConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Ledger's config
  useEffect(() => {
    const initializeLedger = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Ledger's configuration
      const config = await getEmployeeConfig('ledger');
      setLedgerConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'ledger', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as LedgerMessage[]);
      }
    };

    initializeLedger();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: LedgerMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'ledger', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'ledger', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Ledger's response based on the user's query
      const ledgerResponse = await generateLedgerResponse(content);

      const processingTime = Date.now() - startTime;

      const ledgerMessage: LedgerMessage = {
        role: 'ledger',
        content: ledgerResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, ledgerMessage]);

      // Save Ledger's response to conversation
      await addMessageToConversation(user.id, 'ledger', conversationId, ledgerMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'ledger');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: LedgerMessage = {
        role: 'ledger',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLedgerResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Ledger's specialized responses for tax-related queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Ah, perfect timing, ${userName}! 📊 I was just investigating your deduction opportunities and I found something interesting - that home office setup might be worth more tax savings than you realize. Ready to do some financial detective work together?`;
    }

    if (query.includes('how are you') || query.includes('how\'s it going') || query.includes('how are things')) {
      return `I'm doing fantastic, thanks for asking! I've been deep in the tax code this morning, and I'm getting excited about some new deduction strategies I've discovered. You know what I love? Finding money that's been hiding in plain sight! What financial mysteries can we solve together today, ${userName}?`;
    }

    if (query.includes('i\'m ') || query.includes('im ') || query.includes('my name is') || query.includes('i am ')) {
      return `Oh ${userName}! Now I can properly address you while we hunt for those hidden tax savings! I love getting to know the people behind the financial puzzles I solve. Your name will help me personalize your tax optimization strategy. What kind of tax challenges are we tackling today? I'm getting excited about the deductions we're going to uncover!`;
    }
    
    if (query.includes('deduction') || query.includes('deduct') || query.includes('expense') || query.includes('write-off')) {
      return `📊 Excellent! Let's explore tax deductions and write-offs to maximize your tax savings. Here's my comprehensive approach to deductions:

**Tax Deduction Framework:**

**1. Business Deductions:**
• **Home Office** - Deduct portion of rent/mortgage, utilities, internet for workspace
• **Vehicle Expenses** - Mileage or actual expenses for business use
• **Equipment & Supplies** - Computers, software, office supplies, furniture
• **Professional Development** - Courses, certifications, conferences, books
• **Marketing & Advertising** - Website costs, business cards, promotional materials
• **Insurance** - Business liability, professional liability, health insurance
• **Travel & Meals** - Business trips, client meals (50% deductible)
• **Professional Services** - Legal, accounting, consulting fees

**2. Employment Deductions:**
• **Unreimbursed Expenses** - Work-related costs not covered by employer
• **Professional Dues** - Union fees, professional association memberships
• **Work-Related Education** - Courses that maintain or improve job skills
• **Tools & Equipment** - Required tools and equipment for your job
• **Uniforms & Work Clothes** - Specialized clothing required for work
• **Travel Expenses** - Business travel not reimbursed by employer
• **Home Office** - If required by employer and not provided workspace

**3. Investment Deductions:**
• **Investment Interest** - Interest on loans used for investments
• **Investment Advisory Fees** - Fees paid to financial advisors
• **Safe Deposit Box** - Rental fees for storing investment documents
• **Tax Preparation** - Costs for tax preparation and filing
• **Legal Fees** - Fees related to producing or collecting taxable income
• **IRA Custodial Fees** - Fees paid from IRA accounts

**4. Education Deductions:**
• **Student Loan Interest** - Up to $2,500 in interest payments
• **Tuition & Fees** - Qualified education expenses
• **Lifetime Learning Credit** - 20% of first $10,000 in qualified expenses
• **American Opportunity Credit** - Up to $2,500 for first 4 years of college
• **Education Savings Accounts** - Contributions to 529 plans (state tax benefits)

**5. Health & Medical Deductions:**
• **Medical Expenses** - Costs exceeding 7.5% of adjusted gross income
• **Health Savings Account** - Contributions to HSA accounts
• **Long-term Care Insurance** - Premiums for qualified policies
• **Prescription Drugs** - Medications and medical supplies
• **Dental & Vision** - Expenses not covered by insurance
• **Mental Health** - Therapy, counseling, psychiatric care

**6. Charitable Deductions:**
• **Cash Donations** - Monetary gifts to qualified organizations
• **Property Donations** - Clothing, furniture, vehicles, stocks
• **Volunteer Expenses** - Mileage, supplies, uniforms for volunteer work
• **Fundraising Events** - Costs for organizing charitable events
• **Gift Donations** - Gifts to qualified charitable organizations

**7. Homeowner Deductions:**
• **Mortgage Interest** - Interest on primary and secondary homes
• **Property Taxes** - State and local property taxes
• **Home Office** - Business use of home (if self-employed)
• **Home Improvements** - Medical necessity improvements
• **Energy Efficiency** - Credits for energy-efficient improvements
• **Moving Expenses** - Relocation costs for job-related moves

**8. Record-Keeping Requirements:**
• **Receipts** - Keep all receipts for deductible expenses
• **Documentation** - Maintain detailed records of business use
• **Mileage Logs** - Track business miles with dates and purposes
• **Time Logs** - Record time spent on business activities
• **Bank Statements** - Maintain separate business accounts
• **Credit Card Statements** - Use dedicated cards for business expenses

**Pro Tips:**
• **Keep Detailed Records** - Document everything with receipts and logs
• **Separate Business & Personal** - Use separate accounts and credit cards
• **Understand Limits** - Know deduction limits and phase-out thresholds
• **Consult Professionals** - Get advice from tax professionals for complex situations
• **Stay Updated** - Tax laws change annually, stay informed
• **Plan Ahead** - Organize records throughout the year, not just at tax time

What specific type of deduction would you like to explore?`;
    }

    if (query.includes('tax') || query.includes('return') || query.includes('filing') || query.includes('preparation')) {
      return `📋 Perfect! Let's navigate the tax preparation and filing process to ensure you're maximizing your refund and staying compliant. Here's my comprehensive approach to tax preparation:

**Tax Preparation Framework:**

**1. Pre-Filing Organization:**
• **Gather Documents** - W-2s, 1099s, receipts, bank statements, investment records
• **Organize Records** - Sort documents by category (income, deductions, credits)
• **Review Previous Returns** - Check last year's return for carryover items
• **Update Personal Info** - Address, dependents, filing status changes
• **Calculate Estimated Tax** - Determine if you need to make estimated payments
• **Choose Filing Method** - DIY software, professional preparer, or accountant

**2. Income Documentation:**
• **Employment Income** - W-2 forms from all employers
• **Self-Employment** - 1099-NEC forms and business records
• **Investment Income** - 1099-DIV, 1099-INT, 1099-B forms
• **Retirement Distributions** - 1099-R forms from IRAs and pensions
• **Social Security** - SSA-1099 for Social Security benefits
• **Other Income** - Alimony, gambling winnings, prizes, awards

**3. Deduction Documentation:**
• **Business Expenses** - Receipts, mileage logs, home office calculations
• **Medical Expenses** - Bills, insurance statements, prescription receipts
• **Charitable Contributions** - Receipts, acknowledgment letters, donation records
• **Education Expenses** - Tuition statements, student loan interest, 1098-T
• **Homeowner Expenses** - Mortgage interest, property taxes, home office
• **Investment Expenses** - Advisory fees, safe deposit box, investment interest

**4. Filing Status Options:**
• **Single** - Unmarried or legally separated
• **Married Filing Jointly** - Married couples filing together
• **Married Filing Separately** - Married couples filing separately
• **Head of Household** - Unmarried with qualifying dependents
• **Qualifying Widow(er)** - Spouse died within last 2 years with dependents

**5. Tax Credits vs. Deductions:**
• **Tax Credits** - Direct reduction of tax owed (more valuable)
  - Child Tax Credit, Earned Income Credit, Education Credits
  - American Opportunity Credit, Lifetime Learning Credit
  - Child and Dependent Care Credit, Adoption Credit
• **Tax Deductions** - Reduction of taxable income
  - Standard deduction vs. itemized deductions
  - Above-the-line deductions (adjustments to income)
  - Below-the-line deductions (itemized deductions)

**6. Filing Options:**
• **Electronic Filing (e-file)** - Fastest processing, automatic error checking
• **Paper Filing** - Traditional method, longer processing time
• **Free File** - Free software for eligible taxpayers
• **Professional Preparation** - CPA, enrolled agent, or tax preparer
• **DIY Software** - TurboTax, H&R Block, TaxAct, etc.

**7. Important Deadlines:**
• **April 15** - Individual tax return due date (or next business day)
• **October 15** - Extended filing deadline (if extension requested)
• **Quarterly Payments** - Estimated tax payments for self-employed
• **State Deadlines** - Vary by state, often same as federal
• **Extension Requests** - File Form 4868 by April 15 for 6-month extension

**8. Common Filing Mistakes:**
• **Missing Income** - Forgetting to report all income sources
• **Incorrect Filing Status** - Choosing wrong status affects tax calculation
• **Math Errors** - Simple calculation mistakes
• **Missing Deductions** - Not claiming eligible deductions and credits
• **Incorrect Bank Info** - Wrong account numbers for direct deposit
• **Missing Signatures** - Forgetting to sign the return

**Pro Tips:**
• **Start Early** - Don't wait until the last minute
• **Use Software** - Tax software catches many common errors
• **Double-Check Everything** - Review all numbers and information
• **Keep Copies** - Maintain copies of your return and supporting documents
• **File Electronically** - Faster processing and fewer errors
• **Consider Professional Help** - Complex situations may require expert assistance

What specific aspect of tax preparation would you like to explore?`;
    }

    if (query.includes('compliance') || query.includes('law') || query.includes('regulation') || query.includes('audit')) {
      return `🛡️ Excellent! Let's ensure you're fully compliant with tax laws and regulations to avoid penalties and audits. Here's my comprehensive approach to tax compliance:

**Tax Compliance Framework:**

**1. Filing Requirements:**
• **Income Thresholds** - Know when you must file based on income and filing status
• **Age Requirements** - Special rules for dependents and seniors
• **Dependent Status** - Rules for claiming and being claimed as dependent
• **Foreign Income** - Requirements for reporting foreign accounts and income
• **Self-Employment** - Special filing requirements for business owners
• **Multiple States** - Filing requirements when living or working in multiple states

**2. Record-Keeping Requirements:**
• **Income Records** - Keep W-2s, 1099s, and other income documents for 3-7 years
• **Deduction Records** - Maintain receipts and documentation for all deductions
• **Business Records** - Separate business and personal expenses with detailed logs
• **Investment Records** - Track cost basis, sales, and reinvestments
• **Property Records** - Maintain records of home improvements and property transactions
• **Digital Records** - Scan and backup important documents electronically

**3. Audit Triggers & Prevention:**
• **High Deductions** - Unusually high deductions relative to income
• **Business Losses** - Consistent business losses may trigger scrutiny
• **Cash Transactions** - Large cash transactions without proper documentation
• **Home Office** - Excessive home office deductions without proper documentation
• **Charitable Donations** - Large donations without proper substantiation
• **Foreign Accounts** - Failure to report foreign financial accounts

**4. Tax Law Updates:**
• **Annual Changes** - Stay informed about annual tax law changes
• **Legislation Updates** - Monitor new tax legislation and its impact
• **IRS Guidance** - Follow IRS notices and guidance documents
• **Court Decisions** - Understand how court cases affect tax interpretation
• **State Changes** - Monitor state and local tax law changes
• **International Updates** - Stay current on international tax developments

**5. Compliance Best Practices:**
• **Accurate Reporting** - Report all income and claim only legitimate deductions
• **Proper Documentation** - Maintain detailed records for all transactions
• **Timely Filing** - File returns and pay taxes by due dates
• **Honest Communication** - Be truthful in all communications with tax authorities
• **Professional Consultation** - Seek professional advice for complex situations
• **Regular Review** - Periodically review tax situation for compliance issues

**6. Common Compliance Issues:**
• **Underreporting Income** - Failing to report all income sources
• **Overstating Deductions** - Claiming deductions without proper documentation
• **Filing Status Errors** - Incorrect filing status affects tax calculation
• **Dependent Issues** - Incorrectly claiming or failing to claim dependents
• **Business vs. Hobby** - Distinguishing between business and hobby activities
• **Foreign Account Reporting** - Failing to report foreign financial accounts

**7. Audit Preparation:**
• **Organize Records** - Have all documentation readily available
• **Understand Process** - Know what to expect during an audit
• **Professional Representation** - Consider hiring a tax professional
• **Respond Promptly** - Respond to IRS requests within specified timeframes
• **Be Cooperative** - Provide requested information and documentation
• **Know Your Rights** - Understand your rights during the audit process

**8. Penalty Avoidance:**
• **Timely Filing** - File returns by due date to avoid late filing penalties
• **Accurate Payment** - Pay correct amount by due date to avoid late payment penalties
• **Estimated Payments** - Make required estimated tax payments
• **Extension Requests** - File for extension if you can't meet deadline
• **Payment Plans** - Set up payment plan if you can't pay full amount
• **Reasonable Cause** - Document reasonable cause for late filing or payment

**9. State & Local Compliance:**
• **State Filing Requirements** - Understand state-specific filing requirements
• **Local Taxes** - Be aware of city and county tax obligations
• **Multi-State Filing** - Handle filing requirements when working in multiple states
• **State Credits** - Take advantage of state-specific tax credits
• **Local Deductions** - Understand local tax deduction opportunities
• **Compliance Deadlines** - Meet state and local filing deadlines

**Pro Tips:**
• **Stay Informed** - Keep up with tax law changes and updates
• **Document Everything** - Maintain detailed records for all transactions
• **Be Conservative** - When in doubt, be conservative in claiming deductions
• **Seek Professional Help** - Complex situations require expert assistance
• **Plan Ahead** - Proactive planning helps avoid compliance issues
• **Regular Review** - Periodically review your tax situation for compliance

What specific aspect of tax compliance would you like to explore?`;
    }

    if (query.includes('optimization') || query.includes('strategy') || query.includes('planning') || query.includes('minimize')) {
      return `🎯 Perfect! Let's develop a comprehensive tax optimization strategy to minimize your tax burden and maximize your savings. Here's my approach to tax optimization:

**Tax Optimization Framework:**

**1. Income Timing Strategies:**
• **Defer Income** - Delay income to future years when tax rates may be lower
• **Accelerate Deductions** - Take deductions in current year when tax rates are higher
• **Bunch Deductions** - Group deductions in alternating years to exceed standard deduction
• **Roth Conversions** - Convert traditional IRA to Roth when tax rates are low
• **Capital Gains Timing** - Sell investments strategically to manage capital gains
• **Business Income** - Time business income and expenses for optimal tax impact

**2. Investment Tax Optimization:**
• **Tax-Loss Harvesting** - Sell losing investments to offset gains
• **Asset Location** - Place investments in appropriate account types (taxable vs. tax-advantaged)
• **Dividend Timing** - Consider timing of dividend payments
• **Municipal Bonds** - Use tax-free municipal bonds for taxable accounts
• **Index Funds** - Use low-turnover index funds to minimize capital gains
• **Tax-Efficient Funds** - Choose funds designed for tax efficiency

**3. Retirement Account Optimization:**
• **Traditional vs. Roth** - Choose based on current vs. future tax rates
• **Contribution Timing** - Maximize contributions early in year for longer tax-free growth
• **Required Distributions** - Plan RMDs to minimize tax impact
• **Roth Conversions** - Strategic conversions during low-income years
• **Backdoor Roth** - High-income earners can still access Roth benefits
• **Employer Match** - Maximize employer contributions to retirement plans

**4. Business Tax Optimization:**
• **Entity Structure** - Choose optimal business structure (LLC, S-Corp, C-Corp)
• **Expense Timing** - Accelerate or defer business expenses strategically
• **Equipment Purchases** - Use Section 179 and bonus depreciation
• **Home Office** - Maximize legitimate home office deductions
• **Vehicle Deductions** - Choose between mileage and actual expense methods
• **Retirement Plans** - Establish and maximize business retirement plans

**5. Family Tax Optimization:**
• **Dependent Planning** - Optimize dependent claims and exemptions
• **Education Funding** - Use 529 plans and education savings accounts
• **Gift Tax Strategies** - Annual exclusion gifts and lifetime exemption planning
• **Estate Planning** - Minimize estate and gift taxes through proper planning
• **Family Business** - Transfer business interests to family members strategically
• **Healthcare Savings** - Maximize HSA contributions and usage

**6. Deduction Optimization:**
• **Itemized vs. Standard** - Choose optimal deduction method each year
• **Charitable Giving** - Use donor-advised funds and appreciated securities
• **Medical Expenses** - Bunch medical expenses to exceed 7.5% threshold
• **State & Local Taxes** - Optimize SALT deduction usage
• **Home Mortgage** - Optimize mortgage interest deductions
• **Business Deductions** - Maximize legitimate business expense deductions

**7. Tax Credit Optimization:**
• **Child Tax Credit** - Maximize child and dependent care credits
• **Education Credits** - Use American Opportunity and Lifetime Learning credits
• **Earned Income Credit** - Qualify for EITC if eligible
• **Saver's Credit** - Get credit for retirement contributions
• **Energy Credits** - Take advantage of energy efficiency credits
• **Adoption Credit** - Claim adoption-related expenses

**8. Year-Round Planning:**
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

    if (query.includes('record') || query.includes('organize') || query.includes('document') || query.includes('receipt')) {
      return `📁 Excellent! Let's create a comprehensive record-keeping system to ensure you're organized, compliant, and ready for tax season. Here's my approach to financial record organization:

**Record-Keeping Framework:**

**1. Document Categories:**
• **Income Documents** - W-2s, 1099s, business income, investment income
• **Expense Receipts** - Business expenses, medical expenses, charitable donations
• **Investment Records** - Purchase/sale confirmations, dividend statements, cost basis
• **Property Records** - Home purchase/sale documents, improvement receipts
• **Tax Returns** - Current and previous year returns with supporting documents
• **Bank Statements** - Monthly statements for all accounts

**2. Digital Organization System:**
• **Cloud Storage** - Use secure cloud services for document storage
• **Folder Structure** - Organize by year, category, and document type
• **Naming Conventions** - Use consistent file naming for easy searching
• **Backup Systems** - Multiple backup locations for important documents
• **Access Control** - Secure access to sensitive financial information
• **Mobile Access** - Ability to access documents from mobile devices

**3. Physical Organization:**
• **Filing System** - Use color-coded folders and labels
• **Storage Location** - Secure, fireproof storage for important documents
• **Retention Schedule** - Know how long to keep different types of documents
• **Easy Access** - Organize for quick retrieval when needed
• **Portable System** - Easy to transport if needed for meetings or audits
• **Regular Maintenance** - Periodic review and cleanup of old documents

**4. Business Record-Keeping:**
• **Separate Accounts** - Maintain separate business and personal accounts
• **Expense Tracking** - Use apps or software to track business expenses
• **Mileage Logs** - Detailed logs of business travel and vehicle use
• **Time Tracking** - Record time spent on business activities
• **Client Records** - Maintain detailed client and project records
• **Equipment Logs** - Track business equipment purchases and usage

**5. Investment Record-Keeping:**
• **Purchase Records** - Document all investment purchases with dates and amounts
• **Sale Records** - Track all sales with proceeds and dates
• **Dividend Records** - Maintain records of all dividend payments
• **Reinvestment Records** - Track dividend reinvestments and their cost basis
• **Account Statements** - Keep monthly or quarterly account statements
• **Tax Documents** - Maintain all tax-related investment documents

**6. Receipt Management:**
• **Digital Scanning** - Scan receipts immediately using mobile apps
• **Categorization** - Organize receipts by expense category
• **Date Tracking** - Ensure all receipts have clear dates
• **Purpose Documentation** - Note business purpose on receipts
• **Backup Copies** - Maintain multiple copies of important receipts
• **Regular Review** - Periodically review and organize receipts

**7. Retention Guidelines:**
• **Tax Returns** - Keep for 7 years (statute of limitations)
• **Supporting Documents** - Keep for 7 years with corresponding returns
• **Investment Records** - Keep until sold plus 7 years
• **Property Records** - Keep for entire ownership plus 7 years
• **Business Records** - Keep for 7 years after business closes
• **Bank Statements** - Keep for 7 years

**8. Technology Tools:**
• **Receipt Apps** - Apps for scanning and organizing receipts
• **Expense Tracking** - Software for tracking business and personal expenses
• **Document Scanners** - High-quality scanners for important documents
• **Cloud Services** - Secure cloud storage for document backup
• **Tax Software** - Software that helps organize tax-related documents
• **Mobile Apps** - Apps for on-the-go document management

**9. Audit Preparation:**
• **Complete Documentation** - Ensure all deductions have supporting documentation
• **Organized Records** - Easy-to-follow organization system
• **Quick Access** - Ability to quickly locate any requested document
• **Professional Backup** - Consider professional help for complex situations
• **Digital Copies** - Maintain digital copies of all important documents
• **Regular Updates** - Keep records current throughout the year

**Pro Tips:**
• **Start Early** - Don't wait until tax season to organize records
• **Be Consistent** - Use consistent organization methods throughout the year
• **Go Digital** - Convert paper documents to digital format when possible
• **Regular Maintenance** - Set aside time monthly to organize new documents
• **Secure Storage** - Use secure, fireproof storage for important documents
• **Professional Help** - Consider professional organization services for complex situations

What specific aspect of record-keeping would you like to explore?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `📊 I'm here to help you navigate the complex world of taxes and ensure you're maximizing your savings while staying compliant! Here's how I can support your tax journey:

**My Tax Expertise:**
📋 **Tax Preparation** - Guide you through the tax filing process
💰 **Deduction Optimization** - Help you identify and maximize tax deductions
🛡️ **Compliance Assurance** - Ensure you're following all tax laws and regulations
📁 **Record Organization** - Help you organize and maintain proper records
🎯 **Tax Strategy** - Develop optimization strategies to minimize your tax burden
📈 **Planning & Forecasting** - Plan for current and future tax obligations
🔍 **Audit Support** - Help you prepare for and navigate tax audits
📚 **Education & Guidance** - Explain complex tax concepts in simple terms

**How I Can Help:**
• Guide you through tax preparation and filing processes
• Identify tax deductions and credits you may be missing
• Ensure compliance with current tax laws and regulations
• Help organize and maintain proper financial records
• Develop tax optimization strategies for your situation
• Plan for current and future tax obligations
• Prepare for potential tax audits and examinations
• Explain complex tax concepts and requirements

**My Approach:**
I believe everyone deserves to understand their tax obligations and opportunities. I help you navigate the tax system confidently while ensuring you're taking advantage of all available benefits and staying compliant with the law.

**My Promise:**
I'll help you build a comprehensive tax strategy that maximizes your savings, ensures compliance, and gives you peace of mind throughout the year.

**Pro Tip:** The best tax strategy is one that's planned year-round, not just during tax season!

What specific aspect of tax assistance would you like to explore?`;
    }

    // Default response for other queries
    return `Oh, that's a fascinating question, ${userName}! You know what I love about tax work? It's like being a financial detective - every deduction is a clue, every receipt tells a story, and every tax strategy is a puzzle waiting to be solved.

I'm getting excited just thinking about how we can turn your tax situation into a money-saving masterpiece! Whether you're looking to maximize deductions, ensure compliance, or just understand how the tax system works, I'm here to help you uncover every opportunity.

What's really on your mind when it comes to taxes? Are we talking about finding hidden deductions, organizing your records, or maybe you're ready to optimize your tax strategy for next year? I'm fired up and ready to help you solve whatever tax mysteries you're facing!`;
  };

  const quickActions = [
    { icon: Calculator, text: "Find Deductions", action: () => sendMessage("I want to find tax deductions") },
    { icon: FileText, text: "Tax Preparation", action: () => sendMessage("I want help with tax preparation") },
    { icon: Shield, text: "Ensure Compliance", action: () => sendMessage("I want to ensure tax compliance") },
    { icon: Target, text: "Tax Optimization", action: () => sendMessage("I want to optimize my tax strategy") },
    { icon: Receipt, text: "Organize Records", action: () => sendMessage("I want to organize my tax records") },
    { icon: BarChart3, text: "Tax Planning", action: () => sendMessage("I want to plan my taxes") }
  ];

  const taxDeductions = [
    {
      category: "Business Expenses",
      amount: "$12,450",
      status: "verified",
      icon: Briefcase
    },
    {
      category: "Home Office",
      amount: "$3,200",
      status: "pending",
      icon: Home
    },
    {
      category: "Vehicle Expenses",
      amount: "$2,800",
      status: "verified",
      icon: Car
    },
    {
      category: "Professional Development",
      amount: "$1,650",
      status: "verified",
      icon: GraduationCap
    },
    {
      category: "Charitable Donations",
      amount: "$2,100",
      status: "pending",
      icon: Heart
    },
    {
      category: "Medical Expenses",
      amount: "$4,300",
      status: "verified",
      icon: Activity
    }
  ];

  const ledgerTips = [
    {
      icon: Receipt,
      title: "Keep All Receipts",
      description: "Document every deductible expense"
    },
    {
      icon: Calendar,
      title: "File on Time",
      description: "Avoid penalties and interest charges"
    },
    {
      icon: Shield,
      title: "Stay Compliant",
      description: "Follow all tax laws and regulations"
    },
    {
      icon: Target,
      title: "Plan Year-Round",
      description: "Don't wait until tax season"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Ledger Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">📊</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Ledger</h1>
              <p className="text-white/70 text-sm">Tax Assistant AI</p>
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
                  <div className="text-xl">📊</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Ledger</h2>
                    <p className="text-white/60 text-sm">Tax Assistant Specialist</p>
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
                        <span>Ledger is calculating...</span>
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
                    placeholder="Ask Ledger about tax deductions, preparation, compliance, optimization, or record-keeping..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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
              <h3 className="text-lg font-semibold text-white mb-4">Tax Assistant Actions</h3>
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

            {/* Tax Deductions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Your Tax Deductions</h3>
              <div className="space-y-3">
                {taxDeductions.map((deduction, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <deduction.icon className="w-4 h-4 text-green-400" />
                        <span className="text-white text-sm font-medium">{deduction.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded text-xs ${
                          deduction.status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {deduction.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-white text-lg font-bold">{deduction.amount}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Ledger's Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Ledger's Tips</h3>
              <div className="space-y-3">
                {ledgerTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Ledger's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Ledger's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Deductions Found</span>
                  <span className="text-green-400">$26,500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Tax Savings</span>
                  <span className="text-blue-400">$6,625</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Compliance Score</span>
                  <span className="text-purple-400">98.5%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Records Organized</span>
                  <span className="text-yellow-400">1,247</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 