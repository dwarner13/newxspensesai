/**
 * OCR.space API Integration
 * 
 * Handles OCR processing using OCR.space API for PDFs and images
 */

const fetch = require('node-fetch');

/**
 * Process a file through OCR.space API
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{text: string, pages: Array<{page: number, text: string}>}>}
 */
async function ocrFile(buffer, filename) {
  try {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    
    if (!apiKey) {
      throw new Error('OCR_SPACE_API_KEY environment variable is not set');
    }

    // Determine if it's a PDF or image
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    const endpoint = isPdf 
      ? 'https://api.ocr.space/parse/image'
      : 'https://api.ocr.space/parse/image';

    // Prepare form data
    const formData = new FormData();
    formData.append('file', buffer, filename);
    formData.append('apikey', apiKey);
    formData.append('language', 'eng'); // Auto-detect language
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
    formData.append('scale', 'true');
    formData.append('isTable', 'true'); // Enable table detection
    formData.append('detectOrientation', 'true');
    formData.append('filetype', isPdf ? 'pdf' : 'image');

    console.log(`🔍 Sending ${isPdf ? 'PDF' : 'image'} to OCR.space...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'XspensesAI/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR.space API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.IsErroredOnProcessing) {
      // Process successful OCR results
      const pages = [];
      let fullText = '';

      if (result.ParsedResults && result.ParsedResults.length > 0) {
        result.ParsedResults.forEach((page, index) => {
          if (page.ParsedText) {
            const pageText = page.ParsedText.trim();
            pages.push({
              page: index + 1,
              text: pageText});
            fullText += pageText + '\n\n';
          }
        });
      }

      console.log(`✅ OCR completed: ${pages.length} page(s), ${fullText.length} characters`);
      
      return {
        text: fullText.trim(),
        pages: pages
      };
    } else {
      throw new Error(`OCR processing failed: ${result.ErrorMessage || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ OCR.space error:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

module.exports = {
  ocrFile
};
