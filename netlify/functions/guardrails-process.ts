import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./supabase";
import { applyGuardrails, GUARDRAIL_PRESETS, logGuardrailEvent } from "./_shared/guardrails";
import { createHash } from "crypto";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * 🛡️ Guardrails Processing Function
 * 
 * Processes documents marked as "pending" in user_documents table:
 * 1. Apply strict PII redaction
 * 2. Check content moderation
 * 3. Classify document type (receipt, invoice, statement)
 * 4. Mark as "ready" or "rejected"
 * 5. Optionally create transaction records
 * 
 * This runs AFTER Gmail sync but BEFORE OCR/normalization
 */

// Optional: ask OpenAI to classify whether this is finance-related and safe
async function aiGate(text: string): Promise<{ allow: boolean; reason: string }> {
  if (!OPENAI_API_KEY) return { allow: true, reason: "OPENAI_API_KEY missing → default allow" };

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a strict intake guardrail. Approve only if the content looks like a receipt, invoice, bill, bank/credit statement, subscription or financial notice. Reject marketing spam or unrelated personal content.",
      },
      {
        role: "user",
        content:
          "Decide APPROVE or REJECT for this content. Reply with a single JSON: {\"allow\": true|false, \"reason\": \"short\"}.\n\nCONTENT:\n" +
          text.slice(0, 4000),
      },
    ],
    temperature: 0,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return { allow: true, reason: "OpenAI error, default allow" };
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return { allow: !!parsed.allow, reason: String(parsed.reason || "") };
  } catch {
    return { allow: true, reason: "Parse error, default allow" };
  }
}

// Classify document to create receipts/transactions when the subject hints at it
function classifyDoc(subject: string, body: string) {
  const s = (subject + " " + body).toLowerCase();
  return {
    isReceipt: /(receipt|order|purchase|paid|payment)/.test(s),
    isInvoice: /(invoice|amount due|balance due|statement)/.test(s),
    merchant: (s.match(/\b(?:amazon|walmart|costco|uber|lyft|apple|google|starbucks|target)\b/) || [])[0] || null,
    amount:
      parseFloat(((s.match(/\$ ?\d+[.,]?\d{0,2}/) || [])[0] || "").replace(/[^0-9.]/g, "")) ||
      null,
  };
}

export const handler: Handler = async (event) => {
  try {
    const url = new URL(event.rawUrl);
    const userId = url.searchParams.get("userId");
    if (!userId) return { statusCode: 400, body: "Missing userId" };

    // 1) Pull pending docs for this user
    const { data: docs, error } = await supabaseAdmin
      .from("user_documents")
      .select("id, subject, guardrails, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .limit(20);
    if (error) throw error;

    if (!docs || docs.length === 0) {
      return { statusCode: 200, body: "No pending documents." };
    }

    let processed = 0;
    let rejected = 0;

    for (const d of docs) {
      // Get the snippet that was stored during Gmail sync (already redacted once)
      // For OCR text, this would be the raw OCR output
      const originalText = d.guardrails?.snippet || "";
      
      // ✅ APPLY COMPREHENSIVE GUARDRAILS (Strict Preset for Ingestion)
      const guardrailResult = await applyGuardrails(
        originalText,
        GUARDRAIL_PRESETS.strict,
        userId
      );

      // Log guardrail event
      const inputHash = createHash('sha256').update(originalText).digest('hex');
      await logGuardrailEvent({
        user_id: userId,
        stage: 'ocr',
        preset: 'strict',
        outcome: guardrailResult,
        input_hash: inputHash
      });

      // If blocked by guardrails → mark as rejected
      if (!guardrailResult.ok) {
        await supabaseAdmin
          .from("user_documents")
          .update({
            status: "rejected",
            guardrails: {
              ...d.guardrails,
              blocked: true,
              reasons: guardrailResult.reasons,
              pii_types: guardrailResult.signals?.piiTypes,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", d.id);
        rejected++;
        continue;
      }

      // Get the redacted text (safe to process)
      const safeText = guardrailResult.redacted || originalText;

      // Optional: AI gate to check if it's finance-related
      const gate = await aiGate(safeText);
      if (!gate.allow) {
        await supabaseAdmin
          .from("user_documents")
          .update({
            status: "rejected",
            guardrails: { 
              ...d.guardrails, 
              reason: gate.reason, 
              pii_types: guardrailResult.signals?.piiTypes,
              ai_gate_failed: true
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", d.id);
        rejected++;
        continue;
      }

      // Classify the document type
      const info = classifyDoc(d.subject || "", safeText);

      // Update document to "ready" status with redacted content
      const { error: upErr } = await supabaseAdmin
        .from("user_documents")
        .update({
          status: "ready",
          guardrails: {
            ...d.guardrails,
            pii_types: guardrailResult.signals?.piiTypes,
            pii_found: guardrailResult.signals?.piiFound,
            ai_gate_reason: gate.reason,
            redacted_text: safeText,  // ONLY store redacted text
            classified: info,
            moderation_passed: true,
            redaction_applied: true
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", d.id);
      if (upErr) throw upErr;

      // Optional: create a minimal receipt/transaction record
      if (info.isReceipt || info.isInvoice) {
        // Create receipt record
        const { data: receipt, error: receiptErr } = await supabaseAdmin
          .from("receipts")
          .insert({
            user_id: userId,
            image_url: null,
            original_filename: null,
            processing_status: "complete",
            redacted_text: safeText,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!receiptErr && receipt && info.amount) {
          // Create transaction record
          await supabaseAdmin.from("transactions").insert({
            user_id: userId,
            receipt_id: receipt.id,
            date: new Date().toISOString().slice(0, 10),
            merchant: info.merchant,
            amount: -Math.abs(info.amount), // Negative for expenses
            category: null,  // Will be categorized by Tag AI later
            description: d.subject || "Email import",
            type: "expense",
            created_at: new Date().toISOString(),
          });
        }
      }

      processed++;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Guardrails processed ${processed} documents (${rejected} rejected).`,
        processed,
        rejected,
        pii_redaction: 'applied',
        moderation: 'checked',
        compliance: 'GDPR/CCPA'
      }),
    };
  } catch (err: any) {
    console.error('[Guardrails Process Error]', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: err?.message || "guardrails-process error",
        stack: err?.stack 
      })
    };
  }
};
