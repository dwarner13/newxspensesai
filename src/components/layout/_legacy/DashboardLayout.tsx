import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Crown, Bot } from "lucide-react";
import DesktopSidebar from "../navigation/DesktopSidebar";
import MobileNavInline from "../navigation/MobileNavInline";
import DashboardHeader from "../ui/DashboardHeader";
import AIEmployeeRoom from "../ai/AIEmployeeRoom";
import AITeamSlideOutPanel from "./AITeamSlideOutPanel";



export default function DashboardLayout() {
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [isAIEmployeeRoomOpen, setIsAIEmployeeRoomOpen] = useState(false);


// Dev-only guard to detect duplicate sidebars
useEffect(() => {
  if (import.meta.PS C:\dev\project-bolt-fixed> npx netlify dev
    ⬥ Injecting environment variable values for all scopes
    ⬥ Ignored general context env var: LANG (defined in process)
    ⬥ Ignored .env file env var: SUPABASE_URL (defined in .env.local file)
    ⬥ Ignored .env file env var: SUPABASE_SERVICE_ROLE_KEY (defined in .env.local file)
    ⬥ Ignored .env file env var: SUPABASE_ANON_KEY (defined in .env.local file)
    ⬥ Ignored .env file env var: VITE_SUPABASE_URL (defined in .env.local file)
    ⬥ Ignored .env file env var: VITE_SUPABASE_ANON_KEY (defined in .env.local file)
    ⬥ Ignored .env file env var: SUPABASE_PUBLIC_ANON_KEY (defined in .env.local file)
    ⬥ Injected .env file env vars: OPENAI_API_KEY, OPENAI_CHAT_MODEL, VITE_DISABLE_POST_IMPORT_TRIGGERS, OCR_SPACE_API_KEY, GOOGLE_VISION_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
    ⬥ Injected .env.local file env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_PUBLIC_ANON_KEY, VITE_CHAT_ENDPOINT, ENABLE_PDF_EMBEDDED_TEXT, SUPABASE_JWT_SECRET, VITE_OCR_SPACE_API_KEY, VITE_GOOGLE_VISION_API_KEY, VITE_SPOTIFY_CLIENT_ID, REACT_APP_GOOGLE_VISION_API_KEY, VITE_OCR_DEBUG
    ⬥ Setting up local dev server
    
    ⬥ Starting Vite dev server
    
    > xspenses@0.0.0 dev
    > vite --port 5174 --host
    
    Forced re-optimization of dependencies
    
      VITE v5.4.21  ready in 803 ms
    
      ➜  Local:   http://localhost:5174/
      ➜  Network: http://172.20.10.7:5174/
    ✔ Vite dev server ready on port 5174
    
    ╭─────────────────────── ⬥  ────────────────────────╮ 
    │                                                   │ 
    │   Local dev server ready: http://localhost:8888   │ 
    │                                                   │ 
    ╰───────────────────────────────────────────────────╯ 
    
    ▲ [WARNING] "./xhr-sync-worker.js" should be marked as external for use with "require.resolve" [require-resolve-not-external]
    
        node_modules/jsdom/lib/jsdom/living/xhr/XMLHttpRequest-impl.js:31:57:
          31 │ ...resolve("./xhr-sync-worker.js") : null; 
             ╵            ~~~~~~~~~~~~~~~~~~~~~~
    
    ⬥ Loaded function ping
    ⬥ Loaded function byte-warm
    ⬥ Loaded function selftest
    ⬥ Loaded function crystal-analyze-import
    ⬥ Loaded function test
    ⬥ Loaded function categorize-transactions
    ⬥ Loaded function ocr
    ⬥ Loaded function chat-threads
    ⬥ Loaded function delete-upload
    ⬥ Loaded function smart_import_stats
    ⬥ Loaded function prime-summary
    ⬥ Loaded function prime-state
    Request from ::ffff:127.0.0.1: POST /.netlify/functions/prime-state
    [prime-state] ✅ Handler called { method: 'POST', path: '/.netlify/functions/prime-state' }
    Request from ::ffff:127.0.0.1: POST /.netlify/functions/prime-state
    [prime-state] ✅ Handler called { method: 'POST', path: '/.netlify/functions/prime-state' }
    ⬥ Loaded function tag-learn
    ⬥ Loaded function sync-recurring-obligations
    ⬥ Loaded function clear-chat-history
    ⬥ Loaded function memory-extraction-worker
    ⬥ Loaded function activity-feed
    ⬥ Loaded function tag-merchant-insights
    ⬥ Loaded function tag-explain
    ⬥ Loaded function seed-activity-events
    ⬥ Loaded function update-vendor-category
    ⬥ Loaded function debug-memory
    ⬥ Loaded function smart-import-parse-csv
    ⬥ Loaded function prime-live-stats
    [prime-state] PrimeState built: {
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      currentStage: 'guided',
      hasTransactions: true,
      transactionCount: 14,
      suggestedAction: 'view-analytics',
      warningsCount: 0
    }
    Response with status 200 in 18469 ms.
    [prime-state] PrimeState built: {
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      currentStage: 'guided',
      hasTransactions: true,
      transactionCount: 14,
      suggestedAction: 'view-analytics',
      warningsCount: 0
    }
    Response with status 200 in 18262 ms.
    ⬥ Loaded function smart-import-init
    ⬥ Loaded function smart-import-sync
    ⬥ Loaded function smart-import-ocr
    ⬥ Loaded function guardrails-health
    ⬥ Loaded function byte-ocr-parse
    ⬥ Loaded function document-insights
    ⬥ Loaded function normalize-transactions
    ⬥ Loaded function commit-import
    ⬥ Loaded function smart-import-finalize
    ⬥ Loaded function chat
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=3&category=dashboard
    Request from ::1: POST /.netlify/functions/prime-state
    [prime-state] ✅ Handler called { method: 'POST', path: '/.netlify/functions/prime-state' }
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=30&category=prime
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=30&category=prime
    Request from ::1: POST /.netlify/functions/categorize-transactions
    [categorize-transactions] Stub invoked
    Response with status 200 in 12 ms.
    Request from ::1: POST /.netlify/functions/crystal-analyze-import
    [crystal-analyze-import] Stub invoked
    Response with status 200 in 27 ms.
    Request from ::1: POST /.netlify/functions/categorize-transactions
    [categorize-transactions] Stub invoked
    Response with status 200 in 9 ms.
    Request from ::1: POST /.netlify/functions/crystal-analyze-import
    [crystal-analyze-import] Stub invoked
    Response with status 200 in 5 ms.
    Request from ::1: POST /.netlify/functions/categorize-transactions
    [categorize-transactions] Stub invoked
    Response with status 200 in 13 ms.
    Request from ::1: POST /.netlify/functions/crystal-analyze-import
    [crystal-analyze-import] Stub invoked
    Response with status 200 in 9 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 795 ms.
    Response with status 200 in 476 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=3&category=dashboard
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 542 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 294 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=3&category=dashboard
    Response with status 200 in 147 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=3&category=dashboard
    Response with status 200 in 1196 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 165 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=3&category=dashboard
    Response with status 200 in 194 ms.
    Response with status 200 in 606 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    [prime-state] PrimeState built: {
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      currentStage: 'guided',
      hasTransactions: true,
      transactionCount: 14,
      suggestedAction: 'view-analytics',
      warningsCount: 0
    }
    Response with status 200 in 2041 ms.
    Response with status 200 in 1347 ms.
    Response with status 200 in 1395 ms.
    Response with status 200 in 1881 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 675 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: GET /.netlify/functions/guardrails-health
    Request from ::1: POST /.netlify/functions/clear-chat-history
    Request from ::1: POST /.netlify/functions/prime-summary
    [guardrails-health] Health check completed: {
      ok: true,
      enabled: true,
      pii_masking: true,
      moderation: true,
      duration: '322ms'
    }
    Response with status 200 in 408 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=30&category=prime
    Response with status 200 in 500 ms.
    Response with status 200 in 185 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=30&category=prime
    Response with status 200 in 835 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 150 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=30&category=prime
    Response with status 200 in 174 ms.
    Request from ::1: GET /.netlify/functions/activity-feed?userId=938a2e17-0e49-45ff-bb98-810db46e5e65&limit=30&category=prime
    Response with status 200 in 1351 ms.
    Response with status 200 in 166 ms.
    Response with status 200 in 1472 ms.
    Response with status 200 in 577 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 1357 ms.
    Response with status 200 in 588 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 572 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 560 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 590 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 585 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 1312 ms.
    Response with status 200 in 1357 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 571 ms.
    Response with status 200 in 1344 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 601 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: POST /.netlify/functions/smart-import-init
    [smart-import-init] Creating document: {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      fileName: 'Capital One - Oct 22, 2025.pdf',
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65'      
    }
    Response with status 200 in 622 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 1530 ms.
    Response with status 200 in 1526 ms.
    [smart-import-init] ✅ Upload initialized: {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      storagePath: '938a2e17-0e49-45ff-bb98-810db46e5e65/cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de/Capital One - Oct 22, 2025.pdf'
    }
    Response with status 200 in 545 ms.
    Response with status 200 in 1373 ms.
    Response with status 200 in 544 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 564 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: POST /.netlify/functions/smart-import-finalize
    Response with status 200 in 595 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 568 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Request from ::1: POST /.netlify/functions/smart-import-ocr
    [FUNC=smart-import-ocr] handler start
    [OCR][no-trace] START {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      importRunId: undefined
    }
    Response with status 200 in 1483 ms.
    Response with status 200 in 551 ms.
    Request from ::1: POST /.netlify/functions/smart-import-sync
    [smart-import-sync] Starting sync {
      userId: '938a2e17...',
      docIds: [ 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de' ]  
    }
    Request from ::1: POST /.netlify/functions/prime-summary
    [smart-import-sync] Import not found, triggering normalization for docId: cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de
    [smart-import-sync] waitForOcrText start {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      maxMs: 15000,
      pollMs: 500
    }
    [OCR][no-trace] FILE {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      mimeType: 'application/pdf',
      expectedSize: undefined,
      storedSize: 219216
    }
    Response with status 200 in 1319 ms.
    Response with status 200 in 1331 ms.
    [smart-import-sync] OCR text empty {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      status: 'rejected',
      updatedAt: '2026-02-08T16:34:57.007+00:00'
    }
    [OCR] Embedded PDF text extraction ENABLED (pdf-parse only)
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    [smart-import-sync] OCR text empty {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      status: 'ocr_processing',
      updatedAt: '2026-02-08T16:34:57.572+00:00'
    }
    Warning: Indexing all PDF objects
    [OCR] pdf-parse embedded text extracted { textLength: 10204 }
    [OCR] Embedded PDF extraction success (pdf-parse) { chars: 10204 }
    [OCR][no-trace] EXTRACTED {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      textLength: 10204,
      provider: 'embedded_pdf_parse',
      durationMs: 978
    }
    [OCR][no-trace] Guardrails returned empty text; applied fallback redaction {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      fallbackTypes: [
        'ssn_us_no_dash', 'pan_generic',    'swift_bic',  
        'swift_bic',      'swift_bic',      'swift_bic',  
        'swift_bic',      'swift_bic',      'swift_bic',  
        'swift_bic',      'swift_bic',      'swift_bic',  
        'swift_bic',      'swift_bic',      'swift_bic',  
        'swift_bic',      'swift_bic',      'dob_us',     
        'phone_intl',     'phone_intl',     'phone_intl', 
        'phone_intl',     'phone_intl',     'phone_intl', 
        'phone_intl',     'phone_intl',     'phone_intl', 
        'phone_intl',     'phone_intl',     'phone_intl', 
        'phone_intl',     'street_address', 'postal_ca',  
        'postal_ca',      'postal_ca',      'postal_ca',  
        'zip_us',         'zip_us',         'zip_us',     
        'zip_us'
      ]
    }
    [OCR] Guardrails policy: import_mode_allow_pii_with_redaction=true
    [OCR] Guardrails PII detected; redacted and continuing {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      reasons: [ 'pii_blocked:ssn_us_no_dash' ]
    }
    [OCR] Sanitized OCR text (removed invalid unicode) {  
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      originalLength: 10444,
      sanitizedLength: 10443
    }
    Response with status 200 in 1564 ms.
    [smart-import-sync] OCR text empty {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      status: 'ocr_processing',
      updatedAt: '2026-02-08T16:34:57.572+00:00'
    }
    Request from ::1: POST /.netlify/functions/prime-summary
    [OCR][no-trace] DB_WRITE_RETRY {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      reason: 'missing_ocr_engine_column'
    }
    Response with status 200 in 1615 ms.
    Response with status 200 in 1599 ms.
    [OCR][no-trace] DB_WRITE_OK { docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de', len: 10444 }
    Response with status 200 in 2614 ms.
    Request from ::1: POST /.netlify/functions/normalize-transactions
    [smart-import-sync] OCR text ready {
      docId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de',      
      len: 10443,
      elapsedMs: 2220
    }
    [UserActivity] Failed to recalculate fluency: {
      code: '42883',
      details: null,
      hint: 'No operator matches the given name and argument types. You might need to add explicit type casts.',
      message: 'operator does not exist: uuid = text'     
    }
    Request from ::1: POST /.netlify/functions/normalize-transactions
    [Byte OCR] Primary parser found 1 transaction(s) on credit card statement, using AI fallback parser
    [Byte OCR] Calling OpenAI AI fallback parser for credit_card statement (10443 chars)
    [Byte OCR] Primary parser found 1 transaction(s) on credit card statement, using AI fallback parser
    [Byte OCR] Calling OpenAI AI fallback parser for credit_card statement (10443 chars)
    Response with status 200 in 1278 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1184 ms.
    Response with status 200 in 1405 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1295 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1283 ms.
    Response with status 200 in 1352 ms.
    Response with status 200 in 1318 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1234 ms.
    Response with status 200 in 1330 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1252 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1163 ms.
    Response with status 200 in 1200 ms.
    Response with status 200 in 1330 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1287 ms.
    Response with status 200 in 1295 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1295 ms.
    Request from ::1: POST /.netlify/functions/prime-summary
    Response with status 200 in 1197 ms.
    Response with status 200 in 1248 ms.
    Response with status 200 in 1190 ms.
    [Byte OCR] AI fallback parser produced 29 validated transactions
    [Byte OCR] AI fallback parser produced 29 transactions
    [normalize-transactions] Parse summary {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      documentId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de', 
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      extractedTextLength: 10443,
      normalizedTransactionsLength: 29,
      viaMethod: 'ocr'
    }
    [normalize-transactions] Staging rows built {
      count: 29,
      sample: {
        import_id: '3ff73050-5c63-40c4-a6ec-2511af134188',
        user_id: '938a2e17-0e49-45ff-bb98-810db46e5e65',  
        doc_id: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de'    
      }
    }
    [Byte OCR] AI fallback parser produced 29 validated transactions
    [Byte OCR] AI fallback parser produced 29 transactions
    [normalize-transactions] Parse summary {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      documentId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de', 
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      extractedTextLength: 10443,
      normalizedTransactionsLength: 29,
      viaMethod: 'ocr'
    }
    [normalize-transactions] Staging rows built {
      count: 29,
      sample: {
        import_id: '3ff73050-5c63-40c4-a6ec-2511af134188',
        user_id: '938a2e17-0e49-45ff-bb98-810db46e5e65',  
        doc_id: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de'    
      }
    }
    [normalize-transactions] staging upsert OK { importId: '3ff73050-5c63-40c4-a6ec-2511af134188', rowCount: 29 }
    [normalize-transactions] staging upsert OK { importId: '3ff73050-5c63-40c4-a6ec-2511af134188', rowCount: 29 }
    [normalize-transactions] Successfully normalized 29 transactions for import 3ff73050-5c63-40c4-a6ec-2511af134188
    Response with status 200 in 15651 ms.
    [normalize-transactions] Successfully normalized 29 transactions for import 3ff73050-5c63-40c4-a6ec-2511af134188
    Response with status 200 in 15944 ms.
    [smart-import-sync] Found imports { importIds: [ '3ff73050-5c63-40c4-a6ec-2511af134188' ] }
    [smart-import-sync] Ready imports { readyImportIds: [ '3ff73050-5c63-40c4-a6ec-2511af134188' ] }
    Request from ::1: POST /.netlify/functions/commit-import
    [CommitImport] Starting commit process {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      userId: '938a2e17...'
    }
    [CommitImport] Import record fetched { found: true, status: 'parsed', fileType: 'application/pdf' }
    [CommitImport] Waiting for staged rows... { importId: '3ff73050-5c63-40c4-a6ec-2511af134188' }
    [CommitImport] Poll staged count {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65'      
    }
    [CommitImport] Poll result {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      stagedCount: 30
    }
    [CommitImport] Staged rows appeared {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      count: 30,
      elapsedMs: 122
    }
    [CommitImport] Fetching staged transactions { importId: '3ff73050-5c63-40c4-a6ec-2511af134188' }
    [CommitImport] Staged transactions fetched { count: 30, hasError: false }
    commit-import.staging_found {
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      stagedCount: 30,
      sampleStageIds: [
        '8d2f1d5f-b714-42b6-8f70-240b057b3071',
        '3bcad022-75cf-4598-8ac3-dc4669241bf9',
        'f4ab6943-840f-4b04-89b5-6b4076bed4f1',
        '54190efd-73a3-4a6d-9a0f-d6014a8b039f',
        '98474f04-b7fa-4705-8eab-727d8f018d5c'
      ]
    }
    [CommitImport] Transforming and categorizing transactions { count: 30 }
    Request from ::1: POST /.netlify/functions/categorize-transactions
    [categorize-transactions] Stub invoked
    Response with status 200 in 3 ms.
    Request from ::1: POST /.netlify/functions/crystal-analyze-import
    [crystal-analyze-import] Stub invoked
    Response with status 200 in 4 ms.
    [CommitImport] Inserting transactions into final table {
      count: 30,
      user_id: '938a2e17-0e49-45ff-bb98-810db46e5e65',    
      import_id: '3ff73050-5c63-40c4-a6ec-2511af134188'   
    }
    Request from ::1: POST /.netlify/functions/prime-summary
    [CommitImport] User transaction count after insert { user_id: '938a2e17-0e49-45ff-bb98-810db46e5e65', count:
     44 }
    [CommitImport] Transactions inserted { insertedCount: 30, hasError: false, errorCode: undefined }
    commit-import.insert_ok {
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      insertedCount: 30,
      sampleInsertedIds: [
        '1d22aeb2-1e94-42e3-bb7c-e2108a1621a7',
        '61779493-bcbe-4d38-8510-ef72eb4dbc02',
        '773426ff-1703-423e-968c-5830b67baf8d',
        '1d3c8aa3-7c6d-4258-852c-509e0850cecf',
        '75cc80ed-e2e2-4004-9b9d-92a84ade9e0b'
      ]
    }
    [CommitImport] Updating import status to committed {  
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      committedCount: 30,
      timestamp: '2026-02-08T16:35:18.844Z'
    }
    Response with status 200 in 289 ms.
    [CommitImport] Error updating import status: {
      code: 'PGRST204',
      details: null,
      hint: null,
      message: "Could not find the 'committed_count' column of 'imports' in the schema cache"
    }
    commit-import.success {
      importId: '3ff73050-5c63-40c4-a6ec-2511af134188',   
      userId: '938a2e17-0e49-45ff-bb98-810db46e5e65',     
      documentId: 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de', 
      transactionCount: 30
    }
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    [RecurringDetection] Error checking existing obligation {
      userId: 'user_938a2e17...',
      merchant: 'Amazon Channels',
      error: 'column recurring_obligations.category does not exist'
    }
    [Chime] Recurring detection complete {
      userId: '938a2e17...',
      importId: '3ff73050...',
      candidatesAnalyzed: 20,
      obligationsCreated: 0,
      obligationsUpdated: 0
    }
    [CommitImport] Computing summary and detecting issues { transactionCount: 30 }
    [CommitImport] Summary computed {
      totalTransactions: 30,
      totalCredits: 0,
      totalDebits: 1420.04,
      uncategorizedCount: 0,
      topCategoriesCount: 5,
      dateRange: { startDate: '2025-09-22', endDate: '2025-10-21' }
    }
    [CommitImport] Issues detected { unassignedCategoriesCount: 0, possibleDuplicatesCount: 1 }
    Response with status 200 in 3559 ms.
    [smart-import-sync] Committed import { importId: '3ff73050-5c63-40c4-a6ec-2511af134188', committed: 30 }    
    [smart-import-sync] Sync complete {
      docIds: [ 'cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de' ], 
      transactionCount: 30
    }
    Response with status 200 in 533 ms.
    [ChimeNotifications] Error fetching obligations {
      userId: 'user_938a2e17...',
      error: 'column recurring_obligations.category does not exist'
    }
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    [logByteImportCompleted] Event logged for importRunId: import-cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de-1770568519546
    Response with status 200 in 553 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    [updateActivityEventWithIntegrity] Updated event 064a86e1-9901-49d6-936f-97a4b781c2d6 with integrity result 
    [crystalQueries] Error fetching Byte completion event: {
      code: 'PGRST205',
      details: null,
      hint: "Perhaps you meant the table 'public.crystal_analytics_runs'",
      message: "Could not find the table 'public.v_crystal_input_byte_event' in the schema cache"
    }
    [triggerCrystalAnalytics] Byte completion event not found for importRunId: import-cf19adc9-2a43-45bf-bfe2-1bf64c1bd1de-1770568519546
    Response with status 200 in 631 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 23832 ms.
    Response with status 200 in 591 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 595 ms.
    Request from ::1: GET /.netlify/functions/prime-live-stats?userId=938a2e17-0e49-45ff-bb98-810db46e5e65      
    Response with status 200 in 588 ms.
    .DEV) {
    const sidebars = document.querySelectorAll('[data-testid="desktop-sidebar"]');
    if (sidebars.length > 1) {
      console.warn('[DesktopSidebar] duplicate sidebars detected:', sidebars.length);
    }
  }
}, []);

// Add dashboard-page class to body when this component mounts
useEffect(() => {
  document.body.classList.add('dashboard-page');
  // Prevent body scrolling when dashboard is active
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.classList.remove('dashboard-page');
    // Restore body scrolling when leaving dashboard
    document.body.style.overflow = 'auto';
  };
}, []);


return (
  <>
    <div className="dashboard-layout h-screen bg-[#0f172a] text-white flex" data-page="dashboard" data-sidebar-collapsed={isSidebarCollapsed}>
      {/* Desktop sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <DesktopSidebar 
          collapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
        />
      </div>

      {/* Middle + Right rail */}
      <div className="flex flex-1 min-w-0">
        {/* Middle column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden w-full px-4 py-3 border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Crown className="h-4 w-4 text-white stroke-2" />
                  <div className="w-3 h-0.5 bg-white mt-0.5"></div>
                </div>
              </div>
              <span className="text-xl font-bold text-white">XspensesAI</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAIEmployeeRoomOpen(true)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                title="AI Employee Room"
              >
                <Bot className="h-5 w-5" />
              </button>
              <MobileNavInline />
            </div>
          </div>

          {/* Shared Dashboard Header - Desktop only */}
          <div className="hidden lg:block">
            <DashboardHeader />
          </div>
          
          <main className="flex-1 w-full overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* Right sidebar - Slide-out panel (user controls via button) */}
        <AITeamSlideOutPanel autoOpen={false} />
      </div>

{/* Prime Chatbot - BossBubble removed (consolidated into header launcher) */}

      {/* AI Employee Room */}
      <AIEmployeeRoom 
        isVisible={isAIEmployeeRoomOpen} 
        onClose={() => setIsAIEmployeeRoomOpen(false)} 
      />
    </div>
</>
);
}
