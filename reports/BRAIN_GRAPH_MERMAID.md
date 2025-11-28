# Brain Graph - Mermaid Flow Diagrams

**Generated**: 2025-01-06  
**Day 16: Brain & Guardrails Scanner**

---

## Diagram 1: Complete Chat Flow (All Employees)

```mermaid
flowchart TD
    Start[User Message] --> RateLimit[Rate Limiting]
    RateLimit --> PIIMask[maskPII - Always First]
    PIIMask --> Guardrails{Guardrails Check}
    
    Guardrails -->|OCR Path| OCRGuardrails[applyGuardrails]
    Guardrails -->|Chat Path| Session[Session Management]
    
    OCRGuardrails --> OCRResponse[OCR Processing]
    
    Session --> MemoryRecall[memory.recall - Context Retrieval]
    MemoryRecall --> Summary[Session Summary Recall]
    Summary --> Router[routeTurn - Employee Router]
    
    Router --> IntentDetection[detectIntent - Deterministic]
    IntentDetection -->|Confidence < 0.6| LLMFallback[LLM Router Fallback]
    IntentDetection --> EmployeeSelected{Employee Selected}
    
    LLMFallback --> EmployeeSelected
    
    EmployeeSelected -->|prime| Prime[Prime - Orchestrator]
    EmployeeSelected -->|crystal| Crystal[Crystal - Analytics]
    EmployeeSelected -->|tag| Tag[Tag - Categorization]
    EmployeeSelected -->|byte| Byte[Byte - OCR/Tools]
    EmployeeSelected -->|goalie| Goalie[Goalie - Goals]
    EmployeeSelected -->|automa| Automa[Automa - Automation]
    EmployeeSelected -->|blitz| Blitz[Blitz - Debt]
    EmployeeSelected -->|liberty| Liberty[Liberty - Freedom]
    EmployeeSelected -->|chime| Chime[Chime - Bills]
    EmployeeSelected -->|roundtable| Roundtable[Roundtable - Podcast]
    EmployeeSelected -->|serenity| Serenity[Serenity - Therapist]
    EmployeeSelected -->|harmony| Harmony[Harmony - Wellness]
    EmployeeSelected -->|wave| Wave[Wave - Spotify]
    EmployeeSelected -->|ledger| Ledger[Ledger - Tax]
    EmployeeSelected -->|intelia| Intelia[Intelia - BI]
    EmployeeSelected -->|dash| Dash[Dash - Analytics]
    EmployeeSelected -->|custodian| Custodian[Custodian - Settings]
    
    Prime --> BuildPrompt[Build System Prompt]
    Crystal --> BuildPrompt
    Tag --> BuildPrompt
    Byte --> BuildPrompt
    Goalie --> BuildPrompt
    Automa --> BuildPrompt
    Blitz --> BuildPrompt
    Liberty --> BuildPrompt
    Chime --> BuildPrompt
    Roundtable --> BuildPrompt
    Serenity --> BuildPrompt
    Harmony --> BuildPrompt
    Wave --> BuildPrompt
    Ledger --> BuildPrompt
    Intelia --> BuildPrompt
    Dash --> BuildPrompt
    Custodian --> BuildPrompt
    
    BuildPrompt --> LLM[OpenAI API Call]
    LLM -->|Tool Calls| ToolRouter[ToolRouter.runTool]
    ToolRouter -->|Check Capabilities| ExecuteTool[Execute Tool]
    ExecuteTool --> Synthesis[Synthesis Response]
    
    LLM -->|No Tools| DirectResponse[Direct Response]
    
    Synthesis --> MemoryExtract[memory.extractFactsFromMessages]
    DirectResponse --> MemoryExtract
    MemoryExtract --> MemoryStore[memory.embedAndStore]
    MemoryStore --> SaveMessage[Save Message to DB]
    
    SaveMessage --> BuildHeaders[buildResponseHeaders]
    BuildHeaders --> Response{Response Type}
    
    Response -->|Streaming| SSE[SSE Stream Response]
    Response -->|Non-Stream| JSON[JSON Response]
    
    SSE --> Headers[Headers: X-Employee, X-Memory-Hit, etc.]
    JSON --> Headers
    
    OCRResponse --> OCRHeaders[OCR Headers: X-OCR-Provider, etc.]
    OCRHeaders --> Byte[Byte via Tool Call]
```

---

## Diagram 2: Employee Router Decision Tree

