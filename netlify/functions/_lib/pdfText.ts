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

function spaceRatio(text: string): number {
  if (!text) return 0;
  const spaces = text.split("").filter((ch) => ch === " ").length;
  return spaces / Math.max(1, text.length);
}

function hasUsableEmbeddedText(text: string): boolean {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  const chars = normalized.length;
  const nonWhitespace = normalized.replace(/\s+/g, "");
  const alphaNumRatio = (nonWhitespace.match(/[A-Za-z0-9]/g) || []).length / Math.max(1, nonWhitespace.length);
  return chars >= 120 && alphaNumRatio >= 0.45;
}

function isWorkerResolutionError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || "").toLowerCase();
  return msg.includes("pdf.worker") || msg.includes("fake worker") || msg.includes("cannot find module");
}

function isStrictPdfStructureError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || "").toLowerCase();
  return msg.includes("invalid pdf structure") || msg.includes("bad fcheck");
}

export async function extractPdfTextWithPdfParse(pdfBuffer: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  const result = await pdfParse(pdfBuffer);
  return (result?.text || "").trim();
}

export async function extractEmbeddedPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    const text = await extractPdfTextWithPdfParse(pdfBuffer);
    const usable = hasUsableEmbeddedText(text);
    console.log(`[pdfText] path=pdf-parse usableText=${usable} chars=${text.length}`);
    return text;
  } catch (error: unknown) {
    if (isStrictPdfStructureError(error)) {
      console.warn("[pdfText] strict PDF structure error, forcing raster OCR handoff");
      return "";
    }
    throw error;
  }
}

type TextItem = {
  str: string;
  transform: number[];
  width?: number;
};

export async function extractPdfTextWithLayout(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      disableWorker: true,
      stopOnErrors: false,
      disableAutoFetch: true,
      disableStream: true,
      verbosity: 0,
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
  } catch (error: unknown) {
    if (isStrictPdfStructureError(error)) {
      console.warn("[pdfText] layout parser strict structure error, forcing image OCR handoff");
      return "";
    }
    throw error;
  }
}

export type PdfTextFirstResult = {
  text: string;
  pageCount: number;
  source: "pdf_parse" | "pdfjs_layout" | "none";
  parseError?: string;
  layoutError?: string;
};

export async function extractPdfTextFirst(pdfBuffer: Buffer): Promise<PdfTextFirstResult> {
  const result: PdfTextFirstResult = {
    text: "",
    pageCount: 0,
    source: "none",
  };

  try {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      disableWorker: true,
      stopOnErrors: false,
      disableAutoFetch: true,
      disableStream: true,
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    result.pageCount = Number(doc?.numPages || 0);
    try {
      if (typeof doc?.cleanup === "function") doc.cleanup();
      if (typeof doc?.destroy === "function") await doc.destroy();
    } catch {
      // no-op
    }
  } catch (error: any) {
    result.layoutError = error?.message || String(error);
  }

  let parsedText = "";
  let layoutText = "";
  try {
    parsedText = await extractEmbeddedPdfText(pdfBuffer);
  } catch (error: any) {
    result.parseError = error?.message || String(error);
  }

  const parsedUsable = hasUsableEmbeddedText(parsedText);
  if (parsedUsable) {
    console.log("[pdfText] skipping layout fallback because embedded text is usable");
    result.text = parsedText;
    result.source = "pdf_parse";
    return result;
  }

  console.log("[pdfText] embedded text unusable, trying layout fallback");
  try {
    layoutText = await extractPdfTextWithLayout(pdfBuffer);
  } catch (error: any) {
    const message = error?.message || String(error);
    result.layoutError = result.layoutError || message;
    if (isWorkerResolutionError(error)) {
      console.warn("[pdfText] layout fallback worker resolution error", { error: message });
    } else {
      console.warn("[pdfText] layout fallback failed", { error: message });
    }
  }

  const parsedLen = parsedText.trim().length;
  const layoutLen = layoutText.trim().length;
  const parsedRatio = spaceRatio(parsedText);
  const layoutRatio = spaceRatio(layoutText);
  const parsedLooksCramped = parsedRatio < 0.045 && parsedLen > 0;
  const layoutIsBetter = layoutLen > parsedLen || (parsedLooksCramped && layoutLen >= Math.max(120, parsedLen * 0.7));

  if (layoutLen > 0 && (parsedLen === 0 || layoutIsBetter || layoutRatio >= parsedRatio)) {
    result.text = layoutText;
    result.source = "pdfjs_layout";
    return result;
  }
  if (parsedLen > 0) {
    result.text = parsedText;
    result.source = "pdf_parse";
    return result;
  }
  return result;
}
