// src/client/pdf/metadata.ts
import { PDFDocument } from "pdf-lib";

export async function getPdfMetadata(arrayBuffer: ArrayBuffer) {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const title = doc.getTitle() || undefined;
  const author = doc.getAuthor() || undefined;
  const subject = doc.getSubject() || undefined;
  const keywords = doc.getKeywords() || undefined;
  const pages = doc.getPageCount();
  return { title, author, subject, keywords, pages };
}
