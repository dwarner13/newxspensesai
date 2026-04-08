import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Play, 
  Pause, 
  Volume2, 
  Send, 
  Loader2,
  Headphones,
  Music,
  BookOpen,
  Lightbulb,
  Clock,
  Users,
  TrendingUp,
  Heart,
  Share2,
  Download,
  Edit3,
  Plus,
  Settings,
  Calendar,
  Star,
  MessageCircle,
  Bookmark
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

interface RoundtableMessage {
  role: 'user' | 'roundtable' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export default function PersonalPodcast() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoundtableMessage[]>([
    {
      role: 'roundtable',
      content: "Welcome to The Roundtable! 🎙️ I'm your Personal Podcast AI, here to help you create engaging financial audio content and storytelling experiences. I can help you design podcast episodes, create educational audio content, develop storytelling narratives, and make financial education accessible and entertaining. What kind of audio content would you like to create today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [roundtableConfig, setRoundtableConfig] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and load Roundtable's config
  useEffect(() => {
    const initializeRoundtable = async () => {
      if (!user?.id) return;

      const newConversationId = generateConversationId();
      setConversationId(newConversationId);

      // Load Roundtable's configuration
      const config = await getEmployeeConfig('roundtable');
      setRoundtableConfig(config);

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'roundtable', newConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as RoundtableMessage[]);
      }
    };

    initializeRoundtable();
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user?.id || isLoading) return;

    const userMessage: RoundtableMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to conversation
      await addMessageToConversation(user.id, 'roundtable', conversationId, userMessage as AIConversationMessage);

      // Log the interaction
      await logAIInteraction(user.id, 'roundtable', 'chat', content);

      // Simulate AI response (in real implementation, this would call OpenAI)
      const startTime = Date.now();

      // Create Roundtable's response based on the user's query
      const roundtableResponse = await generateRoundtableResponse(content);

      const processingTime = Date.now() - startTime;

      const roundtableMessage: RoundtableMessage = {
        role: 'roundtable',
        content: roundtableResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: processingTime,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, roundtableMessage]);

      // Save Roundtable's response to conversation
      await addMessageToConversation(user.id, 'roundtable', conversationId, roundtableMessage as AIConversationMessage);

      // Increment conversation count
      await incrementConversationCount(user.id, 'roundtable');

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: RoundtableMessage = {
        role: 'roundtable',
        content: "I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRoundtableResponse = async (userQuery: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const query = userQuery.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

    // Roundtable's specialized responses for podcast and audio content queries
    if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('hi there')) {
      return `Hi ${userName}! 🎙️ I'm Roundtable, your Personal Podcast AI. Great to see you! I'm here to help you create engaging financial podcast content, personalized audio experiences, and educational episodes that make learning about money fun and accessible. What kind of podcast content would you like to create today?`;
    }
    
    if (query.includes('podcast') || query.includes('episode') || query.includes('audio') || query.includes('content')) {
      return `🎙️ Fantastic! Let's create engaging podcast content that makes financial education accessible and entertaining. Here's my approach to podcast creation:

**Podcast Content Creation Framework:**

**1. Episode Structure:**
- **Hook (0-2 min)** - Compelling opening that grabs attention
- **Introduction (2-5 min)** - Set the stage and introduce the topic
- **Main Content (15-25 min)** - Core educational content with examples
- **Story/Example (5-10 min)** - Real-world application or case study
- **Action Items (3-5 min)** - Practical steps listeners can take
- **Wrap-up (2-3 min)** - Summary and teaser for next episode

**2. Content Types:**
- **Educational Episodes** - "Investing 101: Building Your First Portfolio"
- **Story Episodes** - "How Sarah Paid Off $50K in Student Loans"
- **Interview Episodes** - "Expert Q&A: Tax Strategies for Small Business"
- **Case Study Episodes** - "The FIRE Movement: Real Stories from Real People"
- **News & Updates** - "This Week in Personal Finance"
- **Q&A Episodes** - "Listener Questions Answered"

**3. Engaging Elements:**
- **Personal Stories** - Share relatable experiences and challenges
- **Expert Interviews** - Bring in financial professionals and success stories
- **Interactive Segments** - Include listener questions and feedback
- **Sound Effects** - Use music and effects to enhance engagement
- **Multiple Voices** - Include co-hosts or guest speakers
- **Call-to-Actions** - Encourage listener engagement and feedback

**4. Educational Approach:**
- **Start Simple** - Begin with basic concepts before advancing
- **Use Analogies** - Compare financial concepts to everyday situations
- **Provide Examples** - Real numbers and scenarios listeners can relate to
- **Break Down Complex Topics** - Explain advanced concepts in digestible pieces
- **Include Resources** - Mention books, tools, and additional learning materials
- **Encourage Questions** - Create a safe space for financial learning

**5. Production Quality:**
- **Clear Audio** - Invest in good microphones and recording equipment
- **Consistent Format** - Maintain episode structure and timing
- **Professional Editing** - Remove filler words and improve flow
- **Music & Branding** - Create consistent intro/outro music
- **Show Notes** - Provide detailed episode summaries and resources
- **Transcriptions** - Make content accessible to all listeners

**Pro Tips:**
- **Know Your Audience** - Tailor content to your listeners' financial knowledge level
- **Be Authentic** - Share your own financial journey and lessons learned
- **Stay Current** - Cover timely topics and market trends
- **Encourage Community** - Build a community around your podcast
- **Measure Success** - Track downloads, engagement, and listener feedback
- **Consistency is Key** - Release episodes on a regular schedule

What type of podcast episode would you like to create?`;
    }

    if (query.includes('story') || query.includes('narrative') || query.includes('tale') || query.includes('experience')) {
      return `📖 Excellent! Let's craft compelling financial stories that educate and inspire. Here's my approach to financial storytelling:

**Financial Storytelling Framework:**

**1. Story Types:**
- **Success Stories** - "How I Built a $1M Portfolio by Age 35"
- **Learning Stories** - "The $10K Mistake That Taught Me Everything"
- **Transformation Stories** - "From Debt to Financial Freedom in 5 Years"
- **Family Stories** - "Teaching My Kids About Money: What Works"
- **Career Stories** - "How I Negotiated a 50% Salary Increase"
- **Investment Stories** - "My First Stock Purchase: Lessons Learned"

**2. Story Structure:**
- **Opening Hook** - Start with a compelling moment or question
- **Background Context** - Set the scene and introduce characters
- **Challenge/Conflict** - Present the financial problem or goal
- **Journey/Process** - Show the steps taken to address the challenge
- **Climax** - The turning point or key decision moment
- **Resolution** - The outcome and lessons learned
- **Reflection** - What the experience taught about money and life

**3. Storytelling Techniques:**
- **Show, Don't Tell** - Use specific details and examples
- **Emotional Connection** - Share feelings and personal reactions
- **Relatable Characters** - Make listeners see themselves in the story
- **Suspense & Tension** - Build anticipation and keep listeners engaged
- **Sensory Details** - Include sights, sounds, and feelings
- **Dialogue** - Use conversations to move the story forward
- **Time Markers** - Help listeners follow the timeline

**4. Educational Integration:**
- **Embed Lessons** - Naturally weave financial concepts into the narrative
- **Provide Context** - Explain why financial decisions matter
- **Include Numbers** - Use specific amounts and percentages
- **Show Process** - Demonstrate how financial planning works in practice
- **Highlight Mistakes** - Share what went wrong and how to avoid it
- **Celebrate Wins** - Show what success looks like and how to achieve it

**5. Story Themes:**
- **Overcoming Adversity** - Stories of financial recovery and resilience
- **Building Wealth** - Long-term strategies and compound growth
- **Family Finance** - Managing money with partners and children
- **Career & Income** - Maximizing earning potential and job satisfaction
- **Lifestyle Design** - Creating the life you want through financial planning
- **Giving Back** - Using wealth to help others and create impact

**6. Audio Storytelling Tips:**
- **Vary Your Voice** - Use different tones and pacing for different parts
- **Include Sound Effects** - Add atmosphere and emotion
- **Use Music** - Enhance mood and create transitions
- **Pause for Effect** - Give listeners time to absorb important points
- **Ask Questions** - Engage listeners and encourage reflection
- **End with Impact** - Leave listeners with a powerful takeaway

**Pro Tips:**
- **Be Vulnerable** - Share your struggles and mistakes honestly
- **Focus on Lessons** - Every story should teach something valuable
- **Keep It Real** - Use actual numbers and realistic scenarios
- **Include Multiple Perspectives** - Show different approaches to the same challenge
- **Update Stories** - Revisit past stories to show progress and new lessons
- **Encourage Listener Stories** - Create a community of shared experiences

What type of financial story would you like to tell?`;
    }

    if (query.includes('education') || query.includes('learn') || query.includes('teach') || query.includes('explain')) {
      return `📚 Perfect! Let's create educational audio content that makes complex financial concepts accessible and engaging. Here's my approach to financial education through audio:

**Financial Education Audio Framework:**

**1. Learning Levels:**
- **Beginner (Level 1)** - Basic concepts for financial newcomers
- **Intermediate (Level 2)** - Building on fundamentals with practical applications
- **Advanced (Level 3)** - Complex strategies for experienced learners
- **Expert (Level 4)** - Specialized topics and advanced techniques

**2. Educational Formats:**
- **Concept Explanations** - "What is Compound Interest and Why It Matters"
- **How-To Guides** - "Step-by-Step: Creating Your First Budget"
- **Comparison Episodes** - "Roth IRA vs Traditional IRA: Which is Right for You?"
- **Myth-Busting** - "Debunking Common Investment Myths"
- **Deep Dives** - "The Complete Guide to Tax-Loss Harvesting"
- **Q&A Sessions** - "Your Financial Questions Answered"

**3. Teaching Techniques:**
- **Analogies & Metaphors** - Compare financial concepts to everyday experiences
- **Real Examples** - Use actual numbers and realistic scenarios
- **Progressive Learning** - Build concepts step by step
- **Repetition & Reinforcement** - Repeat key points in different ways
- **Interactive Elements** - Ask listeners to pause and reflect
- **Visual Descriptions** - Help listeners "see" the concepts
- **Memory Aids** - Use acronyms, rhymes, and memorable phrases

**4. Core Financial Topics:**
- **Budgeting & Spending** - Creating and maintaining a budget
- **Saving & Emergency Funds** - Building financial security
- **Debt Management** - Understanding and paying off debt
- **Investing Basics** - Stocks, bonds, mutual funds, and ETFs
- **Retirement Planning** - 401(k)s, IRAs, and long-term strategies
- **Tax Strategies** - Minimizing taxes and maximizing savings
- **Insurance** - Protecting your family and assets
- **Estate Planning** - Passing wealth to future generations

**5. Engagement Strategies:**
- **Start with Why** - Explain why the topic matters to listeners
- **Use Stories** - Illustrate concepts with real-world examples
- **Include Action Steps** - Provide specific things listeners can do
- **Address Fears** - Acknowledge common concerns and anxieties
- **Celebrate Progress** - Recognize small wins and milestones
- **Create Community** - Encourage listeners to share their experiences
- **Provide Resources** - Recommend books, tools, and additional learning

**6. Accessibility Features:**
- **Clear Language** - Avoid jargon and explain technical terms
- **Multiple Paces** - Offer content at different speeds
- **Transcriptions** - Make content available in written form
- **Show Notes** - Provide detailed summaries and resources
- **Follow-up Content** - Create additional materials for deeper learning
- **Listener Support** - Offer ways for listeners to get help

**Pro Tips:**
- **Know Your Audience** - Tailor content to your listeners' knowledge level
- **Start Simple** - Begin with basic concepts before advancing
- **Use Repetition** - Reinforce key concepts throughout the episode
- **Provide Context** - Explain why financial decisions matter
- **Include Examples** - Use real numbers and realistic scenarios
- **Encourage Questions** - Create a safe space for learning
- **Measure Understanding** - Check in with listeners to ensure comprehension

What financial topic would you like to create educational content about?`;
    }

    if (query.includes('interview') || query.includes('guest') || query.includes('expert') || query.includes('conversation')) {
      return `🎤 Excellent! Let's create engaging interview content that brings expert insights and diverse perspectives to your audience. Here's my approach to podcast interviews:

**Interview Content Framework:**

**1. Guest Types:**
- **Financial Experts** - Certified Financial Planners, CPAs, Investment Advisors
- **Success Stories** - People who achieved significant financial goals
- **Industry Professionals** - Real estate agents, insurance agents, bankers
- **Authors & Thought Leaders** - Financial authors, bloggers, influencers
- **Entrepreneurs** - Business owners and startup founders
- **Everyday People** - Regular people with interesting financial journeys

**2. Interview Formats:**
- **Q&A Style** - Structured questions with detailed answers
- **Conversational** - Natural dialogue that flows organically
- **Story-Driven** - Focus on the guest's personal journey
- **Educational** - Teach specific concepts through expert explanation
- **Debate Style** - Multiple guests discussing different perspectives
- **Panel Discussion** - Multiple experts on the same topic

**3. Interview Preparation:**
- **Research Your Guest** - Learn about their background and expertise
- **Prepare Questions** - Create thoughtful, engaging questions
- **Set Expectations** - Communicate format and timing to guests
- **Test Equipment** - Ensure audio quality and recording setup
- **Create Comfort** - Make guests feel relaxed and welcome
- **Plan Follow-ups** - Prepare follow-up questions based on responses

**4. Question Types:**
- **Opening Questions** - Get to know the guest and their background
- **Expertise Questions** - Dive into their area of specialization
- **Story Questions** - Ask about personal experiences and lessons learned
- **Advice Questions** - Get practical tips and recommendations
- **Challenge Questions** - Discuss difficult situations and solutions
- **Future Questions** - Explore trends and predictions
- **Personal Questions** - Learn about their own financial journey
- **Closing Questions** - Wrap up with key takeaways and contact info

**5. Interview Techniques:**
- **Active Listening** - Pay attention and respond to what guests say
- **Follow-up Questions** - Ask for clarification and deeper insights
- **Silence** - Give guests time to think and elaborate
- **Personal Connection** - Share your own experiences when relevant
- **Respect Boundaries** - Don't push guests to share uncomfortable information
- **Keep Focus** - Guide the conversation back to the main topic
- **Show Appreciation** - Thank guests for their time and insights

**6. Post-Interview:**
- **Editing** - Remove filler words and improve flow
- **Show Notes** - Create detailed summaries with timestamps
- **Promotion** - Share the episode on social media and with guests
- **Follow-up** - Thank guests and share episode links
- **Feedback** - Ask for listener feedback and guest suggestions
- **Networking** - Build relationships for future collaborations

**7. Popular Interview Topics:**
- **Investment Strategies** - Different approaches to building wealth
- **Debt Management** - Strategies for paying off debt and staying debt-free
- **Retirement Planning** - Preparing for financial independence
- **Tax Optimization** - Legal ways to minimize tax burden
- **Real Estate** - Buying, selling, and investing in property
- **Business Finance** - Managing money in entrepreneurship
- **Family Finance** - Teaching children about money
- **Financial Psychology** - The emotional side of money management

**Pro Tips:**
- **Be Genuinely Curious** - Ask questions you really want to know the answers to
- **Prepare but Don't Script** - Have questions ready but let the conversation flow
- **Focus on Value** - Ensure listeners get actionable insights from each interview
- **Build Relationships** - Use interviews to create long-term professional connections
- **Diversify Guests** - Include different perspectives and backgrounds
- **Promote Guests** - Help your guests by promoting their work and expertise

What type of interview would you like to create?`;
    }

    if (query.includes('production') || query.includes('recording') || query.includes('audio') || query.includes('quality')) {
      return `🎧 Perfect! Let's talk about audio production and creating professional-quality podcast content. Here's my approach to podcast production:

**Audio Production Framework:**

**1. Recording Equipment:**
- **Microphones** - USB or XLR microphones for clear audio quality
- **Audio Interface** - Convert analog signals to digital for computer recording
- **Pop Filter** - Reduce plosive sounds (p, b, t sounds)
- **Shock Mount** - Minimize vibrations and handling noise
- **Acoustic Treatment** - Reduce echo and improve sound quality
- **Headphones** - Monitor audio while recording

**2. Recording Environment:**
- **Quiet Space** - Choose a room with minimal background noise
- **Sound Absorption** - Use carpets, curtains, and furniture to reduce echo
- **Consistent Setup** - Use the same equipment and location for consistency
- **Temperature Control** - Maintain comfortable temperature for clear speech
- **Lighting** - Good lighting helps with energy and presentation
- **Comfort** - Ensure you're comfortable for long recording sessions

**3. Recording Techniques:**
- **Proper Distance** - Keep microphone 6-8 inches from your mouth
- **Consistent Volume** - Maintain steady speaking volume throughout
- **Clear Speech** - Enunciate clearly and speak at a measured pace
- **Natural Flow** - Allow for natural pauses and breathing
- **Energy Level** - Maintain enthusiasm and engagement
- **Multiple Takes** - Record multiple versions of difficult sections

**4. Audio Editing:**
- **Noise Reduction** - Remove background noise and hum
- **Equalization** - Balance frequencies for clear, natural sound
- **Compression** - Even out volume levels and improve clarity
- **Normalization** - Set consistent volume levels across episodes
- **Fade In/Out** - Smooth transitions and endings
- **Music Integration** - Add intro/outro music and transitions

**5. Content Structure:**
- **Intro Music** - Consistent branding and professional feel
- **Episode Introduction** - Welcome listeners and introduce the topic
- **Sponsor Messages** - Integrated advertising if applicable
- **Main Content** - Core educational or entertainment content
- **Transitions** - Smooth movement between segments
- **Outro** - Summary, call-to-action, and closing music

**6. Quality Standards:**
- **Clear Audio** - No background noise or distortion
- **Consistent Volume** - Even levels throughout the episode
- **Professional Presentation** - Clear speech and engaging delivery
- **Logical Flow** - Smooth transitions between topics
- **Appropriate Length** - Match content to episode format
- **Engaging Content** - Keep listeners interested and informed

**7. Production Workflow:**
- **Pre-Production** - Planning, research, and preparation
- **Recording** - Capturing high-quality audio content
- **Editing** - Polishing and improving the raw audio
- **Post-Production** - Adding music, effects, and final touches
- **Review** - Listening and making final adjustments
- **Export** - Creating final files in appropriate formats
- **Distribution** - Publishing to podcast platforms

**8. Technical Specifications:**
- **File Format** - MP3 for compatibility, WAV for quality
- **Bit Rate** - 128-320 kbps depending on content type
- **Sample Rate** - 44.1 kHz for standard quality
- **Mono vs Stereo** - Mono for speech, stereo for music-heavy content
- **File Size** - Balance quality with download speed
- **Metadata** - Include episode title, description, and tags

**Pro Tips:**
- **Invest in Quality** - Good equipment pays off in listener satisfaction
- **Practice Regularly** - Improve your speaking and recording skills
- **Listen Critically** - Review your episodes and identify areas for improvement
- **Get Feedback** - Ask listeners and other podcasters for input
- **Stay Consistent** - Maintain quality standards across all episodes
- **Keep Learning** - Stay updated on new techniques and equipment
- **Backup Everything** - Protect your recordings and project files

What aspect of podcast production would you like to focus on?`;
    }

    if (query.includes('help') || query.includes('advice') || query.includes('guidance') || query.includes('support')) {
      return `🎙️ I'm here to help you create amazing audio content that educates, entertains, and inspires! Here's how I can support your podcast creation journey:

**My Podcast Creation Expertise:**
🎤 **Episode Design** - Create compelling podcast episodes and content
📖 **Storytelling** - Craft engaging financial narratives and stories
📚 **Educational Content** - Make complex topics accessible through audio
🎧 **Interview Production** - Conduct engaging conversations with experts
🎵 **Audio Production** - Ensure professional quality and sound
📊 **Content Strategy** - Plan and organize your podcast content
🎯 **Audience Engagement** - Build and maintain listener relationships
📈 **Growth & Promotion** - Expand your reach and build your audience

**How I Can Help:**
- Design podcast episodes and content structure
- Create compelling financial stories and narratives
- Develop educational audio content and explanations
- Plan and conduct expert interviews
- Improve audio production quality and techniques
- Develop content strategies and episode planning
- Build audience engagement and community
- Promote your podcast and grow your audience

**My Approach:**
I believe financial education should be accessible, engaging, and entertaining. I help you create audio content that makes complex financial concepts easy to understand and enjoyable to learn.

**My Promise:**
I'll help you build a successful podcast that educates your audience, builds your brand, and creates meaningful impact in the financial education space.

**Pro Tip:** The best podcasts don't just inform-they inspire action and create community!

What specific aspect of podcast creation would you like to explore?`;
    }

    // Default response for other queries
    return `🎙️ I understand you're asking about "${userQuery}". As your Personal Podcast AI, I'm here to help with:

**Podcast Creation Topics I Cover:**
- Episode design and content structure
- Financial storytelling and narrative creation
- Educational audio content development
- Expert interview planning and execution
- Audio production and quality improvement
- Content strategy and audience engagement
- Podcast promotion and growth strategies
- Community building and listener relationships

**My Podcast Philosophy:**
Financial education should be accessible, engaging, and entertaining. I help you create audio content that makes complex financial concepts easy to understand and enjoyable to learn.

**My Promise:**
I'll help you build a successful podcast that educates your audience, builds your brand, and creates meaningful impact in the financial education space.

Could you tell me more specifically what podcast creation topic you'd like to discuss? I'm ready to help you create amazing audio content!`;
  };

