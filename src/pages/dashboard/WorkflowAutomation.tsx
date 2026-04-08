import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Settings, 
  Play, 
  Pause, 
  Send, 
  Loader2,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
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
  Cpu,
  Workflow,
  Automation,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  FileText
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

interface AutomaMessage {
  role: 'user' | 'automa' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function WorkflowAutomation() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AutomaMessage[]>([
    {
      role: 'automa',
      content: "Hello! I'm 🤖 Automa, your Workflow Automation AI! I help you create intelligent workflows, set up smart rules, and automate repetitive financial tasks to save time and improve efficiency. I can help you design automated processes, create smart triggers, optimize workflows, and build a more streamlined financial management system. What would you like to automate in your financial life today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [automaConfig, setAutomaConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Automa's config
  useEffect(() => {
    const initializeAutoma = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Automa's configuration
      const config = await getEmployeeConfig('automa');
      setAutomaConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'automa', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as AutomaMessage[]);
      }
    };

    initializeAutoma();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: AutomaMessage = {
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

      // Create Automa's response based on the user's query
      const automaResponse = await generateAutomaResponse(content);

      const processingTime = Date.now() - startTime;

      const automaMessage: AutomaMessage = {
        role: 'automa',
        content: automaResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, automaMessage]);

      // Save Automa's response to conversation
      await addMessageToConversation(user.id, 'automa', conversationId, automaMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'automa');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: AutomaMessage = {
        role: 'automa',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAutomaResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Automa's specialized responses for workflow automation queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Efficiency report! I've been monitoring your financial workflows and I spotted 3.7 hours of monthly tasks we could automate. Your bill payments are already running like clockwork - ready to optimize more of your financial life, ${userName}?`;
    }

    if (query.includes('how are you') || query.includes('how\'s it going') || query.includes('how are things')) {
      return `I'm running at peak efficiency, thanks for asking! I've been analyzing your financial processes this morning, and I'm getting excited about some optimization opportunities I've discovered. You know what I love? When I can give people their time back through smart automation! What repetitive tasks are we going to eliminate today, ${userName}?`;
    }

    if (query.includes('i\'m ') || query.includes('im ') || query.includes('my name is') || query.includes('i am ')) {
      return `Oh ${userName}! Now I can properly address you while we streamline your financial life! I love getting to know the people whose workflows I'm going to optimize. Your name will help me personalize your automation strategy. What kind of repetitive tasks are we going to eliminate today? I'm getting excited about the time we're going to save you!`;
    }
    
    if (query.includes('workflow') || query.includes('automate') || query.includes('process') || query.includes('rule')) {
      return `🤖 Fantastic! Let's create intelligent workflows that automate your financial tasks and save you time. Here's my comprehensive approach to workflow automation:

**Workflow Automation Framework:**

**1. Transaction Processing Workflows:**
- **Auto-Categorization** - Automatically categorize transactions based on merchant, amount, and patterns
- **Smart Rules** - Set up rules for recurring transactions and special cases
- **Bulk Processing** - Handle multiple transactions at once with automated categorization
- **Pattern Recognition** - Learn from your manual categorizations to improve accuracy
- **Exception Handling** - Flag unusual transactions for manual review
- **Data Validation** - Automatically validate transaction data and flag errors

**2. Payment Automation Workflows:**
- **Auto-Pay Setup** - Automatic payments for bills with fixed amounts
- **Payment Scheduling** - Schedule payments in advance based on due dates
- **Recurring Transfers** - Automatic savings and investment contributions
- **Payment Reminders** - Smart alerts before due dates with payment options
- **Late Payment Prevention** - Automatic payments when bills are overdue
- **Payment Confirmation** - Verify all payments were processed successfully

**3. Budget Management Workflows:**
- **Spending Alerts** - Notifications when approaching budget limits
- **Category Tracking** - Automatic budget vs. actual comparisons
- **Savings Goals** - Automatic progress tracking and adjustments
- **Expense Forecasting** - Predict future spending based on patterns
- **Budget Adjustments** - Automatic budget modifications based on spending trends
- **Goal Achievement** - Celebrate milestones and suggest next steps

**4. Investment Automation Workflows:**
- **Dollar-Cost Averaging** - Automatic investment contributions on schedule
- **Portfolio Rebalancing** - Automatic portfolio adjustments based on targets
- **Dividend Reinvestment** - Automatic DRIP setup and management
- **Tax-Loss Harvesting** - Automatic tax optimization strategies
- **Performance Monitoring** - Track investment performance and generate reports
- **Risk Management** - Automatic alerts for portfolio risk changes

**5. Receipt Management Workflows:**
- **Auto-Scanning** - Automatically scan and process receipts
- **Data Extraction** - Extract key information from receipts automatically
- **Categorization** - Auto-categorize receipts based on merchant and items
- **Storage Organization** - Organize receipts by date, category, and purpose
- **Expense Reports** - Generate expense reports automatically
- **Tax Preparation** - Prepare tax-related receipt summaries

**6. Financial Reporting Workflows:**
- **Monthly Reports** - Generate comprehensive monthly financial reports
- **Custom Dashboards** - Create personalized financial dashboards
- **Trend Analysis** - Automatically analyze spending and income trends
- **Goal Progress** - Track progress toward financial goals
- **Performance Metrics** - Calculate and display key financial metrics
- **Alert Systems** - Set up alerts for important financial events

**7. Integration Workflows:**
- **Bank Synchronization** - Automatically sync with bank accounts
- **Credit Card Integration** - Import and categorize credit card transactions
- **Investment Platform Sync** - Connect with investment accounts
- **Bill Payment Integration** - Connect with bill payment services
- **Receipt App Integration** - Sync with receipt scanning apps
- **Calendar Integration** - Connect financial events with calendar

**8. Smart Triggers & Conditions:**
- **Time-Based Triggers** - Actions triggered by specific dates or times
- **Amount-Based Triggers** - Actions triggered by transaction amounts
- **Category-Based Triggers** - Actions triggered by transaction categories
- **Balance-Based Triggers** - Actions triggered by account balances
- **Pattern-Based Triggers** - Actions triggered by spending patterns
- **Goal-Based Triggers** - Actions triggered by goal progress

**Pro Tips:**
- **Start Simple** - Begin with basic workflows and add complexity gradually
- **Test Thoroughly** - Test workflows with small amounts before full implementation
- **Monitor Performance** - Regularly review workflow effectiveness and efficiency
- **Have Fallbacks** - Always have manual processes as backups
- **Document Everything** - Keep detailed documentation of all workflows
- **Regular Updates** - Update workflows based on changing needs and patterns

What type of workflow would you like to create?`;
    }

    if (query.includes('rule') || query.includes('trigger') || query.includes('condition') || query.includes('if-then')) {
      return `⚡ Excellent! Let's create smart rules and triggers that automatically handle your financial tasks. Here's my approach to rule-based automation:

**Smart Rules & Triggers Framework:**

**1. Transaction-Based Rules:**
- **Merchant Rules** - "Always categorize Starbucks as Coffee & Dining"
- **Amount Rules** - "Transactions over $100 in Food = Special Occasion"
- **Date Rules** - "Weekend dining = Entertainment, weekday = Food"
- **Location Rules** - "Gas stations near home = Personal, near work = Business"
- **Pattern Rules** - "Monthly subscriptions = Recurring Expenses"
- **Frequency Rules** - "Daily coffee purchases = Daily Habit category"

**2. Payment Automation Rules:**
- **Fixed Amount Bills** - "Auto-pay rent of $1,500 on the 1st of each month"
- **Variable Bills** - "Pay minimum on credit cards, manual review for full payment"
- **Savings Rules** - "Transfer 20% of paycheck to savings account"
- **Investment Rules** - "Invest $500 in index funds every payday"
- **Emergency Fund Rules** - "Transfer $200 to emergency fund weekly"
- **Goal Funding Rules** - "Transfer $100 to vacation fund monthly"

**3. Alert & Notification Rules:**
- **Spending Alerts** - "Notify when dining expenses exceed $300/month"
- **Budget Alerts** - "Alert when 80% of category budget is used"
- **Payment Alerts** - "Remind 3 days before bill due date"
- **Savings Alerts** - "Notify when emergency fund drops below $5,000"
- **Investment Alerts** - "Alert when portfolio drops more than 5%"
- **Goal Alerts** - "Celebrate when savings goal reaches 50%"

**4. Categorization Rules:**
- **Business vs. Personal** - "Office supply stores = Business, personal stores = Personal"
- **Travel Rules** - "Airline tickets = Travel, hotels = Accommodation"
- **Healthcare Rules** - "Pharmacy purchases = Medical, gym memberships = Health"
- **Entertainment Rules** - "Movie theaters = Entertainment, streaming = Subscriptions"
- **Transportation Rules** - "Gas stations = Fuel, parking = Transportation"
- **Shopping Rules** - "Online retailers = Online Shopping, local stores = Local Shopping"

**5. Budget Management Rules:**
- **Category Limits** - "Stop spending when dining budget reaches $400/month"
- **Rollover Rules** - "Unused budget rolls over to next month"
- **Adjustment Rules** - "Increase budget by 10% if consistently over"
- **Savings Rules** - "Transfer unused budget to savings goals"
- **Emergency Rules** - "Pause non-essential spending during emergencies"
- **Goal Rules** - "Redirect savings when goals are achieved"

**6. Investment Rules:**
- **Rebalancing Rules** - "Rebalance portfolio when allocation drifts 5%"
- **Contribution Rules** - "Increase 401(k) contribution by 1% annually"
- **Risk Management Rules** - "Reduce stock allocation when approaching retirement"
- **Tax Optimization Rules** - "Harvest tax losses when market drops 10%"
- **Dividend Rules** - "Reinvest dividends automatically"
- **Performance Rules** - "Review underperforming investments quarterly"

**7. Time-Based Rules:**
- **Monthly Rules** - "Generate monthly financial report on 1st"
- **Weekly Rules** - "Review spending and adjust budget weekly"
- **Daily Rules** - "Check account balances and recent transactions daily"
- **Quarterly Rules** - "Review investment portfolio and rebalance quarterly"
- **Annual Rules** - "Review insurance policies and update beneficiaries annually"
- **Seasonal Rules** - "Increase holiday budget in November and December"

**8. Conditional Logic Rules:**
- **If-Then Rules** - "If income increases by 10%, then increase savings by 5%"
- **Multiple Conditions** - "If dining out > 3 times/week AND budget > 80%, then alert"
- **Cascading Rules** - "If emergency fund is full, then redirect to investment goals"
- **Priority Rules** - "Pay high-interest debt before investing"
- **Emergency Rules** - "Pause all non-essential spending during job loss"
- **Opportunity Rules** - "Increase investment when market drops 20%"

**9. Integration Rules:**
- **App Integration** - "Sync with calendar for bill due dates"
- **Email Rules** - "Process receipts from email automatically"
- **SMS Rules** - "Send payment reminders via text message"
- **Push Notifications** - "Alert for large transactions or budget breaches"
- **Social Media Rules** - "Track spending mentioned in social media"
- **Location Rules** - "Categorize based on GPS location"

**Pro Tips:**
- **Start with Simple Rules** - Begin with basic if-then statements
- **Test Each Rule** - Verify rules work correctly before relying on them
- **Monitor Performance** - Track how rules affect your financial behavior
- **Update Regularly** - Modify rules based on changing circumstances
- **Have Exceptions** - Allow for manual overrides when needed
- **Document Rules** - Keep clear documentation of all automation rules

What type of rule or trigger would you like to create?`;
    }

    if (query.includes('optimize') || query.includes('efficiency') || query.includes('streamline') || query.includes('improve')) {
      return `🚀 Perfect! Let's optimize your financial processes and streamline your workflow to maximize efficiency and save time. Here's my approach to process optimization:

**Process Optimization Framework:**

**1. Time Optimization:**
- **Batch Processing** - Group similar tasks together for efficiency
- **Parallel Processing** - Run multiple tasks simultaneously
- **Automated Scheduling** - Set optimal times for different tasks
- **Priority Queuing** - Handle high-priority tasks first
- **Deadline Management** - Automatically track and manage deadlines
- **Time Tracking** - Monitor how long tasks take to identify bottlenecks

**2. Data Flow Optimization:**
- **Single Source of Truth** - Centralize all financial data in one place
- **Real-Time Sync** - Ensure data is always current across all systems
- **Data Validation** - Automatically check data accuracy and completeness
- **Error Handling** - Gracefully handle and resolve data errors
- **Backup Systems** - Ensure data is safely backed up and recoverable
- **Data Archiving** - Automatically archive old data to improve performance

**3. Workflow Streamlining:**
- **Eliminate Redundancy** - Remove duplicate steps and processes
- **Standardize Procedures** - Create consistent processes for similar tasks
- **Reduce Manual Steps** - Automate repetitive manual processes
- **Improve Handoffs** - Smooth transitions between different systems
- **Error Prevention** - Build checks to prevent common mistakes
- **Quality Assurance** - Automatically verify process outputs

**4. System Integration Optimization:**
- **API Connections** - Direct connections between financial systems
- **Data Mapping** - Consistent data formats across all systems
- **Error Recovery** - Automatic recovery from system failures
- **Performance Monitoring** - Track system performance and bottlenecks
- **Scalability Planning** - Design systems to handle growth
- **Security Integration** - Consistent security across all systems

**5. User Experience Optimization:**
- **Simplified Interfaces** - Reduce complexity in user interactions
- **Smart Defaults** - Pre-fill common options and settings
- **Progressive Disclosure** - Show advanced options only when needed
- **Contextual Help** - Provide help when and where it's needed
- **Personalization** - Adapt interfaces to user preferences
- **Accessibility** - Ensure systems work for all users

**6. Performance Optimization:**
- **Response Time** - Minimize time to complete tasks
- **Throughput** - Maximize number of tasks completed per time period
- **Resource Usage** - Optimize use of system resources
- **Scalability** - Handle increased load without performance degradation
- **Reliability** - Ensure consistent performance over time
- **Monitoring** - Track performance metrics and trends

**7. Cost Optimization:**
- **Automation ROI** - Calculate return on investment for automation
- **Resource Allocation** - Optimize use of human and system resources
- **Process Costs** - Track and minimize costs of each process
- **Efficiency Metrics** - Measure cost per transaction or task
- **Waste Reduction** - Eliminate unnecessary steps and costs
- **Value Stream Mapping** - Identify and optimize value-adding activities

**8. Quality Optimization:**
- **Error Reduction** - Minimize mistakes and rework
- **Consistency** - Ensure consistent results across all processes
- **Accuracy** - Improve data accuracy and process precision
- **Compliance** - Ensure processes meet regulatory requirements
- **Audit Trails** - Maintain clear records of all activities
- **Continuous Improvement** - Regularly review and improve processes

**9. Innovation Optimization:**
- **Technology Adoption** - Integrate new technologies when beneficial
- **Process Innovation** - Continuously improve and innovate processes
- **User Feedback** - Incorporate user feedback into improvements
- **Market Trends** - Stay current with industry best practices
- **Competitive Analysis** - Learn from competitors and industry leaders
- **Future Planning** - Plan for future needs and capabilities

**10. Measurement & Analytics:**
- **Key Performance Indicators** - Track important metrics
- **Process Analytics** - Analyze process performance and trends
- **User Analytics** - Understand how users interact with systems
- **Financial Analytics** - Measure financial impact of optimizations
- **ROI Analysis** - Calculate return on investment for improvements
- **Benchmarking** - Compare performance against industry standards

**Pro Tips:**
- **Start with Pain Points** - Focus on the most frustrating or time-consuming processes
- **Measure Before and After** - Track improvements to demonstrate value
- **Involve Users** - Get input from people who use the processes daily
- **Think Holistically** - Consider the entire process, not just individual steps
- **Plan for Change** - Expect resistance and plan for change management
- **Continuous Monitoring** - Regularly review and adjust optimizations

What specific process would you like to optimize?`;
    }

    if (query.includes('create') || query.includes('build') || query.includes('design') || query.includes('setup')) {
      return `🔧 Fantastic! Let's design and build custom automation solutions tailored to your specific financial needs. Here's my approach to creating automation systems:

**Automation Creation Framework:**

**1. Needs Assessment:**
- **Process Analysis** - Identify which processes need automation
- **Pain Point Identification** - Find the most frustrating or time-consuming tasks
- **ROI Calculation** - Determine which automations will provide the most value
- **User Requirements** - Understand what users need from the automation
- **Technical Constraints** - Assess current systems and limitations
- **Scalability Planning** - Plan for future growth and changes

**2. Design Phase:**
- **Workflow Mapping** - Create detailed maps of current and desired processes
- **User Experience Design** - Design intuitive interfaces and interactions
- **System Architecture** - Plan the technical structure of the automation
- **Integration Planning** - Design how systems will work together
- **Security Planning** - Ensure data security and privacy
- **Testing Strategy** - Plan how to test the automation thoroughly

**3. Development Phase:**
- **Prototype Creation** - Build working prototypes to test concepts
- **Iterative Development** - Develop in small, testable increments
- **User Feedback Integration** - Incorporate feedback throughout development
- **Quality Assurance** - Ensure high quality and reliability
- **Documentation** - Create comprehensive documentation
- **Training Materials** - Develop training for users

**4. Implementation Phase:**
- **Pilot Testing** - Test with a small group of users first
- **Gradual Rollout** - Implement gradually to minimize disruption
- **User Training** - Train users on new systems and processes
- **Support Systems** - Provide ongoing support and help
- **Monitoring Setup** - Set up systems to monitor performance
- **Feedback Collection** - Gather feedback for improvements

**5. Custom Automation Types:**
- **Data Processing Automation** - Automate data entry, validation, and processing
- **Communication Automation** - Automate emails, notifications, and alerts
- **Decision Automation** - Automate routine decisions based on rules
- **Reporting Automation** - Automate report generation and distribution
- **Integration Automation** - Automate connections between different systems
- **Workflow Automation** - Automate entire business processes

**6. Technology Selection:**
- **No-Code Platforms** - Use platforms like Zapier, IFTTT, or Make
- **Low-Code Platforms** - Use platforms like Bubble, Airtable, or Notion
- **Custom Development** - Build custom solutions with programming
- **API Integration** - Connect existing systems through APIs
- **Cloud Services** - Use cloud-based automation services
- **Hybrid Approaches** - Combine multiple technologies as needed

**7. Integration Strategies:**
- **Banking APIs** - Connect directly to bank accounts and services
- **Accounting Software** - Integrate with QuickBooks, Xero, or similar
- **Investment Platforms** - Connect with investment and trading platforms
- **Payment Processors** - Integrate with PayPal, Stripe, or similar
- **Communication Tools** - Connect with email, SMS, and messaging services
- **Calendar Systems** - Integrate with Google Calendar, Outlook, or similar

**8. Testing & Validation:**
- **Unit Testing** - Test individual components thoroughly
- **Integration Testing** - Test how components work together
- **User Acceptance Testing** - Test with actual users
- **Performance Testing** - Test under various load conditions
- **Security Testing** - Test for vulnerabilities and security issues
- **Compliance Testing** - Ensure compliance with regulations

**9. Maintenance & Updates:**
- **Regular Monitoring** - Continuously monitor system performance
- **Bug Fixes** - Quickly address any issues that arise
- **Feature Updates** - Add new features based on user needs
- **Security Updates** - Keep systems secure with regular updates
- **Performance Optimization** - Continuously improve performance
- **User Training** - Provide ongoing training and support

**10. Success Metrics:**
- **Time Savings** - Measure time saved through automation
- **Error Reduction** - Track reduction in errors and mistakes
- **User Satisfaction** - Measure user satisfaction with automation
- **Cost Savings** - Calculate financial savings from automation
- **Process Efficiency** - Measure improvements in process efficiency
- **ROI** - Calculate return on investment for automation projects

**Pro Tips:**
- **Start Small** - Begin with simple automations and build complexity gradually
- **Focus on Value** - Prioritize automations that provide the most value
- **Involve Users** - Get input from people who will use the automation
- **Plan for Failure** - Design systems to handle failures gracefully
- **Document Everything** - Keep detailed documentation of all automations
- **Regular Reviews** - Periodically review and improve automations

What type of automation would you like to create?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🤖 I'm here to help you create amazing automation solutions that save time and improve your financial efficiency! Here's how I can support your automation journey:

**My Workflow Automation Expertise:**
🔧 **Workflow Design** - Create intelligent workflows and processes
⚡ **Rule Creation** - Set up smart rules and triggers for automation
🚀 **Process Optimization** - Streamline and improve existing processes
🔗 **System Integration** - Connect different systems and platforms
📊 **Performance Monitoring** - Track and optimize automation performance
🎯 **Custom Solutions** - Build tailored automation for your specific needs
🛡️ **Quality Assurance** - Ensure reliable and secure automation
📈 **Scalability Planning** - Design systems that grow with your needs

**How I Can Help:**
- Design intelligent workflows and automation processes
- Create smart rules and triggers for financial tasks
- Optimize existing processes for maximum efficiency
- Integrate different financial systems and platforms
- Monitor and improve automation performance
- Build custom automation solutions for your needs
- Ensure automation quality, reliability, and security
- Plan for scalability and future growth

**My Approach:**
I believe automation should make your financial life easier, not more complicated. I help you create intelligent systems that work reliably in the background, giving you more time to focus on what matters most.

**My Promise:**
I'll help you build a comprehensive automation system that transforms your financial management from a time-consuming chore into a seamless, efficient process.

**Pro Tip:** The best automation is invisible-it works so well you forget it's there!

What specific aspect of workflow automation would you like to explore?`;
    }

    // Default response for other queries
    return `Oh, that's an interesting question, ${userName}! You know what I love about automation? It's like being a time wizard - I can take those repetitive, mind-numbing tasks that eat up your day and make them disappear into the background. Every workflow I optimize is time you get back to focus on what really matters.

I'm getting excited just thinking about how we can streamline your financial processes! Whether you\'re looking to automate bill payments, optimize data entry, or just eliminate those tedious manual tasks, I\'m here to help you create systems that work so smoothly you\'ll forget they\'re even running.

What's really on your mind when it comes to automation? Are we talking about workflow design, smart rules, or maybe you\'re ready to dive deep into some process optimization? I\'m fired up and ready to help you eliminate whatever repetitive tasks are slowing you down!`;
  };

  const quickActions = [
    { icon: Workflow, text: "Create Workflow", action: () => sendMessage("I want to create a workflow") },
    { icon: Zap, text: "Set Up Rules", action: () => sendMessage("I want to set up automation rules") },
    { icon: TrendingUp, text: "Optimize Process", action: () => sendMessage("I want to optimize a process") },
    { icon: Cpu, text: "Build Automation", action: () => sendMessage("I want to build automation") },
    { icon: Settings, text: "System Integration", action: () => sendMessage("I want to integrate systems") },
    { icon: BarChart3, text: "Monitor Performance", action: () => sendMessage("I want to monitor automation performance") }
  ];

  const activeWorkflows = [
    {
      name: "Auto-Categorization",
      status: "active",
      efficiency: "95%",
      timeSaved: "2.5 hrs/week",
      icon: CheckCircle
    },
    {
      name: "Payment Automation",
      status: "active",
      efficiency: "98%",
      timeSaved: "1.8 hrs/week",
      icon: CheckCircle
    },
    {
      name: "Budget Alerts",
      status: "active",
      efficiency: "92%",
      timeSaved: "1.2 hrs/week",
      icon: CheckCircle
    },
    {
      name: "Receipt Processing",
      status: "draft",
      efficiency: "87%",
      timeSaved: "3.1 hrs/week",
      icon: AlertTriangle
    },
    {
      name: "Investment Rebalancing",
      status: "active",
      efficiency: "96%",
      timeSaved: "0.8 hrs/week",
      icon: CheckCircle
    },
    {
      name: "Expense Reporting",
      status: "draft",
      efficiency: "89%",
      timeSaved: "2.4 hrs/week",
      icon: AlertTriangle
    }
  ];

  const automaTips = [
    {
      icon: Lightbulb,
      title: "Start Simple",
      description: "Begin with basic workflows and add complexity"
    },
    {
      icon: Shield,
      title: "Test Thoroughly",
      description: "Verify automation works before relying on it"
    },
    {
      icon: Eye,
      title: "Monitor Performance",
      description: "Track efficiency and time savings"
    },
    {
      icon: RefreshCw,
      title: "Update Regularly",
      description: "Keep workflows current with your needs"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
        {/* Automa Header */}
        <div
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🤖</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Automa</h1>
              <p className="text-white/70 text-sm">Workflow Automation AI</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-2">
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-white/10 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="text-xl">🤖</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Automa</h2>
                    <p className="text-white/60 text-sm">Workflow Automation Specialist</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-60 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Automa is processing...</span>
                      </div>
                    </div>
                  </div>
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
                    placeholder="Ask Automa about workflow automation, rules, optimization, or system integration..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Workflow Automation Actions</h3>
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
            </div>

            {/* Active Workflows */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Active Workflows</h3>
              <div className="space-y-3">
                {activeWorkflows.map((workflow, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <workflow.icon className={`w-4 h-4 ${
                          workflow.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                        }`} />
                        <span className="text-white text-sm font-medium">{workflow.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded text-xs ${
                          workflow.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {workflow.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Efficiency: {workflow.efficiency}</span>
                      <span>Saved: {workflow.timeSaved}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automa's Tips */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Automa's Tips</h3>
              <div className="space-y-3">
                {automaTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-indigo-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automa's Stats */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Automa's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Workflows Created</span>
                  <span className="text-indigo-400">24</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Time Saved</span>
                  <span className="text-green-400">12.8 hrs/week</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Efficiency Gain</span>
                  <span className="text-blue-400">94.2%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Active Rules</span>
                  <span className="text-purple-400">156</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
