import { createClient } from 'npm:@supabase/supabase-js@2.39.8';
import { format, subMonths, startOfYear } from 'npm:date-fns@3.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://xspensesai.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Credentials': 'true'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    const userId = req.headers.get('x-user-id');

    if (!question || !userId) {
      throw new Error('Question and user ID are required');
    }

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

    // Call OpenAI API
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
            content: `You are a helpful financial assistant analyzing transaction data. 
            Be concise and focus on numerical insights. Format currency as USD.
            Current date: ${format(now, 'yyyy-MM-dd')}`
          },
          {
            role: 'user',
            content: `Question: "${question}"

            Transaction data:
            ${JSON.stringify(transactionData, null, 2)}
            
            Provide a clear, concise answer focusing on the relevant financial information.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from OpenAI');
    }

    const aiResponse = await response.json();
    
    return new Response(
      JSON.stringify({ answer: aiResponse.choices[0].message.content }),
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