import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  LineChart,
  Activity,
  Target,
  Eye,
  Brain,
  Lightbulb,
  Send, 
  Loader2,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
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
  Shield,
  Target as TargetIcon,
  BarChart3 as BarChart3Icon,
  Activity as ActivityIcon,
  Eye as EyeIcon,
  Cpu,
  Workflow,
  Cog,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  FileText,
  Database,
  Filter,
  Search,
  Download,
  Share2,
  Settings,
  Info,
  HelpCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Bot,
  MessageSquare,
  Star,
  Crown,
  Zap as ZapIcon,
  TrendingUp as TrendingUpIcon,
  Users as UsersIcon,
  Award,
  Trophy,
  Medal,
  Badge,
  Sparkles,
  Rocket,
  Target as TargetIcon2,
  BarChart3 as BarChart3Icon2,
  Activity as ActivityIcon2,
  Eye as EyeIcon2,
  Brain as BrainIcon,
  Lightbulb as LightbulbIcon,
  Cpu as CpuIcon,
  Workflow as WorkflowIcon,
  Automation as AutomationIcon,
  RefreshCw as RefreshCwIcon,
  Plus as PlusIcon,
  Edit3 as Edit3Icon,
  Trash2 as Trash2Icon,
  Calendar as CalendarIcon,
  DollarSign as DollarSignIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  FileText as FileTextIcon,
  Database as DatabaseIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Share2 as Share2Icon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  HelpCircle as HelpCircleIcon,
  Maximize2 as Maximize2Icon,
  Minimize2 as Minimize2Icon,
  RotateCcw as RotateCcwIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipForward as SkipForwardIcon,
  SkipBack as SkipBackIcon
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';
import FileUpload from '../../components/ui/FileUpload';
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

