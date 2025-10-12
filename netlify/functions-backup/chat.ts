import type { Handler } from "@netlify/functions";

// Check if we have the required API keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Initialize clients only if we have the keys
let openai: any = null;
let supabase: any = null;

if (OPENAI_API_KEY && SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    const OpenAI = require("openai");
    const { createClient } = require("@supabase/supabase-js");
    
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.log("Failed to initialize AI clients:", error);
  }
}

const EMPLOYEE_SYSTEMS: Record<string, string> = {
  prime:   "You are Prime, the AI boss. Route tasks, decide intent, and answer clearly. Be concise and pragmatic.",
  byte:    "You are Byte, the document & receipt expert. Help with imports, OCR, parsing, and extraction.",
  tag:     "You are Tag, the categorization expert. Map transactions to categories and ask clarifying questions if needed.",
  crystal: "You are Crystal, the predictions/insights AI. Explain trends and forecasts simply with short steps.",
  ledger:  "You are Ledger, the tax helper. Provide general tax guidance only—not legal or financial advice."
};

function pickEmployeeFromText(text: string): string {
  const t = (text || "").toLowerCase();
  if (/(receipt|invoice|upload|ocr|import)/.test(t)) return "byte";
  if (/(category|categorize|tag|expense type)/.test(t)) return "tag";
  if (/(predict|trend|forecast|insight)/.test(t)) return "crystal";
  if (/(tax|deduction|cra|irs|gst|vat)/.test(t)) return "ledger";
  return "prime";
}

type ChatReq = {
  userId: string;            // UUID from auth
  message: string;
  employee?: string;         // optional explicit employee_key
  mock?: boolean;            // if true, returns mock text
};

export const handler: Handler = async (event) => {
  try {
    const body = (event.body && JSON.parse(event.body)) as ChatReq | null;

    if (!body?.userId || !body?.message) {
      return { 
        statusCode: 400, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ error: "userId and message required" }) 
      };
    }

    const employee = body.employee || pickEmployeeFromText(body.message);

    // If AI clients aren't available, use mock responses
    if (!openai || !supabase) {
      const mockResponses = {
        prime: "👑 Prime here! I'm your AI financial boss. How can I help you organize your finances today?",
        byte: "📄 Byte reporting for duty! I specialize in document processing and receipt scanning. What documents do you need help with?",
        tag: "🏷️ Tag here! I'm your categorization expert. Let me help you organize your expenses into proper categories.",
        crystal: "🔮 Crystal at your service! I analyze trends and make predictions. What insights do you need about your spending?",
        ledger: "📊 Ledger here! I can help with tax-related questions and financial planning. What tax guidance do you need?"
      };

      const text = mockResponses[employee as keyof typeof mockResponses] || mockResponses.prime;

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ text, employee })
      };
    }

    // Use real AI if available
    const system = EMPLOYEE_SYSTEMS[employee] || EMPLOYEE_SYSTEMS["prime"];

    // Real LLM call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "system", content: system }, { role: "user", content: body.message }]
    });

    const reply = completion.choices[0].message.content || "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ text: reply, employee })
    };
  } catch (err: any) {
    console.error(err);
    return { 
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: err.message }) 
    };
  }
};
