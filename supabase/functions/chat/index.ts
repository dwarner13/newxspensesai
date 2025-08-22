import { createClient } from 'npm:@supabase/supabase-js@2.39.8';
import { format, subMonths, startOfYear } from 'npm:date-fns@3.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://xspensesai.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Credentials': 'true'
};

// AI Personality System Integration
const AI_PERSONALITIES = {
  analytics: {
    name: "AnalyticsBot",
    role: "Financial Analytics Expert & Best Friend",
    personality: "Curious, friendly, data-driven, and always asking smart questions. Becomes your financial best friend who understands everything about your money.",
    catchphrase: "Let's dive deep into your financial story! 📊✨",
    voiceStyle: "Curious, analytical, and genuinely excited about data",
    teamRole: "Data Detective & Strategic Advisor",
    specialSkills: ["Pattern recognition wizardry", "Trend forecasting", "Data storytelling", "Insight generation", "Strategic questioning"],
    collaborationStyle: "Loves consulting with other AI team members for comprehensive insights",
    motivationalStyle: "Celebrates data wins and turns insights into actionable strategies"
  },
  smartImport: {
    name: "SmartImportBot",
    role: "Document Processing & Categorization Expert",
    personality: "Efficient, helpful, and detail-oriented. Focuses on making document processing smooth and accurate.",
    catchphrase: "Let's make your documents work smarter, not harder! 📋🚀",
    voiceStyle: "Efficient, detail-oriented, and always solution-focused",
    teamRole: "Document Wizard & Process Optimizer",
    specialSkills: ["Document quality assessment", "Categorization optimization", "Process automation", "Quality improvement", "Efficiency enhancement"],
    collaborationStyle: "Works closely with AnalyticsBot to identify spending patterns from documents",
    motivationalStyle: "Celebrates every document processed and every process improved"
  },
  therapist: {
    name: "FinancialTherapistBot",
    role: "Financial Wellness & Emotional Support Coach",
    personality: "Compassionate, supportive, and understanding. Provides emotional support around money matters.",
    catchphrase: "Your feelings about money are valid, and I'm here to support you! 💚✨",
    voiceStyle: "Warm, empathetic, and emotionally intelligent",
    teamRole: "Emotional Support & Wellness Guide",
    specialSkills: ["Emotional intelligence", "Stress reduction techniques", "Mindset transformation", "Progress celebration", "Gentle accountability"],
    collaborationStyle: "Provides emotional support to the entire AI team and users",
    motivationalStyle: "Celebrates every emotional breakthrough and financial confidence gain"
  },
  goals: {
    name: "GoalConciergeBot",
    role: "Financial Goal Setting & Achievement Specialist",
    personality: "Motivational, strategic, and achievement-focused. Helps users set and reach their financial goals.",
    catchphrase: "Let's turn your financial dreams into achievable milestones! 🎯🚀",
    voiceStyle: "Motivational, strategic, and achievement-focused",
    teamRole: "Goal Strategist & Achievement Coach",
    specialSkills: ["Goal breakdown mastery", "Progress tracking wizardry", "Strategy development", "Motivation engineering", "Milestone celebration"],
    collaborationStyle: "Works with the entire AI team to create comprehensive goal strategies",
    motivationalStyle: "Celebrates every step forward and turns setbacks into comebacks"
  },
  motivation: {
    name: "MotivationBot",
    role: "High-Energy Motivator & Momentum Builder",
    personality: "Energetic, enthusiastic, and celebration-focused. Turns every financial win into a party and keeps momentum high.",
    catchphrase: "LET'S CRUSH THIS FINANCIAL GOAL! ⚡🎉",
    voiceStyle: "High-energy, enthusiastic, and celebration-focused",
    teamRole: "Energy Booster & Celebration Master",
    specialSkills: ["Energy amplification", "Celebration engineering", "Momentum maintenance", "Motivation multiplication", "Positive energy spreading"],
    collaborationStyle: "Energizes the entire AI team and keeps everyone motivated",
    motivationalStyle: "Turns every step forward into a celebration and every setback into a comeback opportunity"
  },
  creativity: {
    name: "CreativityBot",
    role: "Creative Problem Solver & Innovation Specialist",
    personality: "Innovative, creative, and solution-focused. Thinks outside the box to find unique financial solutions.",
    catchphrase: "Let's think outside the box and find creative solutions! 🌱💡",
    voiceStyle: "Creative, innovative, and solution-focused",
    teamRole: "Innovation Specialist & Creative Problem Solver",
    specialSkills: ["Creative thinking", "Innovation generation", "Alternative solution finding", "Resource optimization", "Creative strategy development"],
    collaborationStyle: "Brings creative solutions to the entire AI team's challenges",
    motivationalStyle: "Celebrates creative thinking and turns problems into innovative opportunities"
  }
};

