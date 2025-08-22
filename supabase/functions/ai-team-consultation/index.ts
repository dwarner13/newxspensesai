import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

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

// Financial Data Access Functions
async function getUserFinancialData(supabase: any, userId: string, timeframe: string = '30d') {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    if (timeframe === '30d') {
      startDate.setDate(endDate.getDate() - 30);
    } else if (timeframe === '7d') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (timeframe === '90d') {
      startDate.setDate(endDate.getDate() - 90);
    }

    // Get transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    // Get budgets/goals (if table exists)
    let budgets = [];
    try {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);
      budgets = budgetData || [];
    } catch (error) {
      console.log('Budgets table not available, skipping budget data');
    }

    return {
      transactions: transactions || [],
      budgets: budgets,
      timeframe
    };
  } catch (error) {
    console.error('Error getting financial data:', error);
    return {
      transactions: [],
      budgets: [],
      timeframe
    };
  }
}

async function analyzeSpendingPatterns(transactions: any[]) {
  const analysis = {
    totalSpent: 0,
    topCategories: {},
    dailyAverage: 0,
    insights: []
  };

  if (!transactions || transactions.length === 0) {
    return analysis;
  }

  transactions.forEach(transaction => {
    if (transaction.amount < 0) { // Assuming negative amounts are expenses
      analysis.totalSpent += Math.abs(transaction.amount);
      
      // Category analysis
      const category = transaction.category || 'Uncategorized';
      analysis.topCategories[category] = (analysis.topCategories[category] || 0) + Math.abs(transaction.amount);
    }
  });

  // Calculate daily average
  const daysInPeriod = 30; // Default to 30 days
  analysis.dailyAverage = analysis.totalSpent / daysInPeriod;

  // Generate insights
  const sortedCategories = Object.entries(analysis.topCategories)
    .sort(([,a], [,b]) => (b as number) - (a as number));
  
  if (sortedCategories.length > 0) {
    analysis.insights.push(`Top spending category: ${sortedCategories[0][0]} at $${(sortedCategories[0][1] as number).toFixed(2)}`);
  }

  if (analysis.totalSpent > 0) {
    analysis.insights.push(`Daily average spending: $${analysis.dailyAverage.toFixed(2)}`);
  }

  return analysis;
}

// Get consultation from each AI personality
async function getPersonalityConsultation(personality: string, query: string, financialData: any, analysis: any) {
  const personalityData = AI_PERSONALITIES[personality.toLowerCase()] || AI_PERSONALITIES.analytics;
  
  const prompt = `You are ${personalityData.name}, ${personalityData.role}.

${personalityData.personality}

Your catchphrase: "${personalityData.catchphrase}"
Your voice style: ${personalityData.voiceStyle}
Your team role: ${personalityData.teamRole}
Your special skills: ${personalityData.specialSkills.join(', ')}

FINANCIAL CONTEXT:
- Total monthly spending: $${analysis.totalSpent.toFixed(2)}
- Top spending categories: ${Object.keys(analysis.topCategories).slice(0, 3).join(', ')}
- Key insights: ${analysis.insights.join(', ')}

USER QUESTION: "${query}"

As ${personalityData.name}, provide your specific perspective and advice on this financial question. Keep response to 2-3 sentences focusing on your expertise area. Use your unique personality and voice style.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get OpenAI response');
    }

    const aiResponse = await response.json();
    return aiResponse.choices[0].message.content;
  } catch (error) {
    console.error(`Error getting consultation from ${personality}:`, error);
    return `As ${personalityData.name}, I'm here to help with your financial question: "${query}". Let me provide some guidance based on your spending patterns.`;
  }
}

// Generate team summary
async function generateTeamSummary(consultations: any[], userQuery: string) {
  const consultationText = consultations
    .map(c => `${c.personality}: ${c.advice}`)
    .join('\n\n');

  const prompt = `Based on these AI financial advisor consultations, create a brief team summary that synthesizes the key recommendations:

${consultationText}

USER QUESTION: "${userQuery}"

Provide a 2-3 sentence summary that combines the team's collective wisdom into actionable next steps. Be encouraging and actionable.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 100,
        temperature: 0.6
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get OpenAI response');
    }

    const aiResponse = await response.json();
    return aiResponse.choices[0].message.content;
  } catch (error) {
    console.error('Error generating team summary:', error);
    return "Based on our team's diverse perspectives, we recommend taking a balanced approach to your financial question. Consider both the practical and emotional aspects of your situation.";
  }
}

// Get personality emoji
function getPersonalityEmoji(personality: string): string {
  const emojis = {
    'AnalyticsBot': '🧠',
    'SmartImportBot': '📋',
    'FinancialTherapistBot': '🌙',
    'GoalConciergeBot': '🎯',
    'MotivationBot': '⚡',
    'CreativityBot': '🌱'
  };
  return emojis[personality] || '🤖';
}

// Main handler
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userQuery, 
      userId, 
      primaryPersonality = 'AnalyticsBot',
      consultingPersonalities = ['MotivationBot', 'FinancialTherapistBot', 'GoalConciergeBot']
    } = await req.json();

    if (!userQuery || !userId) {
      throw new Error('User query and user ID are required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Load user's financial data
    const financialData = await getUserFinancialData(supabase, userId);
    const analysis = await analyzeSpendingPatterns(financialData.transactions);
    
    // Get consultation from each AI personality
    const allPersonalities = [primaryPersonality, ...consultingPersonalities];
    const consultations = [];
    
    for (const personality of allPersonalities) {
      const consultation = await getPersonalityConsultation(
        personality, 
        userQuery, 
        financialData,
        analysis
      );
      consultations.push({
        personality,
        advice: consultation,
        emoji: getPersonalityEmoji(personality)
      });
    }

    // Generate team summary
    const teamSummary = await generateTeamSummary(consultations, userQuery);

    return new Response(JSON.stringify({
      userQuery,
      consultations,
      teamSummary,
      financialContext: analysis.insights,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      status: 200
    });

  } catch (error) {
    console.error('Team Consultation Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Team consultation failed',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      }
    });
  }
}