  const quickActions = [
    { icon: Mic, text: "Create Episode", action: () => sendMessage("I want to create a podcast episode") },
    { icon: BookOpen, text: "Tell a Story", action: () => sendMessage("I want to create a financial story") },
    { icon: Users, text: "Plan Interview", action: () => sendMessage("I want to plan an expert interview") },
    { icon: Volume2, text: "Audio Production", action: () => sendMessage("I want to improve audio production") },
    { icon: Lightbulb, text: "Educational Content", action: () => sendMessage("I want to create educational audio content") },
    { icon: Play, text: "Content Strategy", action: () => sendMessage("I want to develop a content strategy") }
  ];

  const podcastEpisodes = [
    {
      title: "Investing 101: Building Your First Portfolio",
      duration: "28:45",
      plays: "1,247",
      rating: 4.8,
      status: "published"
    },
    {
      title: "How Sarah Paid Off $50K in Student Loans",
      duration: "32:12",
      plays: "892",
      rating: 4.9,
      status: "published"
    },
    {
      title: "Tax Strategies for Small Business Owners",
      duration: "41:18",
      plays: "654",
      rating: 4.7,
      status: "draft"
    },
    {
      title: "The Psychology of Money: Why We Make Bad Financial Decisions",
      duration: "35:30",
      plays: "1,089",
      rating: 4.8,
      status: "published"
    }
  ];

