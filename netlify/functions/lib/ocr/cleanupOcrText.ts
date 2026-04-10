/**
 * Crowded BMO transaction-body keywords. These are the spaceless forms
 * pdf-parse produces from common BMO transaction descriptions. Two or
 * more hits in a chunk is a strong signal the text is from a BMO
 * statement body page.
 */
const BMO_BODY_KEYWORDS = [
  /DebitCardPurchase/i,
  /BillPayment/i,
  /INTERACe?-?Transfer/i,
  /Pre-?AuthorizedPayment/i,
  /DirectDeposit/i,
  /MobileCheque/i,
  /OpeningBalance/i,
  /ClosingBalance/i,
  /ClosingTotals/i,
  /OnlineBanking/i,
];

/**
 * Detect BMO Everyday Banking text that came out of pdf-parse with all
 * spaces stripped.
 *
 * Returns true if ANY of:
 *  1. Header markers: "Everyday Banking" / "Fortheperiodending" etc.
 *     (only present on page 1 of a multi-page statement).
 *  2. Body symptom: date abbreviation immediately glued to 1-2 digits
 *     (`Jan17`, `Feb03`). One hit is enough - this pattern is unique to
 *     pdf-parse output.
 *  3. 2+ crowded BMO transaction keywords (DebitCardPurchase,
 *     BillPayment, etc.).
 *  4. 3+ occurrences of an adjacent-amounts run (a small amount glued
 *     to a thousands-comma balance, e.g. "3.514,235.69").
 *
 * Either signal triggers the fix, so per-page invocations of
 * cleanupOcrText restore spaces on transaction body pages even when
 * the header marker is on a different page.
 */
function looksLikeCrowdedBmoEverydayBanking(text: string): boolean {
  // 1. Header phrase markers
  if (/Everyday\s*Banking|Forthe\s*period\s*ending|EverydayBanking|Fortheperiodending/i.test(text)) {
    return true;
  }
  // 2. Date abbreviation immediately followed by 1-2 digits
  if (/(?<![A-Za-z])(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{1,2}(?![A-Za-z0-9])/.test(text)) {
    return true;
  }
  // 3. 2+ crowded BMO transaction body keywords
  const keywordHits = BMO_BODY_KEYWORDS.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  if (keywordHits >= 2) return true;
  // 4. 3+ adjacent-amount runs (smaller amount glued to a balance)
  const adjacentAmounts = text.match(/\d+\.\d{2}\d{1,3},\d{3}\.\d{2}/g) || [];
  if (adjacentAmounts.length >= 3) return true;
  return false;
}

/**
 * Restore spaces in BMO Everyday Banking text that pdf-parse concatenated.
 *
 * pdf-parse strips inter-word whitespace, producing lines like:
 *   "Jan17DebitCardPurchase,7-ELEVENSTORE33535 3.514,235.69"
 * which the BMO parser cannot understand. This function inserts spaces:
 *   - before month abbreviations stuck to digits  ("Jan17" -> "Jan 17")
 *   - on lower-to-upper boundaries inside words   ("CardPurchase" -> "Card Purchase")
 *   - before "$" signs                            ("Total$1234" -> "Total $1234")
 *   - between two adjacent amounts                ("3.514,235.69" -> "3.51 4,235.69")
 *   - newlines before each transaction date       so the BMO date regex can match
 *
 * IMPORTANT: only applied when the text is clearly a BMO Everyday Banking
 * statement. Other statement formats are left untouched.
 */
function restoreBmoSpaces(text: string): string {
  let out = text;

  // 1) Insert a newline + space before "MonAbbr<digit>" so each transaction
  //    starts on its own line, then split month from day digits.
  out = out.replace(
    /(?<![A-Za-z])(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{1,2})\b/g,
    '\n$1 $2'
  );

  // 2) Insert spaces on lower-to-upper word boundaries that pdf-parse glued
  //    together: "CardPurchase" -> "Card Purchase", "DebitCard" -> "Debit Card".
  //    Skip all-caps runs (acronyms / merchant codes like "BMO", "POPEYES").
  out = out.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 3) Insert a space before "$" signs glued to other text.
  out = out.replace(/([A-Za-z0-9])\$/g, '$1 $');

  // 4) Split two adjacent amounts that pdf-parse ran together.
  //    Pattern: a small amount (no thousands comma, 1-3 digits . 2 digits)
  //    immediately followed by a balance (1+ digit, comma, 3 digits . 2 digits).
  //    Example: "3.514,235.69" -> "3.51 4,235.69"
  out = out.replace(
    /(\d{1,3}\.\d{2})(\d{1,3},\d{3}\.\d{2})/g,
    '$1 $2'
  );
  //    And the same for the case where the amount itself has a thousands comma
  //    (e.g. "1,818.194,406.69" -> "1,818.19 4,406.69").
  out = out.replace(
    /(\d{1,3}(?:,\d{3})+\.\d{2})(\d{1,3}(?:,\d{3})+\.\d{2})/g,
    '$1 $2'
  );

  // 5) Insert a space between a letter and a digit when no separator exists,
  //    e.g. "STORE33535" -> "STORE 33535", but only when the digit run is 4+
  //    chars to avoid touching "7-ELEVEN" style merchant codes.
  out = out.replace(/([A-Za-z])(\d{4,})/g, '$1 $2');

  // Collapse runs of internal whitespace introduced above (but keep newlines).
  out = out.replace(/[ \t]{2,}/g, ' ');

  return out;
}

export function cleanupOcrText(input: unknown): string {
  let text = String(input || '');

  // BMO statements that came out of pdf-parse without spaces need
  // word/number boundary restoration BEFORE the rest of the cleanup runs,
  // otherwise downstream regexes (date heads, amount columns) will not match.
  if (looksLikeCrowdedBmoEverydayBanking(text)) {
    text = restoreBmoSpaces(text);
  }

  // Remove invalid unicode/control chars and normalize noisy OCR spacing.
  return text
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Re-insert thousand-separator commas stripped by embedded_pdf_parse.
    // e.g. "4166.65" -> "4,166.65", "12181.33" -> "12,181.33"
    // Fixes amount parsing for ALL statement types downstream.
    .replace(/\b(\d{4,7})\.(\d{2})\b/g, (_, int, dec) =>
      Number(int).toLocaleString('en-CA') + '.' + dec
    )
    .trim();
}
