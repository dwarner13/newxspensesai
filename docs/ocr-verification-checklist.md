# OCR Verification Checklist

Short, practical validation plan for OCR/PDF import flow.

## 1) Test files (2 samples)

- **Sample A (text-based PDF):** bank/card statement with selectable text.
- **Sample B (scanned PDF):** image-only statement/receipt (no selectable text).

## 2) Pre-checks

- Start app: `npx netlify dev`
- Confirm upload path works in UI (Prime/Smart Import page).
- Use a test account (non-production data).

## 3) Run test flow (for each sample)

- Upload PDF through normal UI flow.
- Wait for Prime/Byte/Tag narration sequence:
  - Prime handoff
  - Byte parse complete
  - Tag categorization complete
  - Prime final summary
- Open debug panel only if needed (see debug flags below).

## 4) Expected summary output format

Final OCR summary must include these exact headings:

- `## Summary`
- `## Key details`
- `## Transactions (cleaned)`
- `## Issues / Uncertain lines`

Example transaction bullet format:

- `- 2026-01-12 | Grocery Store | -45.90 | CAD | category=Groceries`
- `- UNKNOWN-DATE | UNKNOWN-MERCHANT | 12.99 | CAD | low-confidence`

## 5) Debug flags (dev only)

- Enable OCR debug UI:
  - `VITE_OCR_DEBUG=1`
- Optionally include cleaned OCR text in backend responses (dev-only gate):
  - `OCR_DEBUG_INCLUDE_CLEANED_TEXT=1`

Recommended local run (example):

- `VITE_OCR_DEBUG=1 OCR_DEBUG_INCLUDE_CLEANED_TEXT=1 npx netlify dev`

## 6) What must NEVER appear in logs

- Full raw OCR document text dumps.
- Secrets/tokens/API keys.
- Full PII-rich transaction lists (merchant+amount+date for entire doc).
- Unredacted account identifiers beyond allowed partial display.

## 7) Pass/fail criteria

- **PASS:** both PDFs produce structured summary headings and no raw OCR leakage by default.
- **PASS:** scanned PDF still yields summary with unknown placeholders when fields are missing.
- **FAIL:** missing required headings, guessed values, or sensitive raw text in logs.

## 8) Rollback steps

- Revert only OCR-summary related files (adjust as needed):
  - `git restore "netlify/functions/prime-summary.ts" "netlify/functions/smart-import-ocr.ts" "netlify/functions/byte-ocr-parse.ts" "netlify/functions/lib/ocr/cleanupOcrText.ts" "src/components/smart-import/SmartImportUploadStatusPanel.tsx" "src/hooks/useSmartImport.ts" "src/components/chat/UnifiedAssistantChat.tsx" "src/components/chat/upload/progressStageTruth.ts"`

