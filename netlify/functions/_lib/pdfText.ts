import type { Buffer } from "buffer";

async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text?: string }>> {
  const mod: any = await import("pdf-parse");
  const fn = mod?.default ?? mod;
  if (typeof fn !== "function") {
    throw new Error(`[pdf-parse] no callable export; keys=${JSON.stringify(Object.keys(mod || {}))}`);
  }
  return fn;
}

async function loadPdfJs(): Promise<any> {
  const mod: any = await import("pdfjs-dist/legacy/build/pdf.js");
  return mod?.default ?? mod;
}

export async function extractPdfTextWithPdfParse(pdfBuffer: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  const result = await pdfParse(pdfBuffer);
  return (result?.text || "").trim();
}

type TextItem = {
  str: string;
  transform: number[];
  width?: number;
};

export async function extractPdfTextWithLayout(pdfBuffer: Buffer): Promise<string> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
  });
  const doc = await loadingTask.promise;
  const lines: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = (textContent.items || []) as TextItem[];
    const lineBuckets = new Map<number, TextItem[]>();

    for (const item of items) {
      const y = item.transform?.[5] ?? 0;
      const bucket = Math.round(y * 2) / 2; // 0.5pt buckets
      const list = lineBuckets.get(bucket) || [];
      list.push(item);
      lineBuckets.set(bucket, list);
    }

    const sortedYs = Array.from(lineBuckets.keys()).sort((a, b) => b - a);
    lines.push(`Page ${pageNum}`);
    for (const y of sortedYs) {
      const row = lineBuckets.get(y) || [];
      row.sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
      let line = "";
      let lastEndX = 0;
      for (const item of row) {
        const x = item.transform?.[4] ?? 0;
        const width = item.width ?? 0;
        if (line && x - lastEndX > 3) {
          line += " ";
        }
        line += item.str;
        lastEndX = x + width;
      }
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  return lines.join("\n").trim();
}
