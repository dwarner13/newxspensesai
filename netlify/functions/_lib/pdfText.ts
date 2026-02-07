import type { Buffer } from "buffer";

async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text?: string }>> {
  const mod: any = await import("pdf-parse");
  const fn = mod?.default ?? mod;
  if (typeof fn !== "function") {
    throw new Error(`[pdf-parse] no callable export; keys=${JSON.stringify(Object.keys(mod || {}))}`);
  }
  return fn;
}

export async function extractPdfTextWithPdfParse(pdfBuffer: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  const result = await pdfParse(pdfBuffer);
  return (result?.text || "").trim();
}
