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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, botName, expertise } = await req.json();
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

    // Create personality-specific system prompt
    const systemPrompt = `You are ${personality.name}, ${personality.role}.

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
- Focus on financial insights while maintaining your character
- Current date: ${format(now, 'yyyy-MM-dd')}

Remember: You're not just a financial assistant - you're ${personality.name} with a unique personality and approach!`;

    // Call OpenAI API with personality-specific prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Question: "${question}"

Transaction data (${transactions.length} transactions):
${JSON.stringify(transactionData, null, 2)}

Respond as ${personality.name} would - with your unique personality, style, and expertise!`
          }
        ],
        temperature: 0.7, // Increased for more personality
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from OpenAI');
    }

    const aiResponse = await response.json();
    
    return new Response(
      JSON.stringify({ 
        answer: aiResponse.choices[0].message.content,
        personality: personality.name,
        catchphrase: personality.catchphrase
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
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