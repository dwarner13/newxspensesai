// Note: OpenAI calls are now handled via Netlify functions

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

  try {
    // Use Netlify function for OpenAI calls
    const response = await fetch('/.netlify/functions/ocr-ingest-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ocrText: ocrText
      })
    });

    if (!response.ok) {
      throw new Error(`OCR function failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error parsing receipt with AI:", error);
    
    // Fallback: try to extract basic info manually
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return {
      title: lines[0] || "Unknown Store",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: "other"
    };
  }
}
