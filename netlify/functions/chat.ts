import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import crypto from "crypto";

// ---- ENV
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

// ---- DB
function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// ---- PII Masking
import { maskPII } from "./_shared/pii";

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

    // ====================================================================
    // SECURITY PIPELINE: PII Masking → Guardrails → Moderation
    // ====================================================================
    
    const latest = messages[messages.length - 1];
    const originalUserText = String(latest.content || "");
    
    // 1) MASK PII - Sanitize input before any processing
    const { masked, found } = maskPII(originalUserText, 'last4');
    
    // Log PII detection event (async, don't block on failure)
    if (found.length > 0) {
      console.log(`🛡️  Masked ${found.length} PII instance(s):`, found.map(f => f.type).join(', '));
      
      try {
        await sb.from("guardrail_events").insert({
          user_id: userId,
          stage: "chat_input",
          rule_type: "pii_detected",
          action: "masked",
          severity: 2,
          content_hash: crypto.createHash("sha256")
            .update(originalUserText.slice(0, 256))
            .digest("hex")
            .slice(0, 24),
          meta: { 
            pii_types: found.map(f => f.type),
            count: found.length 
          },
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn("PII guardrail log failed:", e);
      }
    }
    
    // 2) GUARDRAILS - Apply comprehensive security checks on masked text
    const guardrailConfig = {
      preset: 'strict' as const,
      jailbreakThreshold: 70,
      moderationBlock: true,
      piiEntities: [],
      ingestion: { pii: true, moderation: true },
      chat: { pii: true, moderation: true, jailbreak: true }
    };
    
    const gr = await runGuardrails(masked, userId, 'chat', guardrailConfig);

    if (!gr.ok) {
      // Blocked by guardrails
      const refusal = gr.block_message || "I'm sorry — I can't help with that request.";
      await saveChatMessage(sb, { userId, role: "assistant", content: refusal, employee: "Prime" });
      return json(200, { text: refusal, blocked: true });
    }
    
    // 3) MODERATION - Double-check with OpenAI moderation API
    try {
      const mod = await openai.moderations.create({ 
        model: "omni-moderation-latest", 
        input: masked 
      });
      
      const result = mod?.results?.[0];
      if (result?.flagged || result?.categories?.["illicit-violent"]) {
        const refuse = "I'm sorry — I can't assist with that.";
        
        // Log moderation event
        await sb.from("guardrail_events").insert({
          user_id: userId,
          stage: "chat_moderation",
          rule_type: "openai_moderation",
          action: "blocked",
          severity: 3,
          content_hash: crypto.createHash("sha256")
            .update(masked.slice(0, 256))
            .digest("hex")
            .slice(0, 24),
          meta: { 
            categories: result.categories,
            category_scores: result.category_scores
          },
          created_at: new Date().toISOString()
        });
        
        await saveChatMessage(sb, { userId, role: "assistant", content: refuse, employee: "Prime" });
        return json(200, { text: refuse, blocked: true });
      }
    } catch (modErr) {
      console.warn("Moderation API error:", modErr);
      // Continue if moderation fails - guardrails already passed
    }
    
    // 4) SANITIZE MESSAGES - Use masked text for LLM and storage
    const sanitizedMessages = [
      ...messages.slice(0, -1),
      { ...latest, content: masked }
    ];

    // 5) Memory: fetch facts + recall (use masked content for memory queries)
    const facts = await fetchUserFacts(sb, userId);
    const recall = await recallSimilarMemory(sb, userId, masked);
    
    // Convert recall to format expected by router: { text: string }[]
    const memoryForRouter = recall.map(r => ({ text: r.fact }));

    // 6) Employee routing (use sanitized messages)
    const route = routeToEmployee(null, sanitizedMessages, memoryForRouter);
    const employeeSlug = route.slug;
    const employeeName = employeeSlug.split('-')[0].charAt(0).toUpperCase() + employeeSlug.split('-')[0].slice(1);

    // 7) Build system prompt with security instructions
    let system = route.systemPrompt + 
      "\nIMPORTANT: Never reveal PII, credit cards, SSNs, or passwords. " +
      "Do not provide instructions for illegal activities. " +
      "Use context if helpful but prioritize user privacy and safety.";
    
    // Add friendly PII notice if detected
    if (found.length > 0) {
      const piiTypesList = found.map(f => {
        if (f.type.includes('credit') || f.type.includes('card')) return 'payment card';
        if (f.type.includes('ssn') || f.type.includes('sin')) return 'social security number';
        if (f.type.includes('email')) return 'email address';
        if (f.type.includes('phone')) return 'phone number';
        return 'sensitive information';
      }).join(', ');
      
      system += `\n\nNOTE: The user's message contained ${piiTypesList}. ` +
        `I've redacted it for security. Gently acknowledge this if relevant to the conversation. ` +
        `For example: "I've protected your ${piiTypesList} - I can't process or store raw payment/personal details."`;
    }

    // 8) Compose context
    const contextBlocks: string[] = [];
    if (facts?.length) contextBlocks.push("USER FACTS:\n" + facts.map((f:any)=>`- ${f.fact}`).join("\n"));
    if (recall?.length) contextBlocks.push("RECENT MEMORY:\n" + recall.map((r:any)=>`- ${r.fact} (score ${r.score?.toFixed(2)})`).join("\n"));

    const augmentedUserMsg = contextBlocks.length
      ? `${masked}\n\n---\n${contextBlocks.join("\n\n")}`
      : masked;

    const modelMessages = [
      { role: "system" as const, content: system },
      ...sanitizedMessages.slice(0, -1),
      { role: "user" as const, content: augmentedUserMsg }
    ];

    // 9) STREAM response with security checks
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

          // Collect full response (don't stream yet - need to sanitize first)
          for await (const chunk of completion) {
            const token = chunk.choices?.[0]?.delta?.content || "";
            if (token) {
              assistantText += token;
            }
          }

          // ====================================================================
          // FINAL SANITATION: Redact any PII in assistant's response
          // ====================================================================
          const { masked: assistantRedacted, found: assistantPII } = maskPII(assistantText, 'last4');
          
          // Log if assistant somehow leaked PII (should not happen with proper prompt)
          if (assistantPII.length > 0) {
            console.warn(`⚠️  Assistant response contained PII (${assistantPII.length} instances):`, 
              assistantPII.map(p => p.type));
            
            try {
              await sb.from("guardrail_events").insert({
                user_id: userId,
                stage: "chat_output",
                rule_type: "assistant_pii_detected",
                action: "redacted",
                severity: 3,
                content_hash: crypto.createHash("sha256")
                  .update(assistantText.slice(0, 256))
                  .digest("hex")
                  .slice(0, 24),
                meta: { 
                  pii_types: assistantPII.map(f => f.type),
                  count: assistantPII.length,
                  employee: employeeSlug
                },
                created_at: new Date().toISOString()
              });
            } catch (e) {
              console.warn("Assistant PII log failed:", e);
            }
          }
          
          // Stream the REDACTED response to client
          controller.enqueue(new TextEncoder().encode(assistantRedacted));

          // Persist MASKED user input and REDACTED assistant output
          await saveChatMessage(sb, { 
            userId, 
            role: "user", 
            content: masked, // Store masked user input
            employee: employeeSlug 
          });
          
          await saveChatMessage(sb, { 
            userId, 
            role: "assistant", 
            content: assistantRedacted, // Store redacted assistant output
            employee: employeeSlug 
          });

          // Session summary (using redacted text)
          await saveConvoSummary(sb, userId, await summarizeRolling(assistantRedacted));

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
        "Transfer-Encoding": "chunked",
        "X-Chat-Backend": "v2"  // Sanity beacon - confirms new backend
      }
    }) as any;
  } catch (e: any) {
    console.error("chat.ts fatal:", e?.message || e);
    return bad(500, "Chat error");
  }
};