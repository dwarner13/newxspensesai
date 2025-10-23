// netlify/functions/_shared/storage.ts
import { createClient } from "@supabase/supabase-js";

const BUCKET_IMPORTS = process.env.IMPORTS_BUCKET || "imports";

export async function downloadFileBytes(fileKey: string): Promise<ArrayBuffer> {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.storage.from(BUCKET_IMPORTS).download(fileKey);
  if (error) throw new Error(`download error: ${error.message}`);
  return data.arrayBuffer();
}





