import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
};

interface ReceiptData {
  vendor?: string;
  date?: string;
  total?: number;
  items?: Array<{
    description: string;
    amount: number;
  }>;
  category?: string;
  confidence?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId } = await req.json();

    if (!imageUrl || !userId) {
      throw new Error('Image URL and user ID are required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // For now, we'll simulate OCR + AI processing
    // In production, you would:
    // 1. Download the image from imageUrl
    // 2. Use OCR service (Google Vision, AWS Textract, etc.)
    // 3. Process with OpenAI Vision API
    // 4. Extract structured data

    const mockReceiptData: ReceiptData = {
      vendor: 'Target Store #1234',
      date: new Date().toISOString().split('T')[0],
      total: 67.89,
      items: [
        { description: 'Household Items', amount: 23.45 },
        { description: 'Groceries', amount: 34.56 },
        { description: 'Personal Care', amount: 9.88 }
      ],
      category: 'Shopping',
      confidence: 0.89
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update receipt record with extracted data
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        processing_status: 'completed',
        extracted_data: mockReceiptData
      })
      .eq('image_url', imageUrl)
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mockReceiptData 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Receipt processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
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