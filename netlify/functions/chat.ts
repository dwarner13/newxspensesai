import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ---- ENV
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

// ---- DB
function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// ---- Guardrails (use your production guardrails)
import { runGuardrails } from "./_shared/guardrails-production";
import { makeGuardrailLogger } from "./_shared/guardrail-log";

// ---- Memory helpers (assume you have these utils; adjust paths if needed)
import { fetchUserFacts, recallSimilarMemory, saveChatMessage, saveConvoSummary } from "./_shared/memory";
import { summarizeRolling } from "./_shared/summary";

// ---- Routing (KEEP your logic; here's a light wrapper that defers to existing)
import { routeToEmployee } from "./_shared/router"; // uses your Jaccard/regex thresholds

// ---- Utilities
function json(status: number, body: any) { return { statusCode: status, body: JSON.stringify(body) }; }
function bad(status: number, msg: string) { return { statusCode: status, body: msg }; }

export const handler: Handler = async (event) => {
  try {
    // Version flag check - prevents accidental use of wrong backend version
    if (process.env.CHAT_BACKEND_VERSION !== 'v2') {
      return bad(503, 'Chat backend v2 is disabled in this environment');
    }
    
    if (event.httpMethod !== "POST") return bad(405, "Method Not Allowed");

    const { userId, messages } = JSON.parse(event.body || "{}");
    if (!userId || !Array.isArray(messages) || messages.length === 0) {
      return bad(400, "Missing userId or messages");
    }

    const sb = admin();
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const log = makeGuardrailLogger();

    // 1) Guardrails on latest user message
    const latest = messages[messages.length - 1];
    const guardrailConfig = {
      preset: 'strict' as const,
      jailbreakThreshold: 70,
      moderationBlock: true,
      piiEntities: [],
      ingestion: { pii: true, moderation: true },
      chat: { pii: true, moderation: true, jailbreak: true }
    };
    
    const gr = await runGuardrails(latest.content, userId, 'chat', guardrailConfig);

    if (!gr.ok) {
      // Blocked by guardrails
      const blockedText = "I can't help with that request.";
      await saveChatMessage(sb, { userId, role: "assistant", content: blockedText, employee: "Prime" });
      return json(200, { text: blockedText, blocked: true });
    }

    // 2) Memory: fetch facts + recall
    const facts = await fetchUserFacts(sb, userId);          // your facts table
    const recall = await recallSimilarMemory(sb, userId, latest.content); // embedding recall
    
    // Convert recall to format expected by router: { text: string }[]
    const memoryForRouter = recall.map(r => ({ text: r.fact }));

    // 3) Employee routing (KEEP your routing)
    const route = routeToEmployee(null, messages, memoryForRouter); // returns { slug, systemPrompt }
    const employeeSlug = route.slug; // e.g., "prime-boss", "tag-categorize", "byte-docs"
    const employeeName = employeeSlug.split('-')[0].charAt(0).toUpperCase() + employeeSlug.split('-')[0].slice(1); // "Prime", "Tag", "Byte"

    // 4) Build system prompt using router's systemPrompt
    const system = route.systemPrompt + "\nFollow guardrails. Never reveal PII. Use context if helpful.";

    // 5) Compose context
    const contextBlocks: string[] = [];
    if (facts?.length) contextBlocks.push("USER FACTS:\n" + facts.map((f:any)=>`- ${f.fact}`).join("\n"));
    if (recall?.length) contextBlocks.push("RECENT MEMORY:\n" + recall.map((r:any)=>`- ${r.fact} (score ${r.score?.toFixed(2)})`).join("\n"));

    const augmentedUserMsg = contextBlocks.length
      ? `${latest.content}\n\n---\n${contextBlocks.join("\n\n")}`
      : latest.content;

    const modelMessages = [
      { role: "system" as const, content: system },
      ...messages.slice(0, -1), // prior thread as-is (your server also persists; this keeps routing coherent)
      { role: "user" as const, content: augmentedUserMsg }
    ];

    // 6) STREAM response
    // Netlify: return a streamed response using Response/ReadableStream (Node 18+ runtime)
    const stream = new ReadableStream({
      async start(controller) {
        let assistantText = "";
        try {
          const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: modelMessages,
          temperature: 0.3,
            stream: true
          });

          for await (const chunk of completion) {
            const token = chunk.choices?.[0]?.delta?.content || "";
          if (token) {
              assistantText += token;
              controller.enqueue(new TextEncoder().encode(token));
            }
          }

          // Persist messages after full reply
          await saveChatMessage(sb, { userId, role: "user", content: latest.content, employee: employeeSlug });
          await saveChatMessage(sb, { userId, role: "assistant", content: assistantText, employee: employeeSlug });

          // Session summary (rolling)
          await saveConvoSummary(sb, userId, await summarizeRolling(assistantText));

          controller.close();
        } catch (err: any) {
          const fallback = "Sorry — I ran into an issue generating a reply.";
          controller.enqueue(new TextEncoder().encode(fallback));
          controller.close();
          // Store error reply minimally
          await saveChatMessage(sb, { userId, role: "assistant", content: fallback, employee: "Prime" });
          console.error("chat.ts error:", err?.message || err);
        }
      }
    });

    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked"
      }
    }) as any;
  } catch (e: any) {
    console.error("chat.ts fatal:", e?.message || e);
    return bad(500, "Chat error");
  }
};