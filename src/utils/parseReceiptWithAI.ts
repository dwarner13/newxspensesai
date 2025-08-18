import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function parseReceiptWithAI(ocrText: string) {
  const prompt = `
You are an AI that extracts information from receipt text. 

Here's the OCR text:
"${ocrText}"

Return a JSON object like this:
{
  "title": "Store or Item Name",
  "amount": 21.99,
  "date": "2025-08-18",
  "category": "Food"
}
Only return valid JSON.
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
