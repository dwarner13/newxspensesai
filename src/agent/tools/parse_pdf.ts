import { z } from "zod";
import { extractPdfTextSafe } from "../../client/pdf/extractText"; // shared logic (pure JS)

export const id = "parse_pdf";
export const inputSchema = z.object({
  // either direct base64 OR a signed download URL you generate; choose one path for your app
  base64: z.string().optional(),
  // future: storagePath?: string
  maxPages: z.number().int().min(1).max(20).optional(),
});
export const outputSchema = z.object({
  pages: z.number(),
  hasTextLayer: z.boolean(),
  textSample: z.string(),
});

export async function run(input: z.infer<typeof inputSchema>, ctx: { userId: string; conversationId?: string }) {
  const started = Date.now();
  try {
    if (!input.base64) {
      return { pages: 0, hasTextLayer: false, textSample: "No content provided (base64 missing)." };
    }
    
    // Convert base64 to ArrayBuffer
    const arrayBuffer = Uint8Array.from(atob(input.base64), c => c.charCodeAt(0)).buffer;
    const res = await extractPdfTextSafe(arrayBuffer, { maxPages: input.maxPages ?? 5});
    
    // Log audit (simplified version for now)
    console.log(`PDF parsing completed for user ${ctx.userId} in ${Date.now() - started}ms`);
    
    return { 
      pages: res.pages, 
      hasTextLayer: res.hasTextLayer, 
      textSample: res.textSample 
    };
  } catch (e: any) {
    console.error(`PDF parsing failed for user ${ctx.userId}:`, e.message);
    return { 
      pages: 0, 
      hasTextLayer: false, 
      textSample: `Error: ${e.message}` 
    };
  }
}
