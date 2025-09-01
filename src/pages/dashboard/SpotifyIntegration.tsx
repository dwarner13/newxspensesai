import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  Send, 
  Loader2,
  Headphones,
  Heart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Share2,
  Download,
  Edit3,
  Plus,
  Settings,
  Calendar,
  Star,
  MessageCircle,
  Bookmark,
  Zap,
  Target,
  BarChart3,
  Activity,
  Eye,
  Lightbulb
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

interface WaveMessage {
  role: 'user' | 'wave' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function SpotifyIntegration() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WaveMessage[]>([
    {
      role: 'wave',
      content: "Hello! I'm 🌊 Wave, your Spotify Integration AI! I help you connect your financial life with music to create unique insights and experiences. I can help you create financial playlists, analyze mood-spending correlations, generate music-based financial insights, and make your financial journey more engaging through music. What would you like to explore with music and money today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [waveConfig, setWaveConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Wave's config
  useEffect(() => {
    const initializeWave = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Wave's configuration
      const config = await getEmployeeConfig('wave');
      setWaveConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'wave', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as WaveMessage[]);
      }
    };

    initializeWave();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: WaveMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'wave', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'wave', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Wave's response based on the user's query
      const waveResponse = await generateWaveResponse(content);

      const processingTime = Date.now() - startTime;

      const waveMessage: WaveMessage = {
        role: 'wave',
        content: waveResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, waveMessage]);

      // Save Wave's response to conversation
      await addMessageToConversation(user.id, 'wave', conversationId, waveMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'wave');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: WaveMessage = {
        role: 'wave',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWaveResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();

    // Wave's specialized responses for Spotify integration queries
    if (query.includes('playlist') || query.includes('music') || query.includes('spotify') || query.includes('song')) {
      return `🎵 Fantastic! Let's create amazing financial playlists that make your money journey more engaging and inspiring. Here's my approach to financial playlist creation:

**Financial Playlist Creation Framework:**

**1. Playlist Types:**
• **Savings Goals Playlists** - "Building My Emergency Fund" with motivational tracks
• **Investment Journey Playlists** - "Growing My Wealth" with steady, confident music
• **Debt-Free Journey Playlists** - "Freedom Bound" with empowering anthems
• **Budgeting Success Playlists** - "Smart Spending Vibes" with disciplined, focused tracks
• **Financial Education Playlists** - "Money Mindset" with thoughtful, learning-focused music
• **Celebration Playlists** - "Financial Wins" for when you hit milestones

**2. Mood-Based Financial Playlists:**
• **High-Energy Spending** - Upbeat tracks for when you're tempted to splurge
• **Calm & Focused** - Relaxing music for making important financial decisions
• **Motivated & Driven** - Energetic tracks for working toward financial goals
• **Reflective & Planning** - Thoughtful music for reviewing finances and setting goals
• **Confident & Successful** - Empowering tracks for when you're feeling financially strong

**3. Financial Theme Integration:**
• **Songs About Money** - Tracks that directly reference wealth, success, or financial themes
• **Motivational Anthems** - Songs that inspire action and perseverance
• **Success Stories** - Music that celebrates achievement and progress
• **Mindful Spending** - Tracks that promote thoughtful decision-making
• **Future Focus** - Songs about planning, dreaming, and building tomorrow

**4. Playlist Structure:**
• **Opening Track** - Sets the financial mindset and intention
• **Building Energy** - Gradually increases motivation and focus
• **Peak Motivation** - High-energy tracks for maximum inspiration
• **Reflection Period** - Calmer tracks for thinking and planning
• **Action Songs** - Tracks that inspire specific financial actions
• **Closing Anthem** - Empowering finish that reinforces your goals

**5. Integration Features:**
• **Automatic Updates** - Playlists that update based on your financial progress
• **Mood Matching** - Suggest playlists based on your current emotional state
• **Goal Tracking** - Music that changes as you get closer to financial goals
• **Spending Alerts** - Calming playlists when you're approaching budget limits
• **Success Celebrations** - Special playlists for financial milestones

**Pro Tips:**
• **Match Music to Financial Tasks** - Use different playlists for different money activities
• **Create Seasonal Playlists** - Adjust music for tax season, holiday spending, etc.
• **Include Personal Favorites** - Mix in songs that have special meaning to you
• **Update Regularly** - Keep playlists fresh and relevant to your current goals
• **Share with Community** - Create collaborative playlists with friends or family
• **Track Impact** - Notice how different music affects your financial decisions

What type of financial playlist would you like to create?`;
    }

    if (query.includes('mood') || query.includes('emotion') || query.includes('feeling') || query.includes('correlation')) {
      return `🎭 Excellent! Let's explore the fascinating connection between your mood, music, and spending patterns. Here's my approach to mood-spending correlation analysis:

**Mood-Spending Correlation Framework:**

**1. Mood Categories & Spending Patterns:**
• **Happy & Excited** - Often leads to impulse purchases and social spending
• **Stressed & Anxious** - May result in comfort spending or avoidance of financial decisions
• **Confident & Empowered** - Usually leads to smart investments and goal-focused spending
• **Sad or Depressed** - Can trigger retail therapy or withdrawal from financial planning
• **Focused & Determined** - Typically results in disciplined saving and strategic spending
• **Relaxed & Content** - Often leads to balanced, thoughtful financial decisions

**2. Music-Mood-Spending Connections:**
• **High-Energy Music** - Upbeat tracks can increase spending impulsivity
• **Calm & Ambient** - Relaxing music often leads to more thoughtful purchases
• **Motivational Anthems** - Empowering music can boost confidence in financial decisions
• **Nostalgic Tracks** - Sentimental music may trigger emotional spending
• **Focus Music** - Instrumental or concentration music supports smart financial choices
• **Social Vibes** - Party music often correlates with social spending and entertainment

**3. Analysis Techniques:**
• **Mood Tracking** - Log your emotional state throughout the day
• **Music Listening Patterns** - Track what you're listening to when making purchases
• **Spending Triggers** - Identify what music or moods lead to specific spending behaviors
• **Time-of-Day Analysis** - Understand how mood and music change throughout the day
• **Weekly Patterns** - Look for recurring mood-music-spending cycles
• **Seasonal Trends** - Analyze how seasons affect your mood, music, and spending

**4. Intervention Strategies:**
• **Mood-Aware Playlists** - Create playlists that support healthy financial decisions
• **Spending Alerts** - Get music recommendations when you're in high-spending moods
• **Calming Interventions** - Automatic calming music when stress spending is detected
• **Motivation Boosters** - Energizing playlists when you need financial motivation
• **Focus Enhancers** - Concentration music for important financial planning sessions
• **Celebration Music** - Special playlists for financial wins and milestones

**5. Data Integration:**
• **Spotify Listening History** - Analyze your music patterns and correlate with spending
• **Mood Tracking Apps** - Connect mood data with financial transactions
• **Spending Categories** - Match music genres with different types of purchases
• **Time Stamps** - Track when you listen to certain music and when you spend money
• **Location Data** - Understand how music affects spending in different environments
• **Social Context** - Analyze how music affects group spending decisions

**6. Personalized Insights:**
• **Your Unique Patterns** - Discover your specific mood-music-spending connections
• **Risk Periods** - Identify times when you're most likely to make impulsive purchases
• **Optimal Decision Times** - Find when you're in the best state for financial planning
• **Intervention Opportunities** - Know when to use music to improve financial decisions
• **Progress Tracking** - Monitor how mood and music affect your financial goals
• **Success Patterns** - Understand what combinations lead to your best financial outcomes

**Pro Tips:**
• **Start Small** - Track just a few mood-music-spending connections at first
• **Be Honest** - Record your true feelings, not what you think you should feel
• **Look for Patterns** - Identify recurring themes in your mood-music-spending cycle
• **Experiment** - Try different music to see how it affects your financial decisions
• **Share Insights** - Discuss your findings with trusted friends or family
• **Adjust Gradually** - Make small changes to your music habits to improve spending

What aspect of mood-spending correlation would you like to explore?`;
    }

    if (query.includes('insight') || query.includes('analysis') || query.includes('pattern') || query.includes('trend')) {
      return `📊 Perfect! Let's dive into music-based financial insights and discover how your listening patterns can reveal fascinating things about your financial behavior. Here's my approach to music-driven financial analysis:

**Music-Based Financial Insights Framework:**

**1. Listening Pattern Analysis:**
• **Genre Preferences** - How different music styles correlate with spending behaviors
• **Tempo Analysis** - How fast vs. slow music affects your financial decision-making
• **Lyrical Content** - How song themes influence your money mindset
• **Listening Frequency** - How often you listen to certain types of music and spending patterns
• **Time-of-Day Patterns** - How your music choices throughout the day affect spending
• **Seasonal Trends** - How music preferences change with seasons and financial cycles

**2. Financial Behavior Insights:**
• **Impulse Spending Triggers** - What music leads to unplanned purchases
• **Saving Motivation** - Which tracks inspire you to save and invest
• **Budget Adherence** - How music affects your ability to stick to budgets
• **Investment Confidence** - What music boosts your confidence in financial decisions
• **Debt Management** - How music influences your approach to debt repayment
• **Goal Achievement** - Which playlists help you reach financial milestones

**3. Predictive Analytics:**
• **Spending Forecasts** - Predict spending based on current music listening patterns
• **Mood Predictions** - Anticipate financial decision quality based on music choices
• **Risk Assessment** - Identify high-risk spending periods through music analysis
• **Opportunity Detection** - Find optimal times for financial planning and decisions
• **Goal Progress Tracking** - Monitor financial goal achievement through music patterns
• **Behavioral Changes** - Track how music interventions affect financial outcomes

**4. Personalized Recommendations:**
• **Optimal Playlists** - Suggest music that supports your financial goals
• **Intervention Timing** - Recommend when to change music to improve decisions
• **Genre Exploration** - Suggest new music that might improve financial behavior
• **Mood Management** - Recommend music to shift your financial mindset
• **Focus Enhancement** - Suggest music for important financial planning sessions
• **Motivation Boosters** - Recommend tracks when you need financial inspiration

**5. Integration Insights:**
• **Cross-Platform Analysis** - How music affects spending across different platforms
• **Social Influence** - How shared music affects group spending decisions
• **Environmental Factors** - How music in different settings affects financial choices
• **Technology Interaction** - How music apps and financial apps work together
• **Lifestyle Integration** - How music fits into your overall financial lifestyle
• **Cultural Influences** - How cultural music preferences affect financial behavior

**6. Actionable Insights:**
• **Daily Routines** - Optimize your daily music routine for better financial decisions
• **Weekly Planning** - Use music to enhance your weekly financial planning sessions
• **Monthly Reviews** - Create special playlists for monthly financial reviews
• **Goal Setting** - Use music to enhance your financial goal-setting process
• **Celebration Moments** - Create music rituals for financial achievements
• **Recovery Strategies** - Use music to bounce back from financial setbacks

**Pro Tips:**
• **Track Consistently** - Regular tracking provides the most valuable insights
• **Look for Surprises** - Pay attention to unexpected music-spending connections
• **Test Hypotheses** - Try changing your music to see if it affects your finances
• **Share Findings** - Discuss insights with others to gain new perspectives
• **Stay Flexible** - Be willing to adjust your music habits based on insights
• **Celebrate Progress** - Use music to acknowledge your financial growth

What specific type of music-based financial insight would you like to explore?`;
    }

    if (query.includes('integrate') || query.includes('connect') || query.includes('sync') || query.includes('api')) {
      return `🔗 Excellent! Let's set up seamless integration between your Spotify account and financial data to create powerful music-money insights. Here's my approach to Spotify integration:

**Spotify Integration Framework:**

**1. Connection Setup:**
• **Spotify API Authorization** - Secure connection to your Spotify account
• **Data Permissions** - Control what financial data is shared with music analysis
• **Privacy Settings** - Manage how your data is used for insights
• **Sync Preferences** - Choose how often data is synchronized
• **Notification Settings** - Control when you receive music-based financial alerts
• **Backup & Security** - Ensure your data is protected and backed up

**2. Data Integration Points:**
• **Listening History** - Track what you listen to and when
• **Playlist Analysis** - Analyze your playlist themes and financial correlations
• **Mood Indicators** - Use music choices as indicators of emotional state
• **Spending Patterns** - Correlate music listening with financial transactions
• **Goal Progress** - Track how music affects financial goal achievement
• **Behavioral Changes** - Monitor how music interventions impact spending

**3. Real-Time Features:**
• **Live Mood Tracking** - Real-time analysis of your current music and mood
• **Spending Alerts** - Instant notifications when music suggests potential overspending
• **Motivation Boosters** - Automatic music recommendations for financial tasks
• **Focus Enhancers** - Suggested playlists for important financial decisions
• **Celebration Moments** - Automatic celebration playlists for financial wins
• **Recovery Support** - Calming music suggestions after financial setbacks

**4. Automated Insights:**
• **Weekly Reports** - Automated analysis of your music-spending correlations
• **Monthly Trends** - Long-term patterns in music and financial behavior
• **Seasonal Analysis** - How seasons affect your music and spending patterns
• **Goal Progress Tracking** - How music affects progress toward financial goals
• **Behavioral Predictions** - Forecast spending based on current music patterns
• **Optimization Suggestions** - Recommendations for improving music-financial harmony

**5. Privacy & Security:**
• **Data Encryption** - All data is encrypted in transit and at rest
• **User Control** - You decide what data is shared and analyzed
• **Anonymization** - Personal identifiers are removed from analysis
• **Secure APIs** - All connections use industry-standard security protocols
• **Regular Audits** - Regular security reviews and updates
• **Compliance** - Adherence to data protection regulations

**6. Customization Options:**
• **Personalized Alerts** - Customize when and how you receive notifications
• **Playlist Preferences** - Set your preferred music genres and styles
• **Analysis Depth** - Choose how detailed your insights should be
• **Integration Scope** - Select which financial accounts to connect
• **Update Frequency** - Control how often data is synchronized
• **Export Options** - Download your data and insights when needed

**7. Troubleshooting:**
• **Connection Issues** - Common problems and solutions for Spotify integration
• **Data Sync Problems** - How to resolve synchronization issues
• **Permission Errors** - Fixing authorization and access problems
• **Performance Optimization** - Improving integration speed and reliability
• **Backup & Recovery** - How to restore your data if needed
• **Support Resources** - Where to get help with integration issues

**Pro Tips:**
• **Start Simple** - Begin with basic integration and add features gradually
• **Test Thoroughly** - Verify that all connections are working properly
• **Monitor Performance** - Watch for any issues with data synchronization
• **Update Regularly** - Keep your integration settings current
• **Backup Data** - Regularly export your data for safekeeping
• **Review Permissions** - Periodically review and update your privacy settings

What specific aspect of Spotify integration would you like to set up?`;
    }

    if (query.includes('create') || query.includes('build') || query.includes('make') || query.includes('generate')) {
      return `🎼 Fantastic! Let's create amazing music-based financial experiences that make your money journey more engaging and inspiring. Here's my approach to creating music-financial content:

**Music-Financial Content Creation Framework:**

**1. Playlist Creation:**
• **Goal-Oriented Playlists** - "My Emergency Fund Journey" with motivational tracks
• **Mood-Based Collections** - "Calm Spending Vibes" for thoughtful purchases
• **Milestone Celebrations** - "Debt-Free Victory" for achieving financial goals
• **Learning Sessions** - "Financial Education Focus" for studying money topics
• **Planning Sessions** - "Budget Planning Beats" for financial planning time
• **Recovery Playlists** - "Bounce Back Stronger" for financial setbacks

**2. Financial Music Themes:**
• **Wealth Building** - Songs about growth, investment, and long-term success
• **Smart Spending** - Tracks that promote thoughtful, intentional purchases
• **Debt Freedom** - Music about liberation, freedom, and breaking free
• **Financial Independence** - Anthems about self-sufficiency and empowerment
• **Family Finance** - Songs about providing, protecting, and planning for loved ones
• **Legacy Building** - Music about creating lasting impact and generational wealth

**3. Interactive Features:**
• **Dynamic Playlists** - Playlists that change based on your financial progress
• **Mood Matching** - Automatic playlist suggestions based on your current state
• **Goal Tracking** - Music that evolves as you get closer to financial goals
• **Spending Alerts** - Calming playlists when you're approaching budget limits
• **Success Celebrations** - Special music for financial milestones and achievements
• **Recovery Support** - Uplifting playlists for bouncing back from setbacks

**4. Content Types:**
• **Daily Motivation** - Short playlists for daily financial inspiration
• **Weekly Planning** - Extended playlists for weekly financial reviews
• **Monthly Reflection** - Thoughtful music for monthly financial assessments
• **Quarterly Goals** - Focused playlists for quarterly financial planning
• **Annual Reviews** - Comprehensive music for yearly financial evaluations
• **Special Occasions** - Custom playlists for tax season, holidays, etc.

**5. Personalization Elements:**
• **Your Music Taste** - Incorporate your favorite genres and artists
• **Financial Goals** - Align music with your specific financial objectives
• **Current Situation** - Adapt music to your present financial circumstances
• **Learning Style** - Match music to how you best absorb financial information
• **Energy Levels** - Adjust music to your current energy and motivation
• **Time Constraints** - Create playlists that fit your available time

**6. Creation Process:**
• **Goal Definition** - Clearly define what you want the music to accomplish
• **Audience Analysis** - Consider who will be listening and their preferences
• **Theme Development** - Choose the central theme and message
• **Song Selection** - Curate tracks that support your financial goals
• **Flow Design** - Arrange songs for optimal emotional and motivational impact
• **Testing & Refinement** - Test the playlist and make adjustments as needed

**Pro Tips:**
• **Start with Your Favorites** - Include songs you already love and connect with
• **Consider the Journey** - Think about the emotional arc you want to create
• **Mix Genres** - Don't limit yourself to one type of music
• **Update Regularly** - Keep playlists fresh and relevant to your current goals
• **Share with Others** - Create collaborative playlists with friends or family
• **Track Impact** - Notice how different music affects your financial behavior

What type of music-financial content would you like to create?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🌊 I'm here to help you create amazing music-financial experiences that make your money journey more engaging and insightful! Here's how I can support your Spotify integration journey:

**My Spotify Integration Expertise:**
🎵 **Playlist Creation** - Design financial playlists that motivate and inspire
🎭 **Mood Analysis** - Understand how music affects your spending patterns
📊 **Financial Insights** - Discover music-based patterns in your financial behavior
🔗 **Integration Setup** - Connect Spotify with your financial data seamlessly
🎼 **Content Creation** - Build personalized music-financial experiences
📈 **Trend Analysis** - Track how music influences your financial progress
🎯 **Personalization** - Tailor music experiences to your unique financial goals
🔄 **Automation** - Set up automatic music-based financial interventions

**How I Can Help:**
• Create personalized financial playlists and music experiences
• Analyze mood-spending correlations through music patterns
• Generate insights about how music affects your financial decisions
• Set up seamless Spotify integration with your financial data
• Build music-based financial content and experiences
• Track trends and patterns in your music-financial behavior
• Personalize music recommendations for your financial goals
• Automate music-based financial interventions and alerts

**My Approach:**
I believe music has the power to transform how we think about and interact with money. I help you create meaningful connections between your musical preferences and financial behavior to make your money journey more engaging and successful.

**My Promise:**
I'll help you build a comprehensive music-financial integration system that makes your financial journey more enjoyable, insightful, and successful through the power of music.

**Pro Tip:** The best music-financial experiences don't just entertain—they transform how you think about and interact with money!

What specific aspect of Spotify integration would you like to explore?`;
    }

    // Default response for other queries
    return `🌊 I understand you're asking about "${userQuery}". As your Spotify Integration AI, I'm here to help with:

**Spotify Integration Topics I Cover:**
• Playlist creation for financial motivation and inspiration
• Mood-spending correlation analysis through music patterns
• Music-based financial insights and behavioral analysis
• Spotify integration setup and data synchronization
• Personalized music-financial content creation
• Automated music-based financial interventions
• Trend analysis and pattern recognition
• Privacy and security for music-financial data

**My Music-Financial Philosophy:**
Music has the power to transform how we think about and interact with money. I help you create meaningful connections between your musical preferences and financial behavior to make your money journey more engaging and successful.

**My Promise:**
I'll help you build a comprehensive music-financial integration system that makes your financial journey more enjoyable, insightful, and successful through the power of music.

Could you tell me more specifically what Spotify integration topic you'd like to discuss? I'm ready to help you create amazing music-financial experiences!`;
  };

  const quickActions = [
    { icon: Music, text: "Create Playlist", action: () => sendMessage("I want to create a financial playlist") },
    { icon: Heart, text: "Mood Analysis", action: () => sendMessage("I want to analyze mood-spending correlations") },
    { icon: BarChart3, text: "Financial Insights", action: () => sendMessage("I want music-based financial insights") },
    { icon: Zap, text: "Setup Integration", action: () => sendMessage("I want to set up Spotify integration") },
    { icon: Play, text: "Create Content", action: () => sendMessage("I want to create music-financial content") },
    { icon: TrendingUp, text: "Track Trends", action: () => sendMessage("I want to track music-financial trends") }
  ];

  const financialPlaylists = [
    {
      title: "Building My Emergency Fund",
      tracks: 24,
      duration: "1h 32m",
      mood: "Motivated",
      status: "active"
    },
    {
      title: "Smart Spending Vibes",
      tracks: 18,
      duration: "1h 15m",
      mood: "Focused",
      status: "active"
    },
    {
      title: "Debt-Free Journey",
      tracks: 31,
      duration: "2h 8m",
      mood: "Empowered",
      status: "active"
    },
    {
      title: "Investment Confidence",
      tracks: 22,
      duration: "1h 45m",
      mood: "Confident",
      status: "draft"
    }
  ];

  const waveTips = [
    {
      icon: Headphones,
      title: "Match Music to Tasks",
      description: "Use different playlists for different financial activities"
    },
    {
      icon: Heart,
      title: "Track Your Mood",
      description: "Notice how music affects your spending decisions"
    },
    {
      icon: TrendingUp,
      title: "Update Regularly",
      description: "Keep playlists fresh and relevant to your goals"
    },
    {
      icon: Share2,
      title: "Share with Community",
      description: "Create collaborative playlists with friends"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Wave Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🌊</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Wave</h1>
              <p className="text-white/70 text-sm">Spotify Integration AI</p>
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
                  <div className="text-xl">🌊</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with Wave</h2>
                    <p className="text-white/60 text-sm">Spotify Integration Specialist</p>
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
                        ? 'bg-blue-600 text-white'
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
                        <span>Wave is flowing...</span>
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
                    placeholder="Ask Wave about Spotify integration, playlist creation, mood analysis, or financial insights..."
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
              <h3 className="text-lg font-semibold text-white mb-4">Spotify Integration Actions</h3>
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

            {/* Financial Playlists */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Your Financial Playlists</h3>
              <div className="space-y-3">
                {financialPlaylists.map((playlist, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-blue-400" />
                        <span className="text-white text-sm font-medium">{playlist.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded text-xs ${
                          playlist.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {playlist.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{playlist.tracks} tracks</span>
                      <span>{playlist.duration}</span>
                      <span className="text-blue-400">{playlist.mood}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Wave's Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Wave's Tips</h3>
              <div className="space-y-3">
                {waveTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Wave's Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Wave's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Playlists Created</span>
                  <span className="text-blue-400">156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Mood Analysis</span>
                  <span className="text-green-400">2,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Insights Generated</span>
                  <span className="text-purple-400">892</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Integration Time</span>
                  <span className="text-yellow-400">247 hrs</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