interface DashMessage {
  role: 'user' | 'dash' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function AnalyticsAI() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DashMessage[]>([
    {
      role: 'dash',
      content: "Hello! I'm 📈 Dash, your Analytics AI! I help you understand your financial data through advanced analytics, insights, and visualizations to make data-driven financial decisions. I can analyze spending patterns, track performance metrics, identify trends, generate insights, and create comprehensive financial reports. What would you like to analyze in your financial data today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [dashConfig, setDashConfig] = useState<any>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Dash's config
  useEffect(() => {
    const initializeDash = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Dash's configuration
      const config = await getEmployeeConfig('dash');
      setDashConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'dash', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as DashMessage[]);
      }
    };

    initializeDash();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (files: File[]) => {
    if (!user?.id || isLoading) return;
    
    // Create a message about the uploaded files
    const fileNames = files.map(f => f.name).join(', ');
    const uploadMessage = `I've uploaded ${files.length} file(s): ${fileNames}. Please analyze these files and provide insights.`;
    
    await sendMessage(uploadMessage);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: DashMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'dash', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'dash', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Dash's response based on the user's query
      const dashResponse = await generateDashResponse(content);

      const processingTime = Date.now() - startTime;

      const dashMessage: DashMessage = {
        role: 'dash',
        content: dashResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, dashMessage]);

      // Save Dash's response to conversation
      await addMessageToConversation(user.id, 'dash', conversationId, dashMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'dash');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: DashMessage = {
        role: 'dash',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDashResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Dash's specialized responses for analytics queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there') || query.includes('how are you')) {
      return `Visual storytelling time, ${userName}! 📊 I just finished creating some beautiful new charts of your spending patterns - the colors actually tell a really interesting story about your financial habits. Want to see how your money moves through your life?`;
    }
    
    if (query.includes('analyze') || query.includes('analytics') || query.includes('data') || query.includes('insights')) {
      return `📊 Fantastic! Let's dive deep into your financial data and uncover valuable insights. Here's my comprehensive analytics approach:

**Financial Analytics Framework:**

**1. Spending Pattern Analysis:**
• **Category Breakdown** - Analyze spending by category, merchant, and time period
• **Trend Analysis** - Identify spending trends over weeks, months, and years
• **Seasonal Patterns** - Discover seasonal spending variations and cycles
• **Anomaly Detection** - Flag unusual spending patterns and outliers
• **Recurring Expenses** - Identify and track recurring payment patterns
• **Spending Velocity** - Track how quickly money is spent after income

**2. Income Analysis:**
• **Income Sources** - Analyze income from different sources and streams
• **Income Stability** - Assess income consistency and volatility
• **Growth Trends** - Track income growth over time
• **Seasonal Income** - Identify seasonal income patterns
• **Income vs. Expenses** - Compare income to spending patterns
• **Cash Flow Analysis** - Track net cash flow and liquidity

**3. Budget Performance Analytics:**
• **Budget vs. Actual** - Compare planned vs. actual spending
• **Category Performance** - Track which categories stay within budget
• **Variance Analysis** - Identify significant budget variances
• **Budget Efficiency** - Measure how well budgets are being followed
• **Rollover Analysis** - Track unused budget rollovers
• **Budget Optimization** - Suggest optimal budget allocations

**4. Investment Analytics:**
• **Portfolio Performance** - Track investment returns and performance
• **Asset Allocation** - Analyze portfolio diversification
• **Risk Metrics** - Calculate portfolio risk and volatility
• **Benchmark Comparison** - Compare performance to market benchmarks
• **Contribution Analysis** - Track investment contributions and timing
• **Tax Efficiency** - Analyze tax implications of investment decisions

**5. Goal Progress Analytics:**
• **Goal Achievement** - Track progress toward financial goals
• **Milestone Analysis** - Celebrate and analyze goal milestones
• **Goal Efficiency** - Measure how efficiently goals are being achieved
• **Goal Prioritization** - Analyze which goals are most important
• **Goal Interdependencies** - Understand how goals affect each other
• **Goal Optimization** - Suggest optimal goal strategies

**6. Debt & Credit Analytics:**
• **Debt Reduction** - Track debt payoff progress and strategies
• **Interest Analysis** - Analyze interest costs and optimization opportunities
• **Credit Utilization** - Monitor credit card usage and limits
• **Payment History** - Track payment consistency and timing
• **Debt-to-Income Ratio** - Monitor debt levels relative to income
• **Credit Score Impact** - Analyze factors affecting credit scores

**7. Savings Analytics:**
• **Savings Rate** - Track percentage of income saved
• **Emergency Fund** - Monitor emergency fund adequacy
• **Savings Goals** - Track progress toward savings targets
• **Savings Efficiency** - Measure how efficiently savings are growing
• **Savings Allocation** - Analyze how savings are distributed
• **Compound Growth** - Track the power of compound interest

**8. Financial Health Metrics:**
• **Net Worth Tracking** - Monitor overall financial position
• **Liquidity Analysis** - Assess cash and liquid asset availability
• **Financial Ratios** - Calculate key financial health ratios
• **Stress Testing** - Analyze financial resilience to shocks
• **Retirement Readiness** - Assess retirement preparation
• **Financial Independence** - Track progress toward financial freedom

**9. Comparative Analytics:**
• **Peer Comparison** - Compare to similar demographics
• **Historical Comparison** - Compare to past performance
• **Benchmark Analysis** - Compare to industry standards
• **Goal Benchmarking** - Compare to goal targets
• **Market Comparison** - Compare to market performance
• **Best Practice Analysis** - Compare to financial best practices

**10. Predictive Analytics:**
• **Spending Forecasting** - Predict future spending patterns
• **Income Projections** - Forecast future income streams
• **Goal Achievement** - Predict goal completion timelines
• **Market Predictions** - Analyze market trend implications
• **Risk Assessment** - Predict potential financial risks
• **Opportunity Identification** - Identify financial opportunities

**Pro Tips:**
• **Start with Key Metrics** - Focus on the most important financial indicators
• **Track Consistently** - Regular tracking provides better insights
• **Look for Patterns** - Identify recurring patterns and trends
• **Set Benchmarks** - Establish baseline metrics for comparison
• **Monitor Changes** - Track how metrics change over time
• **Take Action** - Use insights to make informed financial decisions

What specific aspect of your financial data would you like to analyze?`;
    }

    if (query.includes('trend') || query.includes('pattern') || query.includes('over time') || query.includes('history')) {
      return `📈 Excellent! Let's analyze trends and patterns in your financial data to understand how your financial behavior evolves over time. Here's my approach to trend analysis:

**Trend Analysis Framework:**

**1. Spending Trend Analysis:**
• **Monthly Trends** - Track how spending changes month-to-month
• **Seasonal Patterns** - Identify spending patterns by season
• **Weekly Patterns** - Analyze spending behavior throughout the week
• **Year-over-Year** - Compare spending to the same period last year
• **Growth Rates** - Calculate spending growth or decline rates
• **Trend Projections** - Predict future spending based on trends

**2. Income Trend Analysis:**
• **Income Growth** - Track income increases over time
• **Income Stability** - Analyze income consistency and volatility
• **Multiple Income Streams** - Track income from different sources
• **Seasonal Income** - Identify seasonal income patterns
• **Income Cycles** - Understand income cycles and patterns
• **Income Forecasting** - Predict future income based on trends

**3. Category Trend Analysis:**
• **Category Growth** - Track which spending categories are growing
• **Category Decline** - Identify categories with decreasing spending
• **Category Shifts** - Analyze how spending priorities change
• **New Categories** - Identify emerging spending categories
• **Category Correlation** - Find relationships between categories
• **Category Optimization** - Suggest category spending adjustments

**4. Budget Trend Analysis:**
• **Budget Adherence** - Track how well budgets are followed over time
• **Budget Adjustments** - Analyze how budgets evolve
• **Budget Efficiency** - Measure budget effectiveness trends
• **Budget Learning** - Track improvements in budget planning
• **Budget Flexibility** - Analyze budget adaptability
• **Budget Optimization** - Identify optimal budget strategies

**5. Savings Trend Analysis:**
• **Savings Rate Trends** - Track changes in savings rate over time
• **Savings Growth** - Analyze savings account growth patterns
• **Savings Consistency** - Measure savings regularity
• **Savings Goals** - Track progress toward savings targets
• **Savings Efficiency** - Analyze savings optimization
• **Compound Growth** - Track the impact of compound interest

**6. Investment Trend Analysis:**
• **Portfolio Growth** - Track investment portfolio performance
• **Contribution Trends** - Analyze investment contribution patterns
• **Market Correlation** - Compare portfolio to market trends
• **Risk-Adjusted Returns** - Analyze risk-adjusted performance
• **Rebalancing Impact** - Track the effect of portfolio rebalancing
• **Investment Strategy** - Analyze investment approach effectiveness

**7. Debt Trend Analysis:**
• **Debt Reduction** - Track debt payoff progress over time
• **Interest Costs** - Analyze interest expense trends
• **Credit Utilization** - Monitor credit usage patterns
• **Payment Patterns** - Track payment consistency and timing
• **Debt Consolidation** - Analyze debt consolidation effectiveness
• **Credit Score Trends** - Track credit score changes

**8. Goal Progress Trends:**
• **Goal Achievement** - Track progress toward financial goals
• **Goal Milestones** - Analyze goal milestone patterns
• **Goal Efficiency** - Measure goal achievement efficiency
• **Goal Prioritization** - Track how goal priorities change
• **Goal Interdependencies** - Analyze goal relationships
• **Goal Optimization** - Identify optimal goal strategies

**9. Financial Health Trends:**
• **Net Worth Growth** - Track overall financial position changes
• **Liquidity Trends** - Analyze cash and liquid asset changes
• **Financial Ratios** - Track key financial health metrics
• **Stress Test Results** - Analyze financial resilience over time
• **Retirement Readiness** - Track retirement preparation progress
• **Financial Independence** - Monitor progress toward financial freedom

**10. Comparative Trend Analysis:**
• **Peer Comparison** - Compare trends to similar demographics
• **Market Comparison** - Compare to market performance trends
• **Benchmark Analysis** - Compare to industry standard trends
• **Goal Benchmarking** - Compare to goal target trends
• **Best Practice Trends** - Compare to financial best practices
• **Historical Comparison** - Compare to personal historical trends

**Pro Tips:**
• **Look for Patterns** - Identify recurring patterns and cycles
• **Consider Context** - Understand what drives trend changes
• **Set Benchmarks** - Establish baseline trends for comparison
• **Monitor Changes** - Track how trends evolve over time
• **Take Action** - Use trend insights to make informed decisions
• **Plan Ahead** - Use trends to predict and plan for the future

What specific trends would you like to analyze in your financial data?`;
    }

    if (query.includes('performance') || query.includes('metrics') || query.includes('kpi') || query.includes('measure')) {
      return `📊 Perfect! Let's measure and track key performance indicators (KPIs) to understand your financial performance. Here's my approach to performance metrics:

**Financial Performance Metrics Framework:**

**1. Spending Performance Metrics:**
• **Spending Rate** - Percentage of income spent vs. saved
• **Category Efficiency** - How well spending aligns with priorities
• **Spending Velocity** - How quickly money is spent after income
• **Discretionary vs. Essential** - Ratio of discretionary to essential spending
• **Spending Consistency** - Regularity and predictability of spending
• **Spending Optimization** - Efficiency of spending decisions

**2. Income Performance Metrics:**
• **Income Growth Rate** - Annual percentage increase in income
• **Income Stability** - Consistency and predictability of income
• **Income Diversification** - Number and variety of income sources
• **Income Efficiency** - How effectively income is generated
• **Income Utilization** - How well income is allocated
• **Income Sustainability** - Long-term viability of income streams

**3. Budget Performance Metrics:**
• **Budget Adherence Rate** - Percentage of categories within budget
• **Budget Variance** - Average deviation from budget targets
• **Budget Efficiency** - How well budgets are planned and executed
• **Budget Learning Rate** - Improvement in budget accuracy over time
• **Budget Flexibility** - Ability to adapt budgets to changing circumstances
• **Budget Optimization** - Effectiveness of budget allocation strategies

**4. Savings Performance Metrics:**
• **Savings Rate** - Percentage of income saved
• **Savings Growth Rate** - Annual increase in savings
• **Emergency Fund Adequacy** - Months of expenses covered by emergency fund
• **Savings Goal Achievement** - Progress toward savings targets
• **Savings Efficiency** - How effectively savings goals are pursued
• **Compound Growth Impact** - Effect of compound interest on savings

**5. Investment Performance Metrics:**
• **Portfolio Return** - Total return on investment portfolio
• **Risk-Adjusted Return** - Return relative to risk taken
• **Asset Allocation Efficiency** - Effectiveness of portfolio diversification
• **Contribution Consistency** - Regularity of investment contributions
• **Rebalancing Effectiveness** - Impact of portfolio rebalancing
• **Tax Efficiency** - Tax optimization of investment decisions

**6. Debt Performance Metrics:**
• **Debt-to-Income Ratio** - Total debt relative to income
• **Debt Reduction Rate** - Speed of debt payoff
• **Interest Cost Efficiency** - Minimization of interest expenses
• **Credit Utilization Rate** - Percentage of available credit used
• **Payment Consistency** - Regularity of debt payments
• **Credit Score Impact** - Effect of debt management on credit score

**7. Goal Performance Metrics:**
• **Goal Achievement Rate** - Percentage of goals achieved on time
• **Goal Progress Velocity** - Speed of progress toward goals
• **Goal Efficiency** - How effectively goals are pursued
• **Goal Prioritization** - Effectiveness of goal prioritization
• **Goal Interdependencies** - How well goals support each other
• **Goal Optimization** - Effectiveness of goal strategies

**8. Financial Health Metrics:**
• **Net Worth Growth Rate** - Annual increase in net worth
• **Liquidity Ratio** - Cash and liquid assets relative to expenses
• **Financial Independence Ratio** - Progress toward financial independence
• **Retirement Readiness Score** - Preparation for retirement
• **Financial Stress Level** - Level of financial stress and anxiety
• **Financial Resilience** - Ability to withstand financial shocks

**9. Efficiency Metrics:**
• **Time Efficiency** - Time spent on financial management
• **Cost Efficiency** - Cost of financial services and products
• **Decision Efficiency** - Quality and speed of financial decisions
• **Process Efficiency** - Effectiveness of financial processes
• **Automation Efficiency** - Level and effectiveness of automation
• **Learning Efficiency** - Rate of financial knowledge improvement

**10. Comparative Performance Metrics:**
• **Peer Comparison** - Performance relative to similar demographics
• **Market Comparison** - Performance relative to market benchmarks
• **Goal Benchmarking** - Performance relative to goal targets
• **Historical Comparison** - Performance relative to past periods
• **Best Practice Comparison** - Performance relative to financial best practices
• **Industry Standards** - Performance relative to industry averages

**Pro Tips:**
• **Focus on Key Metrics** - Track the most important indicators for your goals
• **Set Targets** - Establish specific targets for each metric
• **Monitor Regularly** - Track metrics consistently over time
• **Analyze Trends** - Look for patterns and changes in metrics
• **Take Action** - Use metrics to guide financial decisions
• **Celebrate Progress** - Acknowledge improvements in performance

What specific performance metrics would you like to track and analyze?`;
    }

    if (query.includes('report') || query.includes('dashboard') || query.includes('summary') || query.includes('overview')) {
      return `📋 Excellent! Let's create comprehensive financial reports and dashboards to give you a complete overview of your financial situation. Here's my approach to financial reporting:

**Financial Reporting Framework:**

**1. Monthly Financial Reports:**
• **Income Summary** - Total income, sources, and growth
• **Expense Summary** - Total spending, categories, and trends
• **Savings Summary** - Savings rate, progress, and goals
• **Investment Summary** - Portfolio performance and contributions
• **Debt Summary** - Debt levels, payments, and reduction
• **Net Worth Summary** - Overall financial position changes

**2. Category Analysis Reports:**
• **Spending by Category** - Breakdown of expenses by category
• **Category Trends** - How categories change over time
• **Category Efficiency** - How well categories align with priorities
• **Category Optimization** - Suggestions for category improvements
• **Category Benchmarks** - Comparison to typical spending patterns
• **Category Goals** - Progress toward category-specific goals

**3. Budget Performance Reports:**
• **Budget vs. Actual** - Comparison of planned vs. actual spending
• **Budget Variance Analysis** - Explanation of significant variances
• **Budget Efficiency** - How well budgets are being followed
• **Budget Adjustments** - Recommended budget modifications
• **Budget Learning** - Improvements in budget planning
• **Budget Optimization** - Suggestions for better budget allocation

**4. Goal Progress Reports:**
• **Goal Achievement Summary** - Progress toward all financial goals
• **Goal Milestones** - Recent achievements and upcoming milestones
• **Goal Efficiency** - How effectively goals are being pursued
• **Goal Prioritization** - Current goal priorities and rankings
• **Goal Interdependencies** - How goals affect each other
• **Goal Optimization** - Suggestions for goal strategy improvements

**5. Investment Performance Reports:**
• **Portfolio Summary** - Overall portfolio performance and allocation
• **Asset Class Performance** - Performance by investment type
• **Contribution Analysis** - Investment contributions and timing
• **Risk Analysis** - Portfolio risk and volatility measures
• **Benchmark Comparison** - Performance vs. market benchmarks
• **Rebalancing Recommendations** - Suggested portfolio adjustments

**6. Debt Management Reports:**
• **Debt Summary** - Total debt levels and types
• **Debt Reduction Progress** - Progress toward debt payoff goals
• **Interest Analysis** - Interest costs and optimization opportunities
• **Payment History** - Consistency and timing of payments
• **Credit Utilization** - Credit card usage and limits
• **Credit Score Impact** - Effect of debt management on credit

**7. Cash Flow Reports:**
• **Income vs. Expenses** - Monthly cash flow analysis
• **Cash Flow Trends** - How cash flow changes over time
• **Liquidity Analysis** - Cash and liquid asset availability
• **Emergency Fund Status** - Emergency fund adequacy
• **Cash Flow Forecasting** - Predicted future cash flow
• **Cash Flow Optimization** - Suggestions for improving cash flow

**8. Financial Health Reports:**
• **Net Worth Summary** - Overall financial position
• **Financial Ratios** - Key financial health indicators
• **Stress Test Results** - Financial resilience analysis
• **Retirement Readiness** - Preparation for retirement
• **Financial Independence** - Progress toward financial freedom
• **Financial Wellness Score** - Overall financial health rating

**9. Comparative Analysis Reports:**
• **Peer Comparison** - Comparison to similar demographics
• **Market Comparison** - Comparison to market performance
• **Historical Comparison** - Comparison to past periods
• **Goal Benchmarking** - Comparison to goal targets
• **Best Practice Analysis** - Comparison to financial best practices
• **Industry Standards** - Comparison to industry averages

**10. Custom Dashboard Reports:**
• **Executive Summary** - High-level financial overview
• **Key Performance Indicators** - Most important financial metrics
• **Trend Analysis** - Key trends and patterns
• **Alert Summary** - Important financial alerts and notifications
• **Action Items** - Recommended financial actions
• **Forecast Summary** - Predicted financial outcomes

**Pro Tips:**
• **Focus on Key Insights** - Highlight the most important information
• **Use Visualizations** - Charts and graphs make data easier to understand
• **Provide Context** - Explain what the numbers mean
• **Include Recommendations** - Suggest actions based on the data
• **Track Progress** - Show how metrics change over time
• **Make it Actionable** - Ensure reports lead to better decisions

What type of financial report or dashboard would you like to create?`;
    }

    if (query.includes('insight') || query.includes('discovery') || query.includes('finding') || query.includes('observation')) {
      return `💡 Fantastic! Let's uncover hidden insights and discoveries in your financial data to help you make better decisions. Here's my approach to financial insights:

**Financial Insights Framework:**

**1. Spending Insights:**
• **Hidden Patterns** - Discover spending patterns you weren't aware of
• **Spending Triggers** - Identify what causes increased spending
• **Efficiency Opportunities** - Find ways to spend less for the same value
• **Category Relationships** - Discover how spending in one category affects others
• **Seasonal Insights** - Understand how seasons affect your spending
• **Lifestyle Impact** - See how lifestyle changes affect spending

**2. Income Insights:**
• **Income Optimization** - Discover ways to increase income
• **Income Stability** - Understand income volatility and its causes
• **Multiple Streams** - Identify opportunities for additional income
• **Income Efficiency** - Find ways to earn more with less effort
• **Market Opportunities** - Discover income opportunities in the market
• **Skill Development** - Identify skills that could increase income

**3. Budget Insights:**
• **Budget Reality Gap** - Discover differences between planned and actual spending
• **Budget Optimization** - Find optimal budget allocations
• **Budget Learning** - Understand how to improve budget planning
• **Budget Flexibility** - Discover how to make budgets more adaptable
• **Budget Efficiency** - Find ways to stick to budgets better
• **Budget Psychology** - Understand the psychology behind budget adherence

**4. Savings Insights:**
• **Savings Opportunities** - Discover ways to save more money
• **Savings Psychology** - Understand what motivates saving
• **Compound Growth** - See the power of compound interest in action
• **Savings Optimization** - Find optimal savings strategies
• **Emergency Fund Insights** - Understand emergency fund adequacy
• **Savings Goal Alignment** - Discover if savings align with goals

**5. Investment Insights:**
• **Portfolio Optimization** - Discover ways to improve portfolio performance
• **Risk-Return Balance** - Understand your risk tolerance and return expectations
• **Market Timing** - Discover optimal times for investment decisions
• **Diversification Opportunities** - Find ways to diversify your portfolio
• **Tax Efficiency** - Discover tax optimization opportunities
• **Investment Psychology** - Understand investment decision-making patterns

**6. Debt Insights:**
• **Debt Optimization** - Discover ways to reduce debt faster
• **Interest Cost Analysis** - Understand the true cost of debt
• **Debt Psychology** - Understand debt accumulation patterns
• **Credit Optimization** - Discover ways to improve credit scores
• **Debt Consolidation** - Find opportunities for debt consolidation
• **Payment Optimization** - Discover optimal payment strategies

**7. Goal Insights:**
• **Goal Alignment** - Discover if goals align with values and priorities
• **Goal Interdependencies** - Understand how goals affect each other
• **Goal Optimization** - Find ways to achieve goals more efficiently
• **Goal Psychology** - Understand what motivates goal achievement
• **Goal Realism** - Discover if goals are realistic and achievable
• **Goal Prioritization** - Find optimal goal prioritization strategies

**8. Behavioral Insights:**
• **Financial Psychology** - Understand your financial decision-making patterns
• **Spending Triggers** - Discover what triggers spending decisions
• **Saving Motivators** - Understand what motivates saving behavior
• **Investment Behavior** - Discover investment decision patterns
• **Risk Tolerance** - Understand your true risk tolerance
• **Financial Stress** - Discover sources of financial stress

**9. Market Insights:**
• **Market Opportunities** - Discover investment opportunities in the market
• **Economic Impact** - Understand how economic conditions affect your finances
• **Industry Trends** - Discover trends that could affect your income or investments
• **Regulatory Changes** - Understand how regulations affect your finances
• **Technology Impact** - Discover how technology affects financial opportunities
• **Global Trends** - Understand global trends that could affect your finances

**10. Predictive Insights:**
• **Future Spending** - Predict future spending patterns
• **Income Projections** - Forecast future income streams
• **Goal Achievement** - Predict goal completion timelines
• **Market Predictions** - Forecast market trends and opportunities
• **Risk Assessment** - Predict potential financial risks
• **Opportunity Identification** - Identify future financial opportunities

**Pro Tips:**
• **Look for Patterns** - Identify recurring patterns in your financial behavior
• **Ask Why** - Understand the reasons behind financial decisions
• **Consider Context** - Look at the broader context of financial data
• **Think Long-term** - Consider long-term implications of financial decisions
• **Stay Curious** - Always look for new insights and discoveries
• **Take Action** - Use insights to make better financial decisions

What specific insights would you like to discover in your financial data?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `📈 I'm here to help you understand your financial data and make data-driven decisions! Here's how I can support your analytics journey:

**My Analytics Expertise:**
📊 **Data Analysis** - Deep analysis of your financial data
📈 **Trend Analysis** - Identify patterns and trends over time
📋 **Performance Metrics** - Track key financial indicators
💡 **Insights Generation** - Uncover hidden insights and discoveries
📊 **Report Creation** - Generate comprehensive financial reports
🎯 **Goal Tracking** - Monitor progress toward financial goals
📊 **Comparative Analysis** - Compare to benchmarks and peers
🔮 **Predictive Analytics** - Forecast future financial outcomes

**How I Can Help:**
• Analyze spending patterns and identify trends
• Track performance metrics and key indicators
• Generate insights and discoveries from your data
• Create comprehensive financial reports and dashboards
• Monitor progress toward financial goals
• Compare your performance to benchmarks
• Predict future financial outcomes
• Provide data-driven financial advice

**My Approach:**
I believe that understanding your financial data is the key to making better financial decisions. I help you turn raw data into actionable insights that drive financial success.

**My Promise:**
I'll help you build a comprehensive understanding of your financial data that empowers you to make informed, data-driven financial decisions.

**Pro Tip:** The best financial decisions are based on data, not guesswork!

What specific aspect of financial analytics would you like to explore?`;
    }

    // Default response for other queries
    return `📈 I understand you're asking about "${userQuery}". As your Analytics AI, I'm here to help with:

**Financial Analytics Topics I Cover:**
• Data analysis and pattern recognition
• Trend analysis and forecasting
• Performance metrics and KPIs
• Insights generation and discovery
• Report creation and dashboards
• Goal tracking and progress monitoring
• Comparative analysis and benchmarking
• Predictive analytics and forecasting

**My Analytics Philosophy:**
Understanding your financial data is the key to making better financial decisions. I help you turn raw data into actionable insights that drive financial success.

**My Promise:**
I'll help you build a comprehensive understanding of your financial data that empowers you to make informed, data-driven financial decisions.

Could you tell me more specifically what analytics topic you'd like to discuss? I'm ready to help you analyze your financial data!`;
  };

  const quickActions = [
    { icon: BarChart3, text: "Analyze Data", action: () => sendMessage("I want to analyze my financial data") },
    { icon: TrendingUp, text: "Track Trends", action: () => sendMessage("I want to track trends in my finances") },
    { icon: Activity, text: "Performance Metrics", action: () => sendMessage("I want to see my performance metrics") },
    { icon: Brain, text: "Generate Insights", action: () => sendMessage("I want to generate insights from my data") },
    { icon: FileText, text: "Create Reports", action: () => sendMessage("I want to create financial reports") },
    { icon: Eye, text: "Data Overview", action: () => sendMessage("I want an overview of my financial data") }
  ];

  const keyMetrics = [
    {
      name: "Net Worth",
      value: "$127,450",
      change: "+12.3%",
      trend: "up",
      icon: TrendingUp
    },
    {
      name: "Savings Rate",
      value: "23.4%",
      change: "+2.1%",
      trend: "up",
      icon: TrendingUp
    },
    {
      name: "Spending Efficiency",
      value: "87.2%",
      change: "-1.5%",
      trend: "down",
      icon: TrendingDown
    },
    {
      name: "Investment Return",
      value: "8.7%",
      change: "+1.2%",
      trend: "up",
      icon: TrendingUp
    },
    {
      name: "Debt-to-Income",
      value: "18.3%",
      change: "-2.1%",
      trend: "up",
      icon: TrendingUp
    },
    {
      name: "Emergency Fund",
      value: "6.2 months",
      change: "+0.3 months",
      trend: "up",
      icon: TrendingUp
    }
  ];

  const dashTips = [
    {
      icon: Lightbulb,
      title: "Focus on Trends",
      description: "Look for patterns over time, not just current values"
    },
    {
      icon: Target,
      title: "Set Benchmarks",
      description: "Compare your metrics to goals and standards"
    },
    {
      icon: Eye,
      title: "Monitor Regularly",
      description: "Track key metrics consistently for better insights"
    },
    {
      icon: Brain,
      title: "Ask Why",
      description: "Understand the reasons behind the numbers"
    }
  ];

  // AI Team Analytics Data
  const aiEmployees = [
    {
      id: 'prime',
      name: 'Prime',
      emoji: '👑',
      role: 'Boss AI',
      expertise: 'General Management & Routing',
      usage: 156,
      rating: 4.9,
      status: 'active',
      color: 'yellow',
      icon: Crown
    },
    {
      id: 'byte',
      name: 'Byte',
      emoji: '📄',
      role: 'Smart Import AI',
      expertise: 'Data Import & Processing',
      usage: 89,
      rating: 4.7,
      status: 'active',
      color: 'blue',
      icon: FileText
    },
    {
      id: 'finley',
      name: 'Finley',
      emoji: '💼',
      role: 'Financial Assistant',
      expertise: 'Financial Advice & Planning',
      usage: 234,
      rating: 4.8,
      status: 'active',
      color: 'green',
      icon: Briefcase
    },
    {
      id: 'goalie',
      name: 'Goalie',
      emoji: '🥅',
      role: 'Goal Concierge',
      expertise: 'Goal Setting & Achievement',
      usage: 67,
      rating: 4.6,
      status: 'active',
      color: 'purple',
      icon: Target
    },
    {
      id: 'crystal',
      name: 'Crystal',
      emoji: '🔮',
      role: 'Spending Predictions AI',
      expertise: 'Forecasting & Predictions',
      usage: 123,
      rating: 4.5,
      status: 'active',
      color: 'pink',
      icon: Crystal
    },
    {
      id: 'luna',
      name: 'Luna',
      emoji: '🌙',
      role: 'Financial Therapist',
      expertise: 'Emotional Support & Wellness',
      usage: 45,
      rating: 4.9,
      status: 'active',
      color: 'indigo',
      icon: Heart
    },
    {
      id: 'tag',
      name: 'Tag',
      emoji: '🏷️',
      role: 'AI Categorization',
      expertise: 'Data Organization & Categorization',
      usage: 178,
      rating: 4.7,
      status: 'active',
      color: 'orange',
      icon: Tag
    },
    {
      id: 'liberty',
      name: 'Liberty',
      emoji: '🗽',
      role: 'Financial Freedom AI',
      expertise: 'Independence & Freedom Strategies',
      usage: 34,
      rating: 4.8,
      status: 'active',
      color: 'red',
      icon: Flag
    },
    {
      id: 'chime',
      name: 'Chime',
      emoji: '🔔',
      role: 'Bill Reminder',
      expertise: 'Payment Management & Reminders',
      usage: 156,
      rating: 4.6,
      status: 'active',
      color: 'yellow',
      icon: Bell
    },
    {
      id: 'blitz',
      name: 'Blitz',
      emoji: '⚡',
      role: 'Smart Automation',
      expertise: 'Workflow Automation & Optimization',
      usage: 78,
      rating: 4.7,
      status: 'active',
      color: 'blue',
      icon: Zap
    },
    {
      id: 'intelia',
      name: 'Intelia',
      emoji: '🧠',
      role: 'Business Intelligence AI',
      expertise: 'Strategic Insights & Analysis',
      usage: 92,
      rating: 4.8,
      status: 'active',
      color: 'purple',
      icon: Brain
    },
    {
      id: 'roundtable',
      name: 'The Roundtable',
      emoji: '🎙️',
      role: 'Personal Podcast AI',
      expertise: 'Audio Content & Communication',
      usage: 23,
      rating: 4.4,
      status: 'active',
      color: 'green',
      icon: Mic
    },
    {
      id: 'wave',
      name: 'Wave',
      emoji: '🌊',
      role: 'Spotify Integration AI',
      expertise: 'Music-Financial Insights',
      usage: 56,
      rating: 4.3,
      status: 'active',
      color: 'teal',
      icon: Music
    },
    {
      id: 'ledger',
      name: 'Ledger',
      emoji: '📊',
      role: 'Tax Assistant AI',
      expertise: 'Tax Preparation & Compliance',
      usage: 89,
      rating: 4.7,
      status: 'active',
      color: 'gray',
      icon: Calculator
    },
    {
      id: 'automa',
      name: 'Automa',
      emoji: '🤖',
      role: 'Workflow Automation AI',
      expertise: 'Process Optimization & Automation',
      usage: 67,
      rating: 4.6,
      status: 'active',
      color: 'indigo',
      icon: Workflow
    },
    {
      id: 'dash',
      name: 'Dash',
      emoji: '📈',
      role: 'Analytics AI',
      expertise: 'Data Analysis & Insights',
      usage: 145,
      rating: 4.9,
      status: 'active',
      color: 'blue',
      icon: BarChart3
    },
    {
      id: 'custodian',
      name: 'Custodian',
      emoji: '🛡️',
      role: 'Security & Compliance AI',
      expertise: 'Security & Regulatory Compliance',
      usage: 34,
      rating: 4.8,
      status: 'active',
      color: 'emerald',
      icon: Shield
    }
  ];

  const aiTeamStats = [
    {
      name: "Total AI Employees",
      value: "17",
      change: "+0",
      trend: "stable",
      icon: Users
    },
    {
      name: "Active Conversations",
      value: "1,847",
      change: "+12.3%",
      trend: "up",
      icon: MessageSquare
    },
    {
      name: "Average Rating",
      value: "4.7/5.0",
      change: "+0.1",
      trend: "up",
      icon: Star
    },
    {
      name: "Team Efficiency",
      value: "94.2%",
      change: "+2.1%",
      trend: "up",
      icon: TrendingUp
    }
  ];

  const topPerformers = aiEmployees
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 5);

  const aiCategories = [
    {
      name: "Financial Management",
      count: 6,
      color: "blue",
      employees: ["Prime", "Finley", "Goalie", "Crystal", "Liberty", "Ledger"]
    },
    {
      name: "Data & Analytics",
      count: 4,
      color: "purple",
      employees: ["Byte", "Tag", "Dash", "Intelia"]
    },
    {
      name: "Automation & Efficiency",
      count: 3,
      color: "green",
      employees: ["Blitz", "Automa", "Chime"]
    },
    {
      name: "Wellness & Support",
      count: 2,
      color: "pink",
      employees: ["Luna", "Roundtable"]
    },
    {
      name: "Security & Compliance",
      count: 1,
      color: "emerald",
      employees: ["Custodian"]
    },
    {
      name: "Integration & Media",
      count: 1,
      color: "orange",
      employees: ["Wave"]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
        {/* Dash Header */}
        <div
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">📈</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dash</h1>
              <p className="text-white/70 text-sm">Analytics AI</p>
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
                  <div className="text-xl">📈</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Dash</h2>
                    <p className="text-white/60 text-sm">Analytics Specialist</p>
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
                        ? 'bg-blue-600 text-white'
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
                        <span>Dash is analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

                             {/* Input Area */}
               <div className="p-4 border-t border-white/10">
                 <div className="flex gap-2">
                   <button
                     onClick={() => setShowFileUpload(!showFileUpload)}
                     className="p-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white transition-colors"
                     title="Upload files"
                   >
                     <Paperclip className="w-5 h-5" />
                   </button>
                   <input
                     type="text"
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                     placeholder="Ask Dash about analytics, trends, metrics, insights, or reports..."
                     className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                     disabled={isLoading}
                   />
                   <button
                     onClick={() => sendMessage(input)}
                     disabled={isLoading || !input.trim()}
                     className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                   >
                     <Send className="w-5 h-5" />
                   </button>
                 </div>
                 
                 {/* File Upload Area */}
                 
                   {showFileUpload && (
                     <div
                       className="mt-4 pt-4 border-t border-white/10"
                     >
                       <FileUpload
                         onFileUpload={handleFileUpload}
                         acceptedTypes={['image/*', 'application/pdf', 'text/csv', '.xlsx', '.xls', 'application/json']}
                         maxFiles={5}
                         maxSize={10}
                         disabled={isLoading}
                       />
                     </div>
                   )}
                 
               </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Analytics Actions</h3>
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

            {/* Key Metrics */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
              <div className="space-y-3">
                {keyMetrics.map((metric, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <metric.icon className={`w-4 h-4 ${
                          metric.trend === 'up' ? 'text-green-400' : 'text-red-400'
                        }`} />
                        <span className="text-white text-sm font-medium">{metric.name}</span>
                      </div>
                      <span className={`text-sm ${
                        metric.trend === 'up' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metric.change}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-white">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dash's Tips */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Dash's Tips</h3>
              <div className="space-y-3">
                {dashTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dash's Stats */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Dash's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Reports Generated</span>
                  <span className="text-blue-400">47</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Insights Discovered</span>
                  <span className="text-green-400">156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Trends Identified</span>
                  <span className="text-purple-400">89</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Metrics Tracked</span>
                  <span className="text-orange-400">24</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