```mermaid
flowchart TD
    Input[User Text] --> IntentDetect[detectIntent]
    
    IntentDetect --> TagKeywords{Tag Keywords?}
    TagKeywords -->|category, receipt, tax| TagEmployee[Tag Employee]
    
    IntentDetect --> CrystalKeywords{Crystal Keywords?}
    CrystalKeywords -->|analytics, trends, insights| CrystalEmployee[Crystal Employee]
    
    IntentDetect --> ByteKeywords{Byte Keywords?}
    ByteKeywords -->|code, ocr, parse| ByteEmployee[Byte Employee]
    
    IntentDetect --> GoalieKeywords{Goalie Keywords?}
    GoalieKeywords -->|goal, reminder| GoalieEmployee[Goalie Employee]
    
    IntentDetect --> AutomaKeywords{Automa Keywords?}
    AutomaKeywords -->|automation, rule| AutomaEmployee[Automa Employee]
    
    IntentDetect --> BlitzKeywords{Blitz Keywords?}
    BlitzKeywords -->|debt, payoff| BlitzEmployee[Blitz Employee]
    
    IntentDetect --> LibertyKeywords{Liberty Keywords?}
    LibertyKeywords -->|freedom, retirement| LibertyEmployee[Liberty Employee]
    
    IntentDetect --> ChimeKeywords{Chime Keywords?}
    ChimeKeywords -->|bill, payment| ChimeEmployee[Chime Employee]
    
    IntentDetect --> RoundtableKeywords{Roundtable Keywords?}
    RoundtableKeywords -->|podcast, audio| RoundtableEmployee[Roundtable Employee]
    
    IntentDetect --> SerenityKeywords{Serenity Keywords?}
    SerenityKeywords -->|therapist, stress| SerenityEmployee[Serenity Employee]
    
    IntentDetect --> HarmonyKeywords{Harmony Keywords?}
    HarmonyKeywords -->|wellness, health| HarmonyEmployee[Harmony Employee]
    
    IntentDetect --> WaveKeywords{Wave Keywords?}
    WaveKeywords -->|spotify, music| WaveEmployee[Wave Employee]
    
    IntentDetect --> LedgerKeywords{Ledger Keywords?}
    LedgerKeywords -->|tax, deduction| LedgerEmployee[Ledger Employee]
    
    IntentDetect --> InteliaKeywords{Intelia Keywords?}
    InteliaKeywords -->|bi, dashboard| InteliaEmployee[Intelia Employee]
    
    IntentDetect --> CustodianKeywords{Custodian Keywords?}
    CustodianKeywords -->|settings, config| CustodianEmployee[Custodian Employee]
    
    IntentDetect -->|Default| PrimeEmployee[Prime Employee - Default]
    
    TagEmployee --> ConfidenceCheck{Confidence >= 0.6?}
    CrystalEmployee --> ConfidenceCheck
    ByteEmployee --> ConfidenceCheck
    GoalieEmployee --> ConfidenceCheck
    AutomaEmployee --> ConfidenceCheck
    BlitzEmployee --> ConfidenceCheck
    LibertyEmployee --> ConfidenceCheck
    ChimeEmployee --> ConfidenceCheck
    RoundtableEmployee --> ConfidenceCheck
    SerenityEmployee --> ConfidenceCheck
    HarmonyEmployee --> ConfidenceCheck
    WaveEmployee --> ConfidenceCheck
    LedgerEmployee --> ConfidenceCheck
    InteliaEmployee --> ConfidenceCheck
    CustodianEmployee --> ConfidenceCheck
    PrimeEmployee --> ConfidenceCheck
    
    ConfidenceCheck -->|No| LLMRoute[LLM Router Fallback]
    ConfidenceCheck -->|Yes| RouteResult[Route Result: Employee + Confidence]
    LLMRoute --> RouteResult
    
    RouteResult --> LogEvent[logOrchestrationEvent]
    LogEvent --> FinalRoute[Final Employee Selected]
```

---

## Diagram 3: Memory Pipeline Flow

```mermaid
flowchart TD
    UserMessage[User Message] --> MaskPII[maskPII - Redact PII]
    MaskPII --> AssistantResponse[Assistant Response]
    
    AssistantResponse --> ExtractFacts[memory.extractFactsFromMessages]
    ExtractFacts --> FactsArray[Extracted Facts Array]
    
    FactsArray --> FilterFacts{Filter Facts}
    FilterFacts -->|Confidence >= 0.6| ValidFacts[Valid Facts]
    FilterFacts -->|Confidence < 0.6| RejectFacts[Reject Low Confidence]
    
    ValidFacts --> MaskFact[maskPII - Mask Fact Text]
    MaskFact --> UpsertFact[memory.upsertFact - Store Fact]
    UpsertFact --> GenerateEmbedding[memory.embedAndStore - Generate Embedding]
    GenerateEmbedding --> StoreEmbedding[Store in memory_embeddings]
    
    StoreEmbedding --> MemoryComplete[Memory Stored ✅]
    
    style MemoryComplete fill:#90EE90
```