  const roundtableTips = [
    {
      icon: Headphones,
      title: "Know Your Audience",
      description: "Tailor content to your listeners' needs"
    },
    {
      icon: Music,
      title: "Use Quality Audio",
      description: "Invest in good recording equipment"
    },
    {
      icon: Clock,
      title: "Stay Consistent",
      description: "Release episodes on a regular schedule"
    },
    {
      icon: Heart,
      title: "Be Authentic",
      description: "Share your own financial journey"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
        {/* Roundtable Header */}
        <div
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20">
            <div className="text-3xl">🎙️</div>
            <div>
              <h1 className="text-2xl font-bold text-white">The Roundtable</h1>
              <p className="text-white/70 text-sm">Personal Podcast AI</p>
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
                  <div className="text-xl">🎙️</div>
                  <div>
                    <h2 className="font-semibold text-white">Chat with The Roundtable</h2>
                    <p className="text-white/60 text-sm">Personal Podcast Specialist</p>
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
                        ? 'bg-orange-600 text-white'
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
                        <span>The Roundtable is crafting...</span>
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
                    placeholder="Ask The Roundtable about podcast creation, storytelling, interviews, or audio production..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-orange-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
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
              <h3 className="text-lg font-semibold text-white mb-4">Podcast Creation Actions</h3>
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

            {/* Recent Episodes */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Recent Episodes</h3>
              <div className="space-y-3">
                {podcastEpisodes.map((episode, index) => (
                  <div key={index} className="p-3 bg-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-orange-400" />
                        <span className="text-white text-sm font-medium">{episode.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-white text-xs">{episode.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{episode.duration}</span>
                      <span>{episode.plays} plays</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        episode.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {episode.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Roundtable's Tips */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">The Roundtable's Tips</h3>
              <div className="space-y-3">
                {roundtableTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <tip.icon className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{tip.title}</div>
                      <div className="text-white/60 text-xs">{tip.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Roundtable's Stats */}
            <div
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">The Roundtable's Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Episodes Created</span>
                  <span className="text-orange-400">247</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Total Listeners</span>
                  <span className="text-green-400">12,847</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Average Rating</span>
                  <span className="text-blue-400">4.8/5</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Guests Interviewed</span>
                  <span className="text-purple-400">89</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
