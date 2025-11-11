# Brain Map - Mermaid Flow Diagrams

**Generated**: 2025-01-06

---

## Diagram 1: Chat Request Flow (Prime/Crystal/Tag/Byte)

```mermaid
flowchart LR
  UI[Chat Page] --> Hook[usePrimeChat Hook]
  Hook --> ChatFn[/.netlify/functions/chat]
  
  ChatFn --> RateLimit[Rate Limit Check]
  RateLimit --> PIIMask[PII Masking]
  PIIMask --> Guardrails[Guardrails Check]
  Guardrails --> Moderation[OpenAI Moderation]
  
  Moderation --> Session[Session Management]
  Session --> MemoryRecall[Memory Recall]
  MemoryRecall --> SummaryRecall[Session Summary Recall]
  SummaryRecall --> ContextFetch[Context Fetch]
  
  ContextFetch --> Router[prime_router.routeTurn]
  Router -->|Confidence < 0.6| LLMFallback[LLM Router Fallback]
  Router --> EmployeeSelect{Employee Selected}
  
  EmployeeSelect -->|prime| PrimeTools[Prime Tools: delegate]
  EmployeeSelect -->|crystal| CrystalTools[Crystal Tools: delegate]
  EmployeeSelect -->|tag| TagTools[Tag: No tools]
  EmployeeSelect -->|byte| ByteTools[Byte Tools: ocr_file]
  
  PrimeTools --> BuildPrompt[Build System Prompt]
  CrystalTools --> BuildPrompt
  TagTools --> BuildPrompt
  ByteTools --> BuildPrompt
  
  BuildPrompt --> ModelCall[OpenAI API Call]
  ModelCall -->|Tool Calls| ExecuteTools[Execute Tools]
  ExecuteTools --> Synthesis[Synthesis Response]
  ExecuteTools --> ExtractFacts[Extract Facts]
  ExtractFacts --> EmbedStore[Embed & Store]
  
  ModelCall -->|No Tools| DirectResponse[Direct Response]
  DirectResponse --> ExtractFacts
  
  Synthesis --> SaveMessage[Save Message]
  DirectResponse --> SaveMessage
  
  SaveMessage --> BuildHeaders[buildResponseHeaders]
  BuildHeaders --> SSE[SSE Stream Transform]
  SSE --> PIISSE[Mask PII in Stream]
  PIISSE --> UI
  
  SaveMessage --> SummaryGen[Generate Summary if Needed]
  SummaryGen --> EventLog[Log Orchestration Event]
```

---

## Diagram 2: OCR/Bank Ingestion Pipeline (Byte → Tag → Crystal → Prime)

```mermaid
sequenceDiagram
  participant UI as User Interface
  participant Byte as Byte Employee
  participant OCR as OCR Endpoint
  participant Providers as OCR Providers
  participant Parsers as OCR Parsers
  participant Tag as Tag Employee
  participant Crystal as Crystal Employee
  participant Prime as Prime Employee
  participant DB as Supabase

  UI->>Byte: Upload CSV/PDF/Image
  Byte->>OCR: POST /.netlify/functions/ocr
  
  OCR->>OCR: Input Validation<br/>(Size, MIME, Magic Bytes)
  OCR->>OCR: Pre-OCR Guardrails<br/>(applyGuardrails strict)
  
  OCR->>Providers: bestEffortOCR()
  Providers->>Providers: Try OCRSpace
  Providers->>Providers: Try Google Vision
  Providers->>Providers: Try Local Stub
  
  Providers-->>OCR: Extracted Text
  
  OCR->>OCR: Post-OCR Moderation
  OCR->>Parsers: Parse Text
  Parsers->>Parsers: parseInvoiceLike()
  Parsers->>Parsers: parseReceiptLike()
  Parsers->>Parsers: parseBankStatementLike()
  
  Parsers-->>OCR: ParsedDoc JSON
  
  OCR->>OCR: Normalize to Transactions
  OCR->>Tag: Categorize Transactions
  Tag->>Tag: Rule-Based Matching
  Tag->>Tag: AI Fallback (Tag LLM)
  
  Tag-->>OCR: Categories + Confidence
  
  OCR->>OCR: Vendor Matching<br/>(matchVendor)
  OCR->>OCR: Memory Learning<br/>(embedAndStore)
  OCR->>OCR: XP Awarding<br/>(awardXP)
  
  OCR->>DB: Save Transactions<br/>(insertTransaction)
  OCR->>DB: Save Items<br/>(insertItems)
  OCR->>DB: Link Document<br/>(linkToDocument)
  
  OCR->>Crystal: Transaction Summary
  Crystal->>Crystal: Generate Insights
  Crystal->>Crystal: Detect Anomalies
  
  Crystal->>Prime: Formatted Narrative
  Prime->>Prime: Synthesize Story
  
  Prime-->>UI: Final Response + Headers<br/>(X-OCR-Provider, X-OCR-Parse,<br/>X-Transactions-Saved, X-Categorizer,<br/>X-Vendor-Matched, X-XP-Awarded)
```

