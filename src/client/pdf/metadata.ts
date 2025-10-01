// src/client/pdf/metadata.ts
// Dynamic import to handle pdf-lib loading gracefully
let PDFDocument: any = null;

async function loadPdfLib() {
  if (!PDFDocument) {
    try {
      const pdfLib = await import('pdf-lib');
      PDFDocument = pdfLib.PDFDocument;
    } catch (error) {
      console.warn('pdf-lib not available for metadata extraction:', error);
      return false;
    }
  }
  return true;
}

export async function getPdfMetadata(arrayBuffer: ArrayBuffer) {
  const isAvailable = await loadPdfLib();
  
  if (!isAvailable || !PDFDocument) {
    // Return basic metadata without pdf-lib
    return {
      title: undefined,
      author: undefined,
      subject: undefined,
      keywords: undefined,
      pages: 0
    };
  }
  
  try {
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true});
    const title = doc.getTitle() || undefined;
    const author = doc.getAuthor() || undefined;
    const subject = doc.getSubject() || undefined;
    const keywords = doc.getKeywords() || undefined;
    const pages = doc.getPageCount();
    return { title, author, subject, keywords, pages };
  } catch (error) {
    console.warn('Failed to extract PDF metadata:', error);
    return {
      title: undefined,
      author: undefined,
      subject: undefined,
      keywords: undefined,
      pages: 0
    };
  }
}
