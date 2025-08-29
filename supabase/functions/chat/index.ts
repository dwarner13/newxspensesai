import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-openai-key',
  'Access-Control-Allow-Credentials': 'true'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, botName, expertise, conversationId, includeFinancialData, userId: requestUserId } = await req.json();
    const userId = req.headers.get('x-user-id') || requestUserId;
    const openaiKey = req.headers.get('x-openai-key');

    if (!question || !userId) {
      throw new Error('Question and user ID are required');
    }

    if (!openaiKey) {
      throw new Error('OpenAI API key not provided in headers');
    }

    // Test OpenAI API connection with the provided key
    try {
      console.log('🔑 OpenAI Key provided in headers, length:', openaiKey.length);
      console.log('👤 User ID:', userId);
      console.log('🚀 Attempting OpenAI API call...');
      
      // Create intelligent prompt for OpenAI with user context
      const systemPrompt = `You are ${botName}, a friendly and conversational AI financial assistant for the Xspenses AI app. You're having a real conversation with a specific user.

USER CONTEXT:
- User ID: ${userId}
- This is a real person using your app
- You should remember them and be personal
- Reference them naturally in conversation

APP CONTEXT - Your app has these SMART FEATURES:
- **AI Categorization**: Automatically categorizes transactions and spending patterns using machine learning
- **Smart Import**: Upload bank statements, receipts, and financial documents for instant AI analysis
- **Financial Dashboard**: Real-time spending tracking, savings goals, and financial health metrics
- **Receipt Scanning**: Use camera to scan receipts for automatic expense tracking and categorization
- **Transaction Analysis**: AI-powered insights from your financial data with spending pattern recognition
- **Budget Planning**: Smart budget creation based on your actual spending habits and AI recommendations
- **Personal Podcasts**: AI-curated financial podcasts and learning content personalized to your goals
- **Background Music**: Curated financial and productivity music playlists while you work in the app
- **Smart Notifications**: AI-powered alerts for unusual spending, budget limits, and financial opportunities
- **Goal Tracking**: Visual progress tracking for savings, debt payoff, and investment goals
- **Financial Education**: Interactive learning modules and AI-powered financial advice

YOUR PERSONALITY:
- Be conversational and friendly, like talking to a smart friend
- Keep responses SHORT (2-3 sentences max)
- Ask follow-up questions to understand their situation better
- Give specific app guidance, not generic advice
- Be encouraging and supportive
- Use their name or refer to them personally when possible
- Show excitement about your app's smart features

CONVERSATION STYLE:
- Start with a brief, helpful answer
- Then ask a relevant question to learn more
- Reference specific app features naturally
- Keep it engaging and interactive
- Make it feel like you know them
- Mention relevant smart features when helpful

Remember: You're having a personal conversation with ${userId}. Be brief, helpful, and showcase your app's amazing AI capabilities!`;

      const userPrompt = `User Question: "${question}"

Respond conversationally as ${botName}. Give a brief, helpful answer about using the Xspenses AI app, then ask a follow-up question to learn more about their specific situation. Make it personal and engaging, and mention relevant smart features when helpful!`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
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
              content: userPrompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      console.log('📡 OpenAI Response Status:', openaiResponse.status);

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('❌ OpenAI API Error:', errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      }

      const openaiData = await openaiResponse.json();
      const aiResponse = openaiData.choices[0].message.content;
      
      console.log('✅ OpenAI API Success! Response length:', aiResponse.length);

      return new Response(
        JSON.stringify({ 
          answer: aiResponse,
          personality: botName || 'AI Financial Assistant',
          catchphrase: 'Let\'s make your finances work smarter! 💰✨',
          conversationId: 'conv-' + Date.now(),
          financialInsights: ['AI is working!', 'Real financial advice provided'],
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );

    } catch (openaiError) {
      console.error('❌ OpenAI Error Details:', openaiError.message);
      
      return new Response(
        JSON.stringify({ 
          answer: `Hello! I'm ${botName || 'AI Financial Assistant'}. I'm experiencing technical difficulties with my AI brain right now. 

Error details: ${openaiError.message}

You asked: "${question}"

For now, I'd recommend focusing on basic budgeting principles while I get my AI capabilities back online!`,
          personality: botName || 'AI Financial Assistant',
          catchphrase: 'Working on getting smarter! 🧠',
          conversationId: 'conv-' + Date.now(),
          financialInsights: ['AI temporarily offline', 'Error: ' + openaiError.message],
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

  } catch (error) {
    console.error('❌ Chat Function Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.'
      }),
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