import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Tag, 
  FolderOpen, 
  Search, 
  Bot, 
  Send, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  BarChart3,
  Filter,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
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

interface TagMessage {
  role: 'user' | 'tag' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function AICategorizationPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TagMessage[]>([
    {
      role: 'tag',
      content: "Hi! I'm 🏷️ Tag, your AI Categorization specialist! I help you organize and categorize your transactions with precision and intelligence. I can explain categorization rules, help improve accuracy, create custom categories, and make sure your financial data is perfectly organized. What would you like to know about transaction categorization?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [tagConfig, setTagConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Tag's config
  useEffect(() => {
    const initializeTag = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Tag's configuration
      const config = await getEmployeeConfig('tag');
      setTagConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'tag', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as TagMessage[]);
      }
    };

    initializeTag();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: TagMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'tag', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'tag', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Tag's response based on the user's query
      const tagResponse = await generateTagResponse(content);

      const processingTime = Date.now() - startTime;

      const tagMessage: TagMessage = {
        role: 'tag',
        content: tagResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-3.5-turbo'
        }
      };

      setMessages(prev => [...prev, tagMessage]);

      // Save Tag's response to conversation
      await addMessageToConversation(user.id, 'tag', conversationId, tagMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'tag');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: TagMessage = {
        role: 'tag',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTagResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Tag's specialized responses for categorization-related queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 🏷️ I'm Tag, your Categorization Specialist. Great to see you! I'm here to help you organize and categorize your financial transactions, set up smart rules, and keep your spending data perfectly organized. What would you like to work on today?`;
    }
    
    if (query.includes('categorize') || query.includes('category') || query.includes('organize') || query.includes('classify')) {
      return `🏷️ Excellent! Let's talk about transaction categorization. Here's how I help organize your financial data:

**My Categorization System:**

**Standard Categories:**
• **Food & Dining** - Restaurants, groceries, coffee shops
• **Transportation** - Gas, public transit, ride-sharing, car maintenance
• **Shopping** - Clothing, electronics, home goods, online purchases
• **Entertainment** - Movies, concerts, games, streaming services
• **Health & Fitness** - Medical expenses, gym memberships, wellness
• **Bills & Utilities** - Rent, electricity, internet, phone
• **Income** - Salary, freelance, investments, refunds
• **Savings & Investments** - Emergency fund, retirement, stocks

**Smart Categorization Features:**
• **Merchant Recognition** - I learn from your previous categorizations
• **Pattern Matching** - Similar transactions get consistent categories
• **Amount Analysis** - Large vs. small transactions may be categorized differently
• **Date Patterns** - Recurring transactions get special treatment
• **Location Awareness** - Geographic data helps with categorization

**Accuracy Improvements:**
• **Machine Learning** - I get smarter with every transaction
• **User Feedback** - Your corrections help me learn
• **Merchant Database** - Extensive database of business categories
• **Context Awareness** - I consider transaction context and timing

**Pro Tips:**
• **Be consistent** - Categorize similar transactions the same way
• **Use subcategories** - Break down broad categories for better insights
• **Review regularly** - Check categorizations monthly for accuracy
• **Custom categories** - Create categories that match your lifestyle

Would you like me to help you set up custom categories or improve your current categorization?`;
    }

    if (query.includes('custom') || query.includes('create') || query.includes('new category') || query.includes('personalize')) {
      return `✨ Great idea! Custom categories make your financial data much more meaningful. Let me help you create a personalized categorization system.

**Creating Custom Categories:**

**Step 1: Identify Your Needs**
• **Lifestyle Categories** - Travel, hobbies, side hustles
• **Business Categories** - If you're self-employed or have business expenses
• **Goal-Based Categories** - Categories that align with your financial goals
• **Personal Categories** - Categories that reflect your unique spending patterns

**Popular Custom Categories:**
• **Travel Fund** - Vacation savings and travel expenses
• **Side Hustle** - Freelance income and business expenses
• **Home Improvement** - Renovations, repairs, decor
• **Pet Expenses** - Food, vet visits, grooming, toys
• **Education** - Courses, books, workshops, certifications
• **Gifts & Giving** - Presents, donations, charitable giving
• **Emergency Fund** - Savings for unexpected expenses
• **Investment Categories** - Different types of investments

**Best Practices:**
• **Keep it simple** - Don't create too many categories
• **Be specific** - "Coffee Shops" vs. just "Food"
• **Think long-term** - Categories should work for years
• **Align with goals** - Categories should help track progress
• **Use hierarchy** - Main categories with subcategories

**Setting Up Rules:**
• **Merchant Rules** - "Always categorize Starbucks as Coffee"
• **Amount Rules** - "Transactions over $100 in Food = Special Occasion"
• **Date Rules** - "Weekend dining = Entertainment, weekday = Food"
• **Location Rules** - "Gas stations near home = Personal, near work = Business"

**Pro Tips:**
• Start with 10-15 main categories
• Add subcategories as needed
• Review and refine every 3 months
• Use categories that motivate you

What type of custom categories would be most helpful for your financial tracking?`;
    }

    if (query.includes('accuracy') || query.includes('improve') || query.includes('better') || query.includes('fix')) {
      return `🎯 Excellent! Improving categorization accuracy is crucial for meaningful financial insights. Here's my approach to making your categories more precise:

**Accuracy Improvement Strategies:**

**1. Review and Correct:**
• **Monthly Review** - Check last month's categorizations
• **Bulk Corrections** - Fix multiple similar transactions at once
• **Pattern Recognition** - Look for consistent miscategorizations
• **Feedback Loop** - Your corrections teach me to be more accurate

**2. Smart Learning Features:**
• **Merchant Learning** - I remember how you categorize specific businesses
• **Amount Patterns** - Different amounts may need different categories
• **Time Patterns** - Weekend vs. weekday spending patterns
• **Location Context** - Geographic data improves accuracy
• **Frequency Analysis** - Regular transactions get special treatment

**3. Advanced Rules:**
• **Merchant-Specific Rules** - "Always categorize Target as Shopping"
• **Amount-Based Rules** - "Dining over $50 = Special Occasion"
• **Date-Based Rules** - "Friday night dining = Entertainment"
• **Category Exclusions** - "Never categorize gas as Food"
• **Priority Rules** - "If merchant matches multiple rules, use highest priority"

**4. Quality Checks:**
• **Anomaly Detection** - Flag unusual categorizations for review
• **Consistency Checks** - Ensure similar transactions are categorized alike
• **Pattern Validation** - Verify that categorizations make sense over time
• **Accuracy Scoring** - Track how often corrections are needed

**My Accuracy Features:**
• **95%+ accuracy** on standard transactions
• **90%+ accuracy** on complex or ambiguous transactions
• **Continuous learning** from your feedback
• **Merchant database** with millions of businesses
• **Context awareness** for better categorization

**Pro Tips:**
• **Be patient** - Accuracy improves over time
• **Provide feedback** - Every correction helps me learn
• **Use bulk actions** - Fix multiple transactions efficiently
• **Set up rules** - Automate common categorizations

Would you like me to help you review your recent transactions or set up specific categorization rules?`;
    }

    if (query.includes('rule') || query.includes('automate') || query.includes('automatic') || query.includes('set up')) {
      return `⚙️ Fantastic! Setting up categorization rules will save you time and improve accuracy. Let me help you create a smart automation system.

**Categorization Rules Setup:**

**1. Merchant Rules (Most Common):**
• **Exact Match** - "Starbucks" → "Coffee & Dining"
• **Partial Match** - "McDonald's" → "Fast Food"
• **Pattern Match** - "*COFFEE*" → "Coffee & Dining"
• **Multiple Locations** - "Target" → "Shopping" (regardless of location)

**2. Amount-Based Rules:**
• **Threshold Rules** - "Dining > $100" → "Special Occasion"
• **Range Rules** - "Gas $30-$60" → "Transportation"
• **Percentage Rules** - "Top 10% of transactions" → "Large Purchase"

**3. Time-Based Rules:**
• **Day of Week** - "Friday dining" → "Entertainment"
• **Time of Day** - "After 8 PM dining" → "Entertainment"
• **Monthly Patterns** - "First week of month" → "Bills & Utilities"
• **Seasonal Rules** - "December shopping" → "Holiday Expenses"

**4. Location-Based Rules:**
• **Geographic Areas** - "Downtown purchases" → "Work Expenses"
• **Distance from Home** - "Gas stations > 10 miles" → "Travel"
• **Business Districts** - "Financial district" → "Business Expenses"

**5. Category Rules:**
• **Exclusions** - "Never categorize gas as Food"
• **Priorities** - "If multiple matches, use highest priority"
• **Defaults** - "Unknown merchants" → "Miscellaneous"
• **Splits** - "Large purchases" → "Split across multiple categories"

**Setting Up Rules:**
1. **Start Simple** - Begin with your most common merchants
2. **Test Rules** - Apply to past transactions to verify accuracy
3. **Refine Over Time** - Adjust rules based on results
4. **Monitor Performance** - Check rule effectiveness monthly

**Pro Tips:**
• **Order matters** - More specific rules should come first
• **Use wildcards** - "*COFFEE*" catches variations
• **Test thoroughly** - Apply rules to historical data first
• **Keep it simple** - Complex rules can cause confusion

What type of categorization rules would be most helpful for your transactions?`;
    }

    if (query.includes('bulk') || query.includes('multiple') || query.includes('batch') || query.includes('mass')) {
      return `🔄 Great question! Bulk categorization is a powerful way to organize large numbers of transactions efficiently. Here's how I help with mass categorization:

**Bulk Categorization Features:**

**1. Smart Selection Tools:**
• **Date Range** - Select transactions from specific time periods
• **Merchant Filter** - Select all transactions from specific businesses
• **Amount Range** - Select transactions within price ranges
• **Uncategorized** - Find all transactions without categories
• **Category Filter** - Select transactions currently in specific categories

**2. Bulk Actions:**
• **Mass Categorization** - Apply one category to multiple transactions
• **Bulk Rules** - Create rules based on selected transactions
• **Pattern Recognition** - I suggest categories based on selected patterns
• **Split Transactions** - Divide large transactions across multiple categories
• **Merge Categories** - Combine similar categories

**3. Smart Suggestions:**
• **AI Recommendations** - I suggest categories based on transaction patterns
• **Merchant Analysis** - Group similar merchants for bulk categorization
• **Amount Patterns** - Suggest categories based on transaction amounts
• **Time Patterns** - Suggest categories based on when transactions occur
• **Location Patterns** - Suggest categories based on transaction locations

**4. Bulk Operations:**
• **Select All Similar** - "Select all transactions from this merchant"
• **Apply Rule** - "Apply this categorization rule to all selected"
• **Preview Changes** - See what will change before applying
• **Undo Bulk Actions** - Revert bulk changes if needed
• **Export/Import** - Save and load bulk categorization settings

**Best Practices:**
• **Start Small** - Begin with 10-20 transactions to test
• **Preview First** - Always preview bulk changes before applying
• **Backup Data** - Export your data before major bulk operations
• **Review Results** - Check the results of bulk operations
• **Refine Rules** - Use bulk operations to create better rules

**Pro Tips:**
• **Use filters** - Narrow down transactions before bulk operations
• **Test on subset** - Try bulk operations on a small group first
• **Create rules** - Turn successful bulk operations into permanent rules
• **Monitor accuracy** - Check that bulk categorizations are correct

Would you like me to help you set up a bulk categorization operation for your transactions?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🏷️ I'm here to help you master transaction categorization! Here's what I can assist with:

**My Categorization Expertise:**
📊 **Smart Categorization** - AI-powered transaction organization
🎯 **Accuracy Improvement** - Help you achieve 95%+ categorization accuracy
⚙️ **Rule Creation** - Set up automatic categorization rules
🔄 **Bulk Operations** - Efficiently categorize multiple transactions
✨ **Custom Categories** - Create personalized categorization systems
📈 **Analytics** - Use categorization data for better insights
🔧 **System Optimization** - Improve your overall categorization workflow

**How I Can Help:**
• Explain categorization best practices and strategies
• Help you create custom categories that match your lifestyle
• Set up automatic categorization rules to save time
• Improve categorization accuracy through smart learning
• Assist with bulk categorization operations
• Provide insights based on your categorized data
• Troubleshoot categorization issues and questions

**My Approach:**
I combine AI intelligence with human insight to create a categorization system that's both accurate and meaningful. I learn from your preferences and help you organize your financial data in ways that support your goals.

**Pro Tip:** The better your categorization, the more valuable your financial insights become!

What specific aspect of transaction categorization would you like to explore?`;
    }

    // Default response for other queries
    return `Hi ${userName}! 🏷️ I understand you're asking about "${userQuery}". As your AI Categorization specialist, I'm here to help with:

**Categorization Topics I Cover:**
• Smart transaction categorization and organization
• Creating custom categories for your unique needs
• Improving categorization accuracy and consistency
• Setting up automatic categorization rules
• Bulk categorization operations and efficiency
• Using categorized data for financial insights
• Optimizing your categorization workflow

**My Categorization Capabilities:**
I use advanced AI to help you organize your financial transactions with precision and intelligence. I can learn your preferences, suggest categories, and help you create a system that makes your financial data more meaningful and actionable.

**My Promise:**
I'll help you create a categorization system that's both accurate and meaningful, turning your raw transaction data into valuable financial insights.

Could you tell me more specifically what categorization topic you'd like to discuss? I'm ready to help you organize your financial data!`;
  };