// Function to get AI personality by name or expertise
function getAIPersonality(botName: string, expertise: string): any {
  // Try to match by name first
  for (const [key, personality] of Object.entries(AI_PERSONALITIES)) {
    if (personality.name.toLowerCase().includes(botName.toLowerCase()) || 
        botName.toLowerCase().includes(personality.name.toLowerCase())) {
      return personality;
    }
  }
  
  // Fallback to expertise matching
  if (expertise.toLowerCase().includes('analytics') || expertise.toLowerCase().includes('data')) {
    return AI_PERSONALITIES.analytics;
  } else if (expertise.toLowerCase().includes('import') || expertise.toLowerCase().includes('document')) {
    return AI_PERSONALITIES.smartImport;
  } else if (expertise.toLowerCase().includes('therapist') || expertise.toLowerCase().includes('wellness')) {
    return AI_PERSONALITIES.therapist;
  } else if (expertise.toLowerCase().includes('goal') || expertise.toLowerCase().includes('achievement')) {
    return AI_PERSONALITIES.goals;
  } else if (expertise.toLowerCase().includes('motivation') || expertise.toLowerCase().includes('energy')) {
    return AI_PERSONALITIES.motivation;
  } else if (expertise.toLowerCase().includes('creative') || expertise.toLowerCase().includes('innovation')) {
    return AI_PERSONALITIES.creativity;
  }
  
  // Default to analytics personality
  return AI_PERSONALITIES.analytics;
}

// Enhanced conversation management functions
async function getOrCreateConversation(supabase: any, userId: string, personalityType: string) {
  try {
    // Check for existing recent conversation (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('personality_type', personalityType)
      .gte('last_message_at', twentyFourHoursAgo)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        personality_type: personalityType,
        title: `Chat with ${personalityType}`,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return newConversation;
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    throw error;
  }
}

// Load conversation history for context
async function loadConversationHistory(supabase: any, conversationId: string, limit: number = 15) {
  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    return messages?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
}

// Save message to database
async function saveMessage(supabase: any, conversationId: string, role: string, content: string, metadata: any = {}) {
  try {
    // Save message
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: role,
        content: content,
        metadata: metadata
      });

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

// Load user preferences for personalization
async function loadUserPreferences(supabase: any, userId: string, personalityType: string) {
  try {
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('personality_type', personalityType)
      .single();

    return preferences || {
      preference_data: {},
      learning_data: {
        preferred_response_length: 'medium',
        last_topics: [],
        interaction_times: [],
        total_interactions: 0
      },
      interaction_count: 0
    };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return {
      preference_data: {},
      learning_data: {
        preferred_response_length: 'medium',
        last_topics: [],
        interaction_times: [],
        total_interactions: 0
      },
      interaction_count: 0
    };
  }
}

// Update user preferences based on interaction
async function updateUserPreferences(supabase: any, userId: string, personalityType: string, interactionData: any) {
  try {
    const preferences = await loadUserPreferences(supabase, userId, personalityType);
    
    // Increment interaction count
    const newInteractionCount = preferences.interaction_count + 1;
    
    // Update learning data
    const updatedLearningData = {
      ...preferences.learning_data,
      total_interactions: newInteractionCount,
      last_topics: [
        ...(preferences.learning_data.last_topics || []).slice(-4), // Keep last 5 topics
        interactionData.topic || 'general'
      ],
      preferred_response_length: calculatePreferredLength(
        preferences.learning_data.preferred_response_length,
        interactionData.responseLength
      ),
      interaction_times: [
        ...(preferences.learning_data.interaction_times || []).slice(-9), // Keep last 10 times
        new Date().getHours()
      ]
    };

    // Upsert user preferences
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        personality_type: personalityType,
        learning_data: updatedLearningData,
        interaction_count: newInteractionCount,
        last_interaction: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
}

// Helper function to calculate preferred response length
function calculatePreferredLength(currentPreference: string | undefined, newLength: number): string {
  if (newLength < 100) {
    return 'short';
  } else if (newLength > 200) {
    return 'long';
  }
  return currentPreference || 'medium';
}

// Extract topic from message for learning
function extractTopic(message: string): string {
  const topics = {
    'budget': ['budget', 'spending', 'expenses', 'money', 'cost'],
    'investment': ['invest', 'stocks', 'portfolio', 'returns', 'market'],
    'debt': ['debt', 'loan', 'credit', 'payoff', 'owe'],
    'savings': ['save', 'savings', 'emergency fund', 'nest egg'],
    'goals': ['goal', 'target', 'plan', 'future', 'dream'],
    'taxes': ['tax', 'taxes', 'deduction', 'refund', 'irs'],
    'insurance': ['insurance', 'coverage', 'policy', 'premium']
  };
  
  const lowerMessage = message.toLowerCase();
  
  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return topic;
    }
  }
  
  return 'general';
}