---

## Diagram 4: Guardrails Pipeline Flow

```mermaid
flowchart TD
    Input[Raw User Input] --> InputValidation{Input Valid?}
    InputValidation -->|No| Error[Return Error]
    InputValidation -->|Yes| PIIDetection[maskPII - PII Detection]
    
    PIIDetection --> PIIFound{PII Found?}
    PIIFound -->|Yes| MaskText[Mask PII Text]
    PIIFound -->|No| Continue1[Continue]
    MaskText --> LogPII[logGuardrailEvent - PII]
    LogPII --> Continue1
    
    Continue1 --> ModerationCheck{Moderation Enabled?}
    ModerationCheck -->|Yes| OpenAIModeration[OpenAI Moderation API]
    ModerationCheck -->|No| Continue2[Continue]
    
    OpenAIModeration --> ModerationResult{Flagged?}
    ModerationResult -->|Yes| BlockModeration[Block - Return Error]
    ModerationResult -->|No| LogModeration[logGuardrailEvent - Moderation]
    LogModeration --> Continue2
    
    Continue2 --> JailbreakCheck{Jailbreak Detection Enabled?}
    JailbreakCheck -->|Yes| JailbreakDetection[Jailbreak Detection - GPT-4o-mini]
    JailbreakCheck -->|No| Continue3[Continue]
    
    JailbreakDetection --> JailbreakResult{Detected?}
    JailbreakResult -->|Yes| BlockJailbreak[Block - Return Error]
    JailbreakResult -->|No| LogJailbreak[logGuardrailEvent - Jailbreak]
    LogJailbreak --> Continue3
    
    Continue3 --> GuardrailsPass[✅ Guardrails Passed]
    
    style GuardrailsPass fill:#90EE90
    style BlockModeration fill:#FFB6C1
    style BlockJailbreak fill:#FFB6C1
```

---

## Diagram 5: Header Generation Flow

```mermaid
flowchart TD
    ResponsePath{Response Path} --> ToolCall[Tool Call Path]
    ResponsePath --> NoTool[No Tool Path]
    ResponsePath --> SSE[SSE Stream Path]
    ResponsePath --> OCR[OCR Path]
    
    ToolCall --> BuildHeaders1[buildResponseHeaders]
    NoTool --> BuildHeaders2[buildResponseHeaders]
    SSE --> BuildHeaders3[buildResponseHeaders]
    OCR --> BuildHeaders4[buildResponseHeaders]
    
    BuildHeaders1 --> CoreHeaders1[Core Headers:<br/>X-Guardrails<br/>X-PII-Mask<br/>X-Memory-Hit<br/>X-Memory-Count<br/>X-Session-Summary<br/>X-Employee<br/>X-Route-Confidence]
    
    BuildHeaders2 --> CoreHeaders2[Core Headers]
    BuildHeaders3 --> CoreHeaders3[Core Headers +<br/>X-Stream-Chunk-Count]
    BuildHeaders4 --> CoreHeaders4[Core Headers +<br/>X-OCR-Provider<br/>X-OCR-Parse<br/>X-Transactions-Saved]
    
    CoreHeaders1 --> MergeHeaders1[Merge Additional Headers]
    CoreHeaders2 --> MergeHeaders2[Merge Additional Headers]
    CoreHeaders3 --> MergeHeaders3[Merge Additional Headers]
    CoreHeaders4 --> MergeHeaders4[Merge Additional Headers]
    
    MergeHeaders1 --> FinalHeaders1[Final Response Headers]
    MergeHeaders2 --> FinalHeaders2[Final Response Headers]
    MergeHeaders3 --> FinalHeaders3[Final Response Headers]
    MergeHeaders4 --> FinalHeaders4[Final Response Headers]
    
    FinalHeaders1 --> Response1[JSON Response]
    FinalHeaders2 --> Response2[JSON Response]
    FinalHeaders3 --> Response3[SSE Stream Response]
    FinalHeaders4 --> Response4[JSON Response]
```

---

## Diagram 6: Tool Router Flow (Day 16)

