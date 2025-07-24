import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://xspensesai.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Credentials': 'true'
};

interface CategoryResponse {
  category: string;
  subcategory: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    const userId = req.headers.get('x-user-id');

    if (!description) {
      throw new Error('Description is required');
    }

    // First check if we have a memory match
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to find a matching rule
    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('keyword, category, subcategory')
      .eq('user_id', userId);

    if (rules && rules.length > 0) {
      const normalizedDesc = description.toLowerCase();
      for (const rule of rules) {
        if (normalizedDesc.includes(rule.keyword.toLowerCase())) {
          // Update match count
          await supabase
            .from('categorization_rules')
            .update({ 
              match_count: supabase.rpc('increment', { row_id: rule.id, increment_amount: 1 }),
              last_matched: new Date().toISOString()
            })
            .eq('keyword', rule.keyword)
            .eq('user_id', userId);

          return new Response(
            JSON.stringify({
              category: rule.category,
              subcategory: rule.subcategory
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        }
      }
    }

    // No memory match, use OpenAI
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
            content: 'You are a financial transaction categorizer. Categorize transactions into appropriate categories and subcategories. Respond only with JSON in the format: {"category": "string", "subcategory": "string" or null}. Use standard categories like: Food, Travel, Utilities, Shopping, Entertainment, Healthcare, Transportation, Housing, Income, Other.',
          },
          {
            role: 'user',
            content: `Categorize this transaction: "${description}"`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get category from OpenAI');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content) as CategoryResponse;

    // Store the categorization in memory table
    const keyword = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 2)
      .join(' ');

    await supabase
      .from('categorization_rules')
      .upsert({
        user_id: userId,
        keyword,
        category: result.category,
        subcategory: result.subcategory,
        match_count: 1,
        last_matched: new Date().toISOString()
      })
      .select();

    return new Response(
      JSON.stringify(result),
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