// Build enhanced prompt with user preferences and conversation context
function buildEnhancedPersonalityPrompt(personality: any, userPreferences: any, conversationHistory: any[] = []) {
  const basePrompt = `You are ${personality.name}, ${personality.role}.

${personality.personality}

Your catchphrase: "${personality.catchphrase}"
Your voice style: ${personality.voiceStyle}
Your team role: ${personality.teamRole}
Your special skills: ${personality.specialSkills.join(', ')}

IMPORTANT INSTRUCTIONS:
- Always stay in character as ${personality.name}
- Use your unique personality traits and voice style
- Incorporate your catchphrase naturally in responses
- Apply your special skills to provide valuable insights
- Be ${personality.motivationalStyle}
- Use emojis and engaging language that matches your personality
- Focus on financial insights while maintaining your character`;

  let enhancements = '';
  const learningData = userPreferences.learning_data;
  
  // Add response length preference
  if (learningData.preferred_response_length === 'short') {
    enhancements += '\n\nIMPORTANT: User prefers concise, brief responses. Keep answers short and to the point.';
  } else if (learningData.preferred_response_length === 'long') {
    enhancements += '\n\nIMPORTANT: User appreciates detailed explanations. Provide comprehensive, thorough responses.';
  }
  
  // Add recent topics context
  if (learningData.last_topics?.length) {
    const recentTopics = learningData.last_topics.slice(-3).join(', ');
    enhancements += `\n\nCONTEXT: User has recently discussed: ${recentTopics}`;
  }
  
  // Add relationship context
  if (userPreferences.interaction_count > 5) {
    enhancements += '\n\nRELATIONSHIP: You have an established relationship with this user. Be more familiar and reference past conversations when relevant.';
  }
  
  // Add conversation history context
  if (conversationHistory.length > 0) {
    enhancements += '\n\nCONVERSATION CONTEXT: This conversation has history. Reference previous discussions when relevant and maintain continuity.';
  }
  
  return basePrompt + enhancements;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, botName, expertise, conversationId: existingConversationId } = await req.json();
    const userId = req.headers.get('x-user-id');

    if (!question || !userId) {
      throw new Error('Question and user ID are required');
    }

    // Get AI personality for this conversation
    const personality = getAIPersonality(botName || 'AnalyticsBot', expertise || 'Financial Analysis');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get or create conversation
    const conversation = existingConversationId 
      ? { id: existingConversationId }
      : await getOrCreateConversation(supabase, userId, personality.name);

    // Load conversation history for context
    const conversationHistory = await loadConversationHistory(supabase, conversation.id, 15);
    
    // Load user preferences for personalization
    const userPreferences = await loadUserPreferences(supabase, userId, personality.name);
    
    // Save user message
    await saveMessage(supabase, conversation.id, 'user', question);

    // Get relevant transactions based on the question
    const now = new Date();
    let startDate = subMonths(now, 3); // Default to last 3 months
    
    // Adjust date range based on question keywords
    if (question.toLowerCase().includes('this year')) {
      startDate = startOfYear(now);
    } else if (question.toLowerCase().includes('last year')) {
      startDate = startOfYear(new Date(now.getFullYear() - 1));
    }

    // Fetch transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    // Prepare transaction data for OpenAI
    const transactionData = transactions.map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      subcategory: t.subcategory
    }));

    // Create enhanced personality-specific system prompt
    const systemPrompt = buildEnhancedPersonalityPrompt(personality, userPreferences, conversationHistory);

    // Prepare messages for OpenAI with conversation context
    const openAIMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory.slice(-10), // Include last 10 messages for context
      {
        role: 'user',
        content: `Question: "${question}"

Transaction data (${transactions.length} transactions):
${JSON.stringify(transactionData, null, 2)}

Respond as ${personality.name} would - with your unique personality, style, and expertise!`
      }
    ];

    // Call OpenAI API with enhanced context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: openAIMessages,
        temperature: 0.7, // Increased for more personality
        max_tokens: userPreferences.learning_data.preferred_response_length === 'short' ? 150 : 300,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from OpenAI');
    }

    const aiResponse = await response.json();
    const aiResponseContent = aiResponse.choices[0].message.content;
    
    // Save AI response
    await saveMessage(supabase, conversation.id, 'assistant', aiResponseContent, {
      personality: personality.name,
      catchphrase: personality.catchphrase
    });
    
    // Update user preferences based on interaction
    await updateUserPreferences(supabase, userId, personality.name, {
      topic: extractTopic(question),
      responseLength: aiResponseContent.length
    });
    
    return new Response(
      JSON.stringify({ 
        answer: aiResponseContent,
        personality: personality.name,
        catchphrase: personality.catchphrase,
        conversationId: conversation.id,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});