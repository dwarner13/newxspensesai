import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    const body = event.body && JSON.parse(event.body);
    
    if (!body?.userId || !body?.message) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "userId and message required" }) 
      };
    }

    // Mock response for testing
    const responses = {
      prime: "👑 Prime here! I'm your AI financial boss. How can I help you organize your finances today?",
      byte: "📄 Byte reporting for duty! I specialize in document processing and receipt scanning. What documents do you need help with?",
      tag: "🏷️ Tag here! I'm your categorization expert. Let me help you organize your expenses into proper categories.",
      crystal: "🔮 Crystal at your service! I analyze trends and make predictions. What insights do you need about your spending?",
      ledger: "📊 Ledger here! I can help with tax-related questions and financial planning. What tax guidance do you need?"
    };

    // Simple keyword-based routing
    const message = body.message.toLowerCase();
    let employee = 'prime';
    
    if (message.includes('receipt') || message.includes('document') || message.includes('upload')) {
      employee = 'byte';
    } else if (message.includes('categor') || message.includes('tag') || message.includes('expense')) {
      employee = 'tag';
    } else if (message.includes('trend') || message.includes('predict') || message.includes('insight')) {
      employee = 'crystal';
    } else if (message.includes('tax') || message.includes('deduction') || message.includes('planning')) {
      employee = 'ledger';
    }

    const text = responses[employee as keyof typeof responses];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ text, employee })
    };
  } catch (err: any) {
    console.error(err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};
