import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function parseReceiptWithAI(ocrText: string) {
  const prompt = `
You are an AI that extracts information from receipt text. Your job is to identify the MAIN transaction, not every line item.

Here's the OCR text:
"${ocrText}"

IMPORTANT RULES:
1. Look for the FINAL TOTAL amount (usually at the bottom)
2. Identify the STORE/VENDOR name (usually at the top)
3. Find the DATE of the transaction
4. Determine the MAIN CATEGORY based on the store type
5. IGNORE individual line items, tax amounts, subtotals, etc.
6. Focus on the OVERALL transaction

Return a JSON object like this:
{
  "title": "Store or Vendor Name",
  "amount": 21.99,
  "date": "2025-08-18",
  "category": "Food"
}

Only return valid JSON. If you can't find clear information, use "Unknown" for missing fields.
  `;

  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o",
  });

  const raw = response.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.error("Failed to parse AI result:", raw);
    return null;
  }
}