```mermaid
flowchart TD
    EmployeeRequest[Employee Requests Tool] --> CheckCapabilities{Check CAPABILITIES}
    
    CheckCapabilities -->|Tool Allowed| ExecuteTool[Execute Tool]
    CheckCapabilities -->|Tool Not Allowed| RejectTool[Reject - Throw Error]
    
    ExecuteTool --> ToolType{Tool Type?}
    
    ToolType -->|Superbrain| SuperbrainModule[Superbrain Module:<br/>bank_parse<br/>vendor_normalize<br/>categorize<br/>anomaly_detect<br/>story<br/>therapist]
    
    ToolType -->|Goal Tools| GoalModule[Goal Module:<br/>create_goal<br/>update_goal<br/>set_reminder]
    
    ToolType -->|Debt Tools| DebtModule[Debt Module:<br/>calculate_debt_payoff<br/>optimize_payment_order]
    
    ToolType -->|Tax Tools| TaxModule[Tax Module:<br/>lookup_tax_deduction<br/>calculate_tax]
    
    ToolType -->|Automation Tools| AutomationModule[Automation Module:<br/>create_rule<br/>enable_automation]
    
    ToolType -->|Bill Tools| BillModule[Bill Module:<br/>create_bill<br/>pay_bill]
    
    SuperbrainModule --> ToolResult[Tool Result]
    GoalModule --> ToolResult
    DebtModule --> ToolResult
    TaxModule --> ToolResult
    AutomationModule --> ToolResult
    BillModule --> ToolResult
    
    ToolResult --> MergeHeaders[Merge Tool Headers]
    MergeHeaders --> ReturnResult[Return Result to Employee]
    
    style ExecuteTool fill:#90EE90
    style RejectTool fill:#FFB6C1
```

---

## Diagram 7: Complete Employee Ecosystem

```mermaid
graph TB
    subgraph "Entry Point"
        ChatEndpoint[/.netlify/functions/chat]
    end
    
    subgraph "Router Layer"
        Router[prime_router.routeTurn]
        Intent[detectIntent]
    end
    
    subgraph "Memory Layer"
        Recall[memory.recall]
        Extract[memory.extractFactsFromMessages]
        Store[memory.embedAndStore]
    end
    
    subgraph "Guardrails Layer"
        PIIMask[maskPII]
        Guardrails[applyGuardrails]
        Logging[logGuardrailEvent]
    end
    
    subgraph "Employee Pool"
        Prime[Prime 👑]
        Crystal[Crystal 🔮]
        Tag[Tag 🏷️]
        Byte[Byte 📄]
        Goalie[Goalie 🥅]
        Automa[Automa ⚙️]
        Blitz[Blitz 💳]
        Liberty[Liberty 🗽]
        Chime[Chime 🔔]
        Roundtable[Roundtable 🎙️]
        Serenity[Serenity 🌸]
        Harmony[Harmony 💚]
        Wave[Wave 🎵]
        Ledger[Ledger 📊]
        Intelia[Intelia 📈]
        Dash[Dash 📉]
        Custodian[Custodian ⚙️]
    end
    
    subgraph "Tool Layer"
        ToolRouter[ToolRouter.runTool]
        Capabilities[CAPABILITIES Map]
        Superbrain[Superbrain Modules]
        GoalTools[Goal Tools]
        DebtTools[Debt Tools]
        TaxTools[Tax Tools]
        AutoTools[Automation Tools]
        BillTools[Bill Tools]
    end
    
    subgraph "Response Layer"
        Headers[buildResponseHeaders]
        JSON[JSON Response]
        SSE[SSE Stream]
    end
    
    ChatEndpoint --> Router
    Router --> Intent
    Intent --> Prime
    Intent --> Crystal
    Intent --> Tag
    Intent --> Byte
    Intent --> Goalie
    Intent --> Automa
    Intent --> Blitz
    Intent --> Liberty
    Intent --> Chime
    Intent --> Roundtable
    Intent --> Serenity
    Intent --> Harmony
    Intent --> Wave
    Intent --> Ledger
    Intent --> Intelia
    Intent --> Dash
    Intent --> Custodian
    
    ChatEndpoint --> PIIMask
    ChatEndpoint --> Guardrails
    ChatEndpoint --> Recall
    ChatEndpoint --> Extract
    ChatEndpoint --> Store
    
    Prime --> ToolRouter
    Crystal --> ToolRouter
    Tag --> ToolRouter
    Byte --> ToolRouter
    Goalie --> ToolRouter
    Automa --> ToolRouter
    Blitz --> ToolRouter
    Ledger --> ToolRouter
    Chime --> ToolRouter
    Serenity --> ToolRouter
    Roundtable --> ToolRouter
    
    ToolRouter --> Capabilities
    Capabilities --> Superbrain
    Capabilities --> GoalTools
    Capabilities --> DebtTools
    Capabilities --> TaxTools
    Capabilities --> AutoTools
    Capabilities --> BillTools
    
    Prime --> Headers
    Crystal --> Headers
    Tag --> Headers
    Byte --> Headers
    Headers --> JSON
    Headers --> SSE
    
    style ChatEndpoint fill:#FFE4B5
    style Router fill:#E0E0E0
    style Headers fill:#90EE90
```

---

**Status**: ✅ All flow diagrams generated for Day 16 brain scan.

















