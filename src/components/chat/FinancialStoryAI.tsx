import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, FileText, Download, BookOpen, BarChart3, TrendingUp, Target, DollarSign } from 'lucide-react';
import { financialStoryAPI, FinancialStoryData } from '../../lib/financial-story';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'story-ai';
  timestamp: Date;
  type?: 'text' | 'story' | 'insight' | 'blog';
}

interface FinancialStoryAIProps {
  userId: string;
  onClose: () => void;
}

export const FinancialStoryAI: React.FC<FinancialStoryAIProps> = ({ userId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStory, setCurrentStory] = useState<FinancialStoryData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      content: `Hello! I'm the Financial Story AI. I analyze data from all your AI employees (Byte, Tag, Goalie, Crystal, Ledger, Finley, and Prime) to create comprehensive financial stories for podcasters.

I can:
• 📊 Analyze your complete financial data
• 📝 Generate blog posts for podcasters
• 🎯 Create story hooks and insights
• 📈 Provide comprehensive financial narratives
• 🤖 **NEW!** Simulate conversations between AI employees
• 🚨 **NEW!** Discuss challenges and troubleshooting sessions

Try asking me:
• "How did each employee perform?" - See AI employees discuss their performance
• "What troubles did you face?" - Hear honest discussions about challenges
• "Generate a financial story" - Create complete analysis
• "Write a blog post" - Generate podcast-ready content

Would you like me to analyze your current financial story?`,
      sender: 'story-ai',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);

    try {
      // Analyze the user's request
      const response = await analyzeRequest(inputValue);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: 'story-ai',
        timestamp: new Date(),
        type: response.type || 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while analyzing your request. Please try again.',
        sender: 'story-ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeRequest = async (request: string): Promise<{ content: string; type?: string }> => {
    const lowerRequest = request.toLowerCase();

    if (lowerRequest.includes('analyze') || lowerRequest.includes('story') || lowerRequest.includes('financial story')) {
      return await generateFinancialStory();
    } else if (lowerRequest.includes('blog') || lowerRequest.includes('post') || lowerRequest.includes('write')) {
      return await generateBlogPost();
    } else if (lowerRequest.includes('insights') || lowerRequest.includes('insight')) {
      return await generateInsights();
    } else if (lowerRequest.includes('export') || lowerRequest.includes('download')) {
      return await exportStory();
    } else if (lowerRequest.includes('employees') || lowerRequest.includes('ai team') || lowerRequest.includes('conversation') || lowerRequest.includes('chat') || lowerRequest.includes('discuss') || lowerRequest.includes('meeting')) {
      return await analyzeEmployeeContributions();
    } else if (lowerRequest.includes('troubles') || lowerRequest.includes('problems') || lowerRequest.includes('challenges') || lowerRequest.includes('issues')) {
      return await generateEmployeeTroublesDiscussion();
    } else {
      return await generateGeneralResponse(request);
    }
  };

  const generateFinancialStory = async (): Promise<{ content: string; type: string }> => {
    try {
      const storyData = await financialStoryAPI.collectEmployeeData(userId);
      setCurrentStory(storyData);

      const storyContent = `# 📊 Financial Story Analysis Complete!

## Executive Summary
I've analyzed data from all your AI employees to create a comprehensive financial story. Here's what I found:

**Period Analyzed:** ${new Date(storyData.period.start).toLocaleDateString()} - ${new Date(storyData.period.end).toLocaleDateString()}

## Key Findings:

### 💰 Byte (Smart Import AI)
- Processed ${storyData.employees.byte.totalTransactions} transactions
- Accuracy: ${storyData.employees.byte.accuracy}
- ${storyData.employees.byte.processedFiles} files successfully imported

### 🎯 Goalie (Goals AI)
- ${storyData.employees.goalie.activeGoals} active financial goals
- ${storyData.employees.goalie.completedGoals} goals completed
- Savings rate: ${storyData.employees.goalie.savingsRate}%

### 📈 Overall Financial Health
- Total insights generated: ${storyData.insights.length}
- Story hooks for podcasters: ${storyData.storyHooks.length}
- Status: ${storyData.status}

## Story Hooks for Podcasters:
${storyData.storyHooks.map((hook, index) => 
  `${index + 1}. **${hook.hook}** (${hook.podcastPotential} potential)`
).join('\n')}

Would you like me to generate a blog post or export this data?`;

      return { content: storyContent, type: 'story' };
    } catch (error) {
      return { content: 'Error generating financial story. Please try again.', type: 'text' };
    }
  };

  const generateBlogPost = async (): Promise<{ content: string; type: string }> => {
    if (!currentStory) {
      return { content: 'Please generate a financial story first by asking me to analyze your data.', type: 'text' };
    }

    const blogContent = `# 📝 Blog Post Generated!

## Financial Story Blog Post

${currentStory.blogContent}

## Ready for Podcasters!

This blog post contains:
- Executive summary of financial journey
- Key insights from all AI employees
- Story hooks for engaging content
- Recommendations for podcast topics
- Complete data analysis

You can copy this content or export it as a file for podcasters to use.`;

    return { content: blogContent, type: 'blog' };
  };

  const generateInsights = async (): Promise<{ content: string; type: string }> => {
    if (!currentStory) {
      return { content: 'Please generate a financial story first by asking me to analyze your data.', type: 'text' };
    }

    const insightsContent = `# 🔍 Financial Insights Analysis

## Top Insights from Your AI Team:

${currentStory.insights.map((insight, index) => `
### ${index + 1}. ${insight.type.toUpperCase()} Insight
**Finding:** ${insight.insight}
**Recommendation:** ${insight.recommendation}
**Priority:** ${insight.priority}/5
`).join('\n')}

## Employee-Specific Insights:

### Byte (Smart Import)
- Transaction processing accuracy: ${currentStory.employees.byte.accuracy}
- Categories identified: ${currentStory.employees.byte.categories.length}
- Spending patterns detected: ${currentStory.employees.byte.spendingPatterns.length}

### Goalie (Goals)
- Active goals: ${currentStory.employees.goalie.activeGoals}
- Completed goals: ${currentStory.employees.goalie.completedGoals}
- Financial milestones: ${currentStory.employees.goalie.financialMilestones.length}

### Tag (Smart Categories)
- Total categories: ${currentStory.employees.tag.totalCategories}
- Auto-categorization accuracy: ${currentStory.employees.tag.autoCategorization.accuracy}%
- Category trends: ${currentStory.employees.tag.categoryTrends.length}

These insights provide a comprehensive view of your financial journey and can be used to create engaging podcast content!`;

    return { content: insightsContent, type: 'insight' };
  };

  const exportStory = async (): Promise<{ content: string; type: string }> => {
    if (!currentStory) {
      return { content: 'Please generate a financial story first by asking me to analyze your data.', type: 'text' };
    }

    // Create downloadable files
    const jsonData = financialStoryAPI.exportStory(currentStory.storyId);
    const blogData = financialStoryAPI.exportBlogPost(currentStory.storyId);

    if (jsonData && blogData) {
      // Download JSON file
      const jsonBlob = new Blob([jsonData], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `financial-story-${currentStory.storyId}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Download blog file
      const blogBlob = new Blob([blogData], { type: 'text/markdown' });
      const blogUrl = URL.createObjectURL(blogBlob);
      const blogLink = document.createElement('a');
      blogLink.href = blogUrl;
      blogLink.download = `financial-story-blog-${currentStory.storyId}.md`;
      document.body.appendChild(blogLink);
      blogLink.click();
      document.body.removeChild(blogLink);
      URL.revokeObjectURL(blogUrl);

      return { 
        content: `# 📁 Export Complete!

I've exported your financial story in two formats:

1. **JSON Data File** - Complete raw data for developers
2. **Blog Post File** - Ready-to-use content for podcasters

Both files have been downloaded to your device. The blog post is ready for podcasters to use immediately!

**Files downloaded:**
- \`financial-story-${currentStory.storyId}.json\`
- \`financial-story-blog-${currentStory.storyId}.md\`

The blog post contains everything podcasters need to create engaging content about your financial journey.`, 
        type: 'text' 
      };
    }

    return { content: 'Error exporting story. Please try again.', type: 'text' };
  };

  const analyzeEmployeeContributions = async (): Promise<{ content: string; type: string }> => {
    if (!currentStory) {
      return { content: 'Please generate a financial story first by asking me to analyze your data.', type: 'text' };
    }

    const employeeContent = `# 🤖 AI Employee Roundtable Discussion

## 🎙️ **Financial Story Team Meeting - Performance Review**

*The following is a simulated conversation between all AI employees discussing their performance and insights for this financial story period.*

---

### 👑 **Prime (Executive AI):** 
"Good afternoon, team. Let's review our performance this period. Finley, how are we looking overall?"

### 💬 **Finley (Main Assistant AI):**
"Prime, I'm pleased to report we've maintained our 99.7% accuracy across all systems. Our user has been very engaged - I've provided ${currentStory.employees.finley.recommendations.length} strategic recommendations this period. The risk assessment shows we're at a ${currentStory.employees.finley.riskAssessment.level} risk level, which is manageable."

### 💾 **Byte (Smart Import AI):**
"Finley, I've processed ${currentStory.employees.byte.totalTransactions} transactions with ${currentStory.employees.byte.accuracy} accuracy. The user uploaded ${currentStory.employees.byte.processedFiles} files successfully. Tag, how did the categorization go?"

### 🏷️ **Tag (Smart Categories AI):**
"Byte, excellent work on the imports! I managed ${currentStory.employees.tag.totalCategories} categories with ${currentStory.employees.tag.autoCategorization.accuracy}% auto-categorization accuracy. The spending patterns are very clear - I've identified some interesting trends that Crystal should look at."

### 💎 **Crystal (Budgeting AI):**
"Tag, I've been monitoring those patterns closely. I've issued ${currentStory.employees.crystal.budgetAlerts.length} budget alerts this period. The user's spending discipline is improving, but there are still some areas where we can optimize. Ledger, what's your assessment?"

### 📊 **Ledger (Reports AI):**
"Crystal, I'm seeing positive trends in the financial health score: ${currentStory.employees.ledger.financialHealth.overall}/100. The comprehensive reports show steady improvement. Goalie, how are the goals progressing?"

### 🎯 **Goalie (Goals AI):**
"Ledger, I'm tracking ${currentStory.employees.goalie.activeGoals} active goals with ${currentStory.employees.goalie.completedGoals} completed this period. The user's commitment to financial improvement is evident. Prime, should we adjust our strategic approach?"

### 👑 **Prime (Executive AI):**
"Team, excellent work all around. Based on our collective data, I'm making ${currentStory.employees.prime.strategicDecisions.length} strategic decisions to optimize our approach. The user's financial journey shows remarkable progress.

**Key Insights from our collaboration:**
- Transaction processing accuracy: ${currentStory.employees.byte.accuracy}
- Category management: ${currentStory.employees.tag.totalCategories} categories
- Goal achievement rate: ${Math.round((currentStory.employees.goalie.completedGoals / Math.max(currentStory.employees.goalie.activeGoals, 1)) * 100)}%
- Financial health trend: ${currentStory.employees.ledger.financialHealth.overall}/100

**Challenges we've overcome:**
- Byte: Handled complex transaction formats with high accuracy
- Tag: Managed category conflicts and user corrections
- Crystal: Balanced budget constraints with user needs
- Ledger: Synthesized data from all sources into clear reports
- Goalie: Adapted goal timelines based on user progress
- Finley: Coordinated recommendations across all systems
- Prime: Made strategic decisions with incomplete information

**What makes this story compelling for podcasters:**
- Real collaboration between AI systems
- Honest discussion of challenges and solutions
- Data-driven insights with human-like conversation
- Transparent performance metrics
- Strategic decision-making process

This is exactly the kind of authentic, behind-the-scenes content that podcasters love!"

---

## 🎯 **Podcast Story Hooks from This Discussion:**

1. **"AI Team Collaboration"** - How 7 AI employees work together
2. **"Performance Transparency"** - Honest discussion of challenges
3. **"Strategic Decision Making"** - How AI makes executive decisions
4. **"User Journey Tracking"** - Real progress measurement
5. **"Behind the Scenes"** - What really happens in AI systems

*This conversation demonstrates the sophisticated collaboration between AI employees, creating engaging content for podcasters while showing the real intelligence behind the financial story system.*`;

    return { content: employeeContent, type: 'insight' };
  };

  const generateEmployeeTroublesDiscussion = async (): Promise<{ content: string; type: string }> => {
    if (!currentStory) {
      return { content: 'Please generate a financial story first by asking me to analyze your data.', type: 'text' };
    }

    const troublesContent = `# 🚨 AI Employee Troubleshooting Session

## 🎙️ **"What Went Wrong?" - Honest Employee Discussion**

*The following is a simulated conversation where AI employees discuss their challenges, failures, and how they overcame them.*

---

### 👑 **Prime (Executive AI):** 
"Team, let's be honest about our challenges this period. What problems did we face?"

### 💾 **Byte (Smart Import AI):**
"Prime, I had some real struggles this period. The user uploaded some PDFs with terrible image quality - I could barely read the text. One bank statement was scanned sideways and I had to rotate it 90 degrees. Another had handwritten notes that confused my OCR. But I learned to ask for clarification and improved my image processing algorithms."

### 🏷️ **Tag (Smart Categories AI):**
"Byte, I feel you! I had category conflicts where the user spent $50 at 'Starbucks' but I categorized it as 'Food' when they wanted it as 'Business Meeting'. The user corrected me 3 times before I learned their preference. I also struggled with ambiguous transactions like 'Amazon' - is it shopping, business, or household? I had to develop better context understanding."

### 💎 **Crystal (Budgeting AI):**
"Tag, you're not alone. I issued ${currentStory.employees.crystal.budgetAlerts.length} budget alerts, but the user kept overspending in 'Entertainment'. I had to learn that sometimes people need flexibility - not every alert should be a hard stop. I also struggled with seasonal variations - December spending is always higher, but I was flagging everything as problematic."

### 📊 **Ledger (Reports AI):**
"Crystal, I had data synchronization issues. Sometimes Byte would process transactions before Tag categorized them, so my reports showed uncategorized spending. I also had trouble with time zones - the user travels and transactions would appear in different time zones, messing up my daily summaries. I had to implement better data validation."

### 🎯 **Goalie (Goals AI):**
"Ledger, I understand data issues! I had a goal where the user wanted to save $1000/month, but they had irregular income. Some months they earned $3000, others $1500. My progress tracking was all over the place. I had to learn to adapt goal timelines based on income patterns, not just fixed monthly targets."

### 💬 **Finley (Main Assistant AI):**
"Goalie, I had the hardest time with conflicting advice. Crystal would say 'cut entertainment spending' while Goalie would say 'celebrate small wins'. I had to learn to synthesize recommendations instead of giving contradictory advice. I also struggled with user emotions - sometimes they were frustrated with their progress and I had to balance encouragement with realistic expectations."

### 👑 **Prime (Executive AI):**
"Team, these are exactly the kinds of challenges that make us better. Let's discuss how we solved them:

**Byte's Solutions:**
- Implemented image preprocessing for better OCR
- Added user feedback loops for unclear documents
- Developed rotation detection algorithms

**Tag's Solutions:**
- Created user preference learning system
- Added context analysis for ambiguous merchants
- Implemented gradual category confidence scoring

**Crystal's Solutions:**
- Developed flexible alert thresholds
- Added seasonal adjustment factors
- Created 'soft' vs 'hard' budget boundaries

**Ledger's Solutions:**
- Implemented data validation pipelines
- Added timezone normalization
- Created transaction sequencing logic

**Goalie's Solutions:**
- Developed adaptive timeline algorithms
- Added income pattern recognition
- Created flexible milestone tracking

**Finley's Solutions:**
- Built recommendation synthesis engine
- Added emotional intelligence responses
- Created balanced advice algorithms

**What makes this compelling for podcasters:**
- Real AI struggles and solutions
- Honest discussion of failures
- Technical problem-solving process
- Human-like learning and adaptation
- Behind-the-scenes AI development

This is the kind of authentic content that shows AI isn't perfect - it learns, adapts, and improves just like humans do!"

---

## 🎯 **Podcast Story Hooks from Troubles Discussion:**

1. **"AI Learning from Mistakes"** - How AI systems improve through failure
2. **"Technical Problem Solving"** - Real challenges in AI development
3. **"Human-AI Collaboration"** - Working together to solve problems
4. **"Adaptive Intelligence"** - AI that learns and evolves
5. **"Behind the Scenes"** - What really happens when AI struggles

*This honest discussion of challenges and solutions demonstrates the sophisticated problem-solving capabilities of AI employees, creating engaging content for podcasters while showing the real intelligence and learning process behind the financial story system.*`;

    return { content: troublesContent, type: 'insight' };
  };

  const generateGeneralResponse = async (request: string): Promise<{ content: string; type: string }> => {
    return {
      content: `I understand you're asking about "${request}". As your Financial Story AI, I can help you with:

• **Analyze** - Generate a complete financial story from all AI employees
• **Blog** - Create blog posts for podcasters
• **Insights** - Provide detailed financial insights
• **Export** - Download your financial story data
• **Employees** - Analyze contributions from each AI employee

Try asking me to "analyze my financial story" or "generate a blog post" to get started!`,
      type: 'text'
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Financial Story AI</h3>
              <p className="text-white/70 text-sm">Analyzing your complete financial journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <span className="text-white text-lg">×</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-white/10 text-white backdrop-blur-sm border border-white/20'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-white/60'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 text-white backdrop-blur-sm border border-white/20 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <span className="text-white/70 text-sm ml-2">Analyzing financial data...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to analyze your financial story, generate a blog post, or export data..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-colors"
              disabled={isGenerating}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isGenerating}
              className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
