import type { Handler } from "@netlify/functions";
import { withGuardrails } from "./_shared/guardrails";
import { assertWithinRateLimit } from "./_shared/rate-limit";
import { supabaseAdmin } from "./_shared/supabase";
import { z } from "zod";
import { openai, EMBED_MODEL } from "./openai";

const Input = z.object({
	user_id: z.string().uuid(),
	merchant_name: z.string().min(1).max(200),
	new_category_id: z.string().uuid().nullable().optional(),
	previous_category_id: z.string().uuid().nullable().optional(),
	transaction_id: z.string().uuid().nullable().optional(),
	confidence: z.number().min(0).max(1).optional().default(1.0),
	source: z
		.enum(["correction", "rule", "brain", "import", "system"])
		.default("brain"),
});

export const handler: Handler = withGuardrails(async (event) => {
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: "Method Not Allowed" };
	}

	const body = Input.parse(JSON.parse(event.body || "{}"));
	const {
		user_id,
		merchant_name,
		new_category_id,
		previous_category_id,
		transaction_id,
		confidence,
		source,
	} = body;

	// Per-user rate limit (60/min)
	await assertWithinRateLimit(user_id, 60);

	// Generate embedding for merchant_name
	const emb = await openai.embeddings.create({
		model: EMBED_MODEL,
		input: merchant_name,
	});
	const vector = emb.data[0]?.embedding as unknown as number[];

	// Upsert into merchant_embeddings (increment support)
	const { error: upErr } = await supabaseAdmin
		.from("merchant_embeddings")
		.upsert(
			{
				user_id,
				merchant_name,
				category_id: new_category_id ?? null,
				embedding: vector as any,
				support_count: 1,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "user_id,merchant_name" }
		);
	if (upErr) throw upErr;

	// Write learning audit
	const { error: auErr } = await supabaseAdmin
		.from("tag_learning_audit")
		.insert({
			user_id,
			transaction_id: transaction_id ?? null,
			merchant_name,
			previous_category_id: previous_category_id ?? null,
			new_category_id: new_category_id ?? null,
			source,
			confidence,
		});
	if (auErr) throw auErr;

	return { statusCode: 200, body: JSON.stringify({ ok: true }) };
});