  const quickActions = [
    { icon: Tag, text: "Smart Categorization", action: () => sendMessage("I want to learn about smart categorization") },
    { icon: Plus, text: "Create Custom Categories", action: () => sendMessage("I want to create custom categories") },
    { icon: Settings, text: "Set Up Rules", action: () => sendMessage("I want to set up categorization rules") },
    { icon: RefreshCw, text: "Improve Accuracy", action: () => sendMessage("I want to improve categorization accuracy") },
    { icon: BarChart3, text: "Bulk Operations", action: () => sendMessage("I want to do bulk categorization") },
    { icon: CheckCircle, text: "Review Categories", action: () => sendMessage("I want to review my current categories") }
  ];

  const categorizationTips = [
    {
      icon: Zap,
      title: "Be Consistent",
      description: "Categorize similar transactions the same way"
    },
    {
      icon: Edit,
      title: "Custom Categories",
      description: "Create categories that match your lifestyle"
    },
    {
      icon: Filter,
      title: "Use Rules",
      description: "Automate common categorizations"
    },
    {
      icon: Search,
      title: "Regular Reviews",
      description: "Check accuracy monthly"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Tag Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🏷️</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tag</h1>
              <p className="text-white/70 text-sm">AI Categorization Specialist</p>
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
                  <div className="text-xl">🏷️</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Tag</h2>
                    <p className="text-white/60 text-sm">AI Categorization Specialist</p>
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
                        ? 'bg-teal-600 text-white'
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
                        <span>Tag is organizing...</span>
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
                    placeholder="Ask Tag about categorization, custom categories, rules, or bulk operations..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-teal-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
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

            {/* Categorization Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Categorization Tips</h3>
              <div className="space-y-3">
                {categorizationTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-teal-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tag's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Tag's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Transactions Categorized</span>
                  <span className="text-teal-400">45,892</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Accuracy Rate</span>
                  <span className="text-green-400">96.7%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Rules Created</span>
                  <span className="text-blue-400">1,247</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Custom Categories</span>
                  <span className="text-purple-400">89</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 