---

## Diagram 3: Memory Pipeline (Recall → Extract → Embed)

```mermaid
flowchart TD
  UserMsg[User Message] --> Mask[PII Masking]
  Mask --> Context[Build Context Query<br/>Last ~10 turns]
  
  Context --> Recall[memory.recall]
  Recall --> VectorDB[(Vector DB<br/>match_memory RPC)]
  
  VectorDB --> Facts[Recalled Facts<br/>Top K=12, minScore=0.25]
  Facts --> CapTokens1[Cap Tokens<br/>600 max]
  CapTokens1 --> MemoryBlock[Memory Context Block]
  
  UserMsg --> Model[LLM Model Call]
  MemoryBlock --> Model
  Model --> AssistantMsg[Assistant Response]
  
  AssistantMsg --> Extract[extractFactsFromMessages]
  Extract --> FactPairs[Fact Key:Value Pairs]
  
  FactPairs --> MaskFacts[Mask PII in Facts<br/>full strategy]
  MaskFacts --> Upsert[upsertFact]
  Upsert --> FactDB[(user_memory_facts<br/>Table)]
  
  Upsert --> Embed[embedAndStore]
  Embed --> OpenAIEmbed[OpenAI Embeddings API<br/>text-embedding-3-large]
  OpenAIEmbed --> EmbedDB[(memory_embeddings<br/>Table)]
  
  EmbedDB --> VectorDB
```

---

## Diagram 4: Guardrails & PII Flow

```mermaid
flowchart TD
  Input[Raw User Input] --> PII[MaskPII Function<br/>_shared/pii.ts]
  
  PII --> Detectors[20+ PII Detectors<br/>pii-patterns.ts]
  Detectors --> Financial[Financial Patterns<br/>PAN, Routing, Bank Accounts]
  Detectors --> Government[Government IDs<br/>SSN, SIN, Passport]
  Detectors --> Contact[Contact Info<br/>Email, Phone]
  Detectors --> Address[Addresses<br/>Street, Postal Codes]
  Detectors --> Network[Network<br/>IP Addresses]
  
  Financial --> Mask[Mask Strategy<br/>last4 / full / domain]
  Government --> Mask
  Contact --> Mask
  Address --> Mask
  Network --> Mask
  
  Mask --> MaskedText[Masked Text]
  MaskedText --> Guardrails[applyGuardrails]
  
  Guardrails --> Moderation[Content Moderation<br/>OpenAI API]
  Guardrails --> Jailbreak[Jailbreak Detection]
  Guardrails --> Logging[Log to guardrail_events]
  
  Moderation -->|Blocked| BlockedResponse[Block with 422<br/>X-Guardrails: blocked]
  Jailbreak -->|Blocked| BlockedResponse
  
  MaskedText --> Streaming[SSE Stream]
  Streaming --> SSEMask[SSE Mask Transform<br/>maskPII per chunk]
  SSEMask --> Client[Masked Stream to Client]
  
  MaskedText --> Storage[Masked Text Stored<br/>chat_messages.content_redacted]
```

---

## Diagram 5: Router Flow (Deterministic + LLM Fallback)

```mermaid
flowchart TD
  UserText[User Text] --> MaskText[PII Mask Input]
  MaskText --> Detect[detectIntent<br/>Deterministic Rules]
  
  Detect --> TagIntent{Tag Keywords?<br/>category, vendor, receipt}
  Detect --> CrystalIntent{Crystal Keywords?<br/>why, trend, analysis}
  Detect --> ByteIntent{Byte Keywords?<br/>code, OCR, parse}
  Detect --> FinanceIntent{Finance Keywords?<br/>money, payment}
  
  TagIntent -->|Yes| TagRoute[Route to Tag<br/>Confidence: 0.8]
  CrystalIntent -->|Yes| CrystalRoute[Route to Crystal<br/>Confidence: 0.8]
  ByteIntent -->|Yes| ByteRoute[Route to Byte<br/>Confidence: 0.8]
  
  FinanceIntent -->|Analysis focus| CrystalRoute
  FinanceIntent -->|General| PrimeRoute[Route to Prime<br/>Confidence: 0.6]
  
  TagRoute --> CheckConf[Confidence < 0.6?]
  CrystalRoute --> CheckConf
  ByteRoute --> CheckConf
  PrimeRoute --> CheckConf
  
  CheckConf -->|Yes| LLM[LLM Router Fallback<br/>gpt-4o-mini]
  LLM --> LLMResult[Parse JSON<br/>employee, reason, confidence]
  
  LLMResult -->|Higher confidence| Override[Override Route]
  Override --> LogEvent[Log Orchestration Event]
  
  CheckConf -->|No| LogEvent
  LogEvent --> Return[Return RouteResult]
```







