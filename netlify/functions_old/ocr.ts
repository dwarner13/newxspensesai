// netlify/functions/ocr.ts

import type { Handler } from '@netlify/functions';

import { createClient } from '@supabase/supabase-js';

import { runOcrWithProvider } from './_shared/ocr_providers';

import { normalizeBankStatement } from './_shared/ocr_normalize';

import { buildResponseHeaders } from './_shared/headers';



const supabaseUrl = process.env.SUPABASE_URL!;

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);



export const handler: Handler = async (event) => {

  const start = Date.now();



  try {

    const { documentId, providerOverride, mode } = JSON.parse(event.body || '{}');



    // 1) Load document

    const { data: doc, error: docError } = await supabaseAdmin

      .from('user_documents')

      .select('*')

      .eq('id', documentId)

      .single();



    if (docError || !doc) {

      throw new Error('Document not found');

    }



    const userId: string = doc.user_id;

    const provider = providerOverride || 'ocr_space';



    // 2) Create OCR run

    const { data: run, error: runError } = await supabaseAdmin

      .from('ocr_runs')

      .insert({

        user_id: userId,

        document_id: documentId,

        provider,

        status: 'running',

        started_at: new Date().toISOString(),

      })

      .select('*')

      .single();



    if (runError || !run) {

      throw new Error('Could not create OCR run');

    }



    // 3) Download file via source_url

    const fileResponse = await fetch(doc.source_url);

    if (!fileResponse.ok) {

      throw new Error(`Failed to download file: ${fileResponse.status}`);

    }

    const arrayBuffer = await fileResponse.arrayBuffer();

    const fileBuffer = Buffer.from(arrayBuffer);



    // 4) Run OCR

    const ocrResult = await runOcrWithProvider(provider, fileBuffer);

    // ocrResult: { rawText, pages_total, pages_succeeded, meta }



    // 5) Normalize -> transactions

    let txs: any[] = [];



    const effectiveMode =

      mode || doc.doc_type || 'bank_statement'; // simple default for now



    if (effectiveMode === 'bank_statement') {

      txs = normalizeBankStatement(ocrResult.rawText);

      // each tx: { date, merchant, description, amount, category, raw_line_text }

    } else {

      // TODO: normalizeReceipt

    }



    // 6) Insert into transactions

    let insertedCount = 0;

    if (txs.length > 0) {

      const rows = txs.map((tx, index) => ({

        // ownership

        user_id: userId,



        // existing transaction fields

        date: tx.date,

        merchant: tx.merchant ?? 'Unknown Vendor',

        amount: tx.amount,

        category: tx.category ?? 'Uncategorized',

        description: tx.description ?? tx.raw_line_text ?? '',

        type: 'expense',

        receipt_url: doc.source_url,

        review_status: 'auto',



        // 🔗 OCR linkage (NEW)

        document_id: documentId,          // link to user_documents.id

        ocr_run_id: run.id,               // link to ocr_runs.id

        source_line_number: index + 1,    // 1, 2, 3, ...

        raw_line_text: tx.raw_line_text ?? null,

      }));



      const { error: txError } = await supabaseAdmin

        .from('transactions')

        .insert(rows);



      if (txError) {

        throw txError;

      }



      insertedCount = rows.length;

    }



    const durationMs = Date.now() - start;



    // 7) Update OCR run

    await supabaseAdmin

      .from('ocr_runs')

      .update({

        status: 'succeeded',

        finished_at: new Date().toISOString(),

        duration_ms: durationMs,

        pages_total: ocrResult.pages_total ?? null,

        pages_succeeded: ocrResult.pages_succeeded ?? null,

        raw_text: null,        // or ocrResult.rawText if you want to store it

        meta: ocrResult.meta ?? null,

      })

      .eq('id', run.id);



    // 8) Update document

    await supabaseAdmin

      .from('user_documents')

      .update({

        status: 'processed',

        doc_type: effectiveMode,

        ocr_provider: provider,

        ocr_last_run_at: new Date().toISOString(),

        ocr_error: null,

        updated_at: new Date().toISOString(),

        raw_text: ocrResult.rawText ?? doc.raw_text, // keep OCR text here if you like

      })

      .eq('id', documentId);



    return {

      statusCode: 200,

      headers: buildResponseHeaders({

        guardrailsActive: true,

        piiMaskEnabled: true,

        employee: 'byte',

        routeConfidence: 1.0,

        ocrProvider: provider,

        transactionsSaved: insertedCount,

      }),

      body: JSON.stringify({

        documentId,

        ocrRunId: run.id,

        transactionsInserted: insertedCount,

        durationMs,

      }),

    };

  } catch (err: any) {

    const durationMs = Date.now() - start;



    return {

      statusCode: 500,

      headers: buildResponseHeaders({

        guardrailsActive: false,

        piiMaskEnabled: true,

        employee: 'byte',

        routeConfidence: 0.0,

        ocrProvider: 'none',

      }),

      body: JSON.stringify({

        error: true,

        message: err.message || 'Unknown error',

        durationMs,

      }),

    };

  }

};
