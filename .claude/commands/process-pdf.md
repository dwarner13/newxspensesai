Process a bank statement PDF for XspensesAI: $ARGUMENTS

## Step 1 — Detect PDF Type
- Read the file at the path in $ARGUMENTS
- Convert to base64
- Check if it is a text-based PDF or a scanned image PDF
  - If text-based: extract text directly from PDF
  - If scanned or low-quality: route to Claude Vision fallback

## Step 2 — Primary Extraction (Google Vision)
- Send to existing Google Vision OCR pipeline in /netlify/functions/
- Capture confidence score from response
- If confidence score is above 85%: proceed to Step 4
- If confidence score is below 85%: proceed to Step 3

## Step 3 — Fallback Extraction (Claude Vision)
Send the base64 PDF directly to Claude API:

model: claude-sonnet-4-20250514
Include the PDF as a document block with media_type application/pdf
Use this exact extraction prompt:

"You are reading a bank statement. Extract every transaction.
Return ONLY valid JSON with no extra text, no markdown, no backticks.
Format:
{
  period: { start: YYYY-MM-DD, end: YYYY-MM-DD },
  accountSummary: { openingBalance: number, closingBalance: number },
  transactions: [
    {
      date: YYYY-MM-DD,
      merchant: string (clean readable name, no terminal IDs or location codes),
      amount: number (negative for debits, positive for credits),
      type: debit | credit,
      category: string (best guess from: Food, Transport, Shopping,
                 Entertainment, Health, Utilities, Income, Transfer, Other)
    }
  ]
}
If any field is unclear, use null. Never guess amounts or dates."

## Step 4 — Validate & Clean
- Confirm all dates are in YYYY-MM-DD format — fix any that are not
- Confirm no merchant name contains raw terminal IDs (patterns like *XXXXX or #XXXXX)
- Confirm no amount is null — flag those rows for manual review
- Confirm category is never empty — default to "Other" if missing
- Separate debits from credits and verify they balance against accountSummary

## Step 5 — Insert to Supabase Staging
- Insert all validated transactions into the staging table
- Set status = 'pending_review' on every row
- Set source = 'google_vision' or 'claude_vision' based on which path was used
- Create one import_summaries record with:
  - raw_ocr_text = the full extracted text
  - confidence_score = score from Step 2
  - file_name = original PDF filename
  - status = 'pending_review'
- Do NOT insert into the main transactions table yet
- Validate RLS policy is passing before insert — log error if blocked

## Step 6 — Trigger Byte
- Call Byte's announcement function with the new import_summary ID
- Byte posts the extraction results to the Prime chat thread
- Include in Byte's message:
  - Number of transactions found
  - Date range of statement
  - Which OCR provider was used (Google Vision or Claude Vision fallback)
  - Count of any flagged rows needing manual review

## Rules — Never Break These
- Never overwrite already committed transactions
- Never commit staging rows to main transactions without user confirmation
- Always log which OCR path was taken (primary or fallback)
- If Claude Vision also fails, set status = 'extraction_failed' and notify Prime
- Never expose raw base64 data in logs
