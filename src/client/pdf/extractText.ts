// src/client/pdf/extractText.ts
import { getDocument } from "./pdfjs";

export async function extractPdfTextFromFile(file: File, maxPages = 5) {
  // read once
  const ab = await file.arrayBuffer();
  
  // IMPORTANT: create separate copies for different uses
  const forPdfjs = new Uint8Array(ab.slice(0)); // for PDF processing
  const forUpload = new Uint8Array(ab.slice(0)); // separate copy for upload if needed

  let pdf;
  try {
    pdf = await getDocument({ data: forPdfjs }).promise;
  } catch {
    // workerless fallback for dev
    pdf = await getDocument({ data: forPdfjs, disableWorker: true }).promise;
  }

  const pages = pdf.numPages;
  const take = Math.min(pages, maxPages);
  const textByPage: string[] = [];
  let itemsCount = 0;

  for (let i = 1; i <= take; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    itemsCount += content.items.length;
    const pageText = content.items.map((it: any) => it.str ?? "").join(" ");
    textByPage.push(pageText.replace(/\s+/g, " ").trim());
  }

  return {
    pages,
    hasTextLayer: itemsCount > 25,
    textSample: textByPage.join("\n\n").slice(0, 4000),
    textByPage,
    // Include upload data if needed for further processing
    uploadData: forUpload,
  };
}
