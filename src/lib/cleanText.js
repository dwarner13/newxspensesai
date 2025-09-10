/**
 * OCR Text Cleaning Utilities
 * 
 * Cleans raw OCR text by removing headers, footers, page numbers, and other noise
 */

/**
 * Clean OCR text by removing common noise patterns
 * @param {string} rawText - Raw OCR text
 * @returns {string} - Cleaned text
 */
function cleanOcrText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let cleaned = rawText;

  // Remove page numbers and headers
  cleaned = cleaned.replace(/^Page \d+ of \d+$/gim, '');
  cleaned = cleaned.replace(/^Page \d+$/gim, '');
  cleaned = cleaned.replace(/^\d+$/gm, ''); // Standalone page numbers

  // Remove account/statement headers
  cleaned = cleaned.replace(/^Account.*:\s*\S+$/gim, '');
  cleaned = cleaned.replace(/^Statement.*$/gim, '');
  cleaned = cleaned.replace(/^Balance.*$/gim, '');
  cleaned = cleaned.replace(/^Account Number.*$/gim, '');
  cleaned = cleaned.replace(/^Statement Date.*$/gim, '');
  cleaned = cleaned.replace(/^Due Date.*$/gim, '');

  // Remove common bank statement headers
  cleaned = cleaned.replace(/^Transaction Date.*$/gim, '');
  cleaned = cleaned.replace(/^Description.*$/gim, '');
  cleaned = cleaned.replace(/^Amount.*$/gim, '');
  cleaned = cleaned.replace(/^Balance.*$/gim, '');
  cleaned = cleaned.replace(/^Date.*Description.*Amount.*$/gim, '');

  // Remove running balance columns (common pattern: number at end of line)
  cleaned = cleaned.replace(/\s+\d+\.\d{2}\s*$/gm, '');

  // Remove empty lines and excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple empty lines to double
  cleaned = cleaned.replace(/^\s+$/gm, ''); // Empty lines with just whitespace

  // Normalize Unicode and keep only printable characters
  cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, ' '); // Keep printable ASCII + newlines/tabs
  cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single space
  cleaned = cleaned.replace(/\n\s+/g, '\n'); // Remove leading spaces from lines
  cleaned = cleaned.replace(/\s+\n/g, '\n'); // Remove trailing spaces from lines

  // Remove lines that are just numbers or symbols
  cleaned = cleaned.replace(/^[\d\s\-\.\+\$]+$/gm, '');
  cleaned = cleaned.replace(/^[^\w\s]*$/gm, ''); // Lines with no alphanumeric characters

  // Clean up common OCR artifacts
  cleaned = cleaned.replace(/\|\s*/g, ' '); // Replace pipe characters with spaces
  cleaned = cleaned.replace(/\s*\|/g, ' '); // Replace trailing pipes
  cleaned = cleaned.replace(/\s*_\s*/g, ' '); // Replace underscores with spaces
  cleaned = cleaned.replace(/\s*-\s*/g, ' '); // Replace standalone dashes

  // Final cleanup
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines

  console.log(`🧹 Text cleaning: ${rawText.length} → ${cleaned.length} characters`);
  
  return cleaned;
}

module.exports = {
  cleanOcrText
};
