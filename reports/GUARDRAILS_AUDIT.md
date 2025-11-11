# Guardrails & PII Audit

**Generated**: 2025-01-06

---

## PII Patterns

### Pattern Library: `netlify/functions/_shared/pii-patterns.ts`

**Total Detectors**: 20+ patterns across 5 categories

#### Financial (6 detectors)
1. **PAN (Payment Card)** - `pan_generic`
   - Pattern: 13-19 digits with optional spaces/dashes
   - Mask: `last4` (default) or `full`
   - Compliance: PCI-DSS, GDPR, CCPA

2. **US Routing Number** - `routing_us`
   - Pattern: Exactly 9 digits with valid ABA prefix
   - Mask: `full` (full redaction)
   - Validation: Prefix must be 00-12, 21-32, 61-72, or 80
   - Compliance: GLBA

3. **US Bank Account** - `bank_account_us`
   - Pattern: 7-17 digits (excludes routing numbers and credit cards)
   - Mask: `last4` (default)
   - Exclusions: Routing numbers (9 digits), credit cards (13-19 with spaces)
   - Compliance: GLBA, CCPA

4. **Canadian Transit** - `transit_ca`
   - Pattern: 5 digits - 3 digits (e.g., `12345-678`)
   - Mask: `full`
   - Compliance: PIPEDA

5. **IBAN** - `iban`
   - Pattern: Country code (2) + check digits (2) + account (1-30 alphanumeric)
   - Mask: `last4` (default)
   - Compliance: GDPR, PSD2

6. **SWIFT/BIC** - `swift_bic`
   - Pattern: 8 or 11 characters (alphanumeric)
   - Mask: `full`
   - Compliance: GDPR

#### Government IDs (9 detectors)
1. **US SSN (with dashes)** - `ssn_us`
   - Pattern: `XXX-XX-XXXX`
   - Mask: `full`
   - Compliance: HIPAA, CCPA, IRS

2. **US SSN (no dashes)** - `ssn_us_no_dash`
   - Pattern: 9 digits starting with 0-8
   - Mask: `full`
   - Validation: First 3 digits can't be 000, 666, or 900-999
   - Compliance: HIPAA, CCPA

3. **US ITIN** - `itin_us`
   - Pattern: `9XX-XX-XXXX` (starts with 9)
   - Mask: `full`
   - Compliance: IRS, CCPA

4. **US EIN** - `ein_us`
   - Pattern: `XX-XXXXXXX`
   - Mask: `full`
   - Compliance: IRS

5. **Canadian SIN** - `sin_ca`
   - Pattern: `XXX-XXX-XXX`
   - Mask: `full`
   - Compliance: PIPEDA

6. **Driver License (generic)** - `dl_generic`
   - Pattern: 1-2 letters + 5-8 digits
   - Mask: `full`
   - Exclusion: Passport numbers (1 letter + 8 digits)
   - Compliance: GDPR, CCPA

7. **US Passport** - `passport_us`
   - Pattern: 1 letter + 8 digits
   - Mask: `full`
   - Compliance: Privacy Act

8. **UK NINO** - `uk_nino`
   - Pattern: 2 letters + 6 digits + 1 letter
   - Mask: `full`
   - Compliance: UK GDPR

9. **UK NHS** - `uk_nhs`
   - Pattern: `### ### ####` (with optional spaces)
   - Mask: `full`
   - Compliance: UK GDPR, NHS

#### Contact (2 detectors)
1. **Email** - `email`
   - Pattern: RFC 5322 compliant
   - Mask: `domain` (preserve domain) or `full`
   - Compliance: GDPR, CCPA, CAN-SPAM

2. **Phone (International)** - `phone_intl`
   - Pattern: Optional `+` + digits with spaces/dashes/parens
   - Mask: `full`
   - Exclusion: IPv4 addresses
   - Compliance: GDPR, CCPA, TCPA

#### Address (4 detectors)
1. **Street Address** - `street_address`
   - Pattern: Number + Street/Ave/Rd/Blvd/etc.
   - Mask: `full`
   - Compliance: GDPR, CCPA

2. **Canadian Postal Code** - `postal_ca`
   - Pattern: `A1A 1A1` (with optional space)
   - Mask: `full`
   - Compliance: PIPEDA

3. **US ZIP Code** - `zip_us`
   - Pattern: `#####` or `#####-####`
   - Mask: `full`
   - Compliance: CCPA

4. **Address Hint** - `address_hint`
   - Pattern: Keywords (unit, apt, suite, postal, zip)
   - Mask: None (context hint only)
   - Compliance: GDPR

#### Network (4 detectors)
1. **URL** - `url`
   - Pattern: `http(s)://` + domain + path
   - Mask: `full`
   - Compliance: GDPR, CCPA

2. **MAC Address** - `mac_address`
   - Pattern: `XX:XX:XX:XX:XX:XX` (colon or dash separated)
   - Mask: `full`
   - Compliance: GDPR

3. **IPv4** - `ip_v4`
   - Pattern: `XXX.XXX.XXX.XXX` (0-255 per octet)
   - Mask: `full`
   - Compliance: GDPR

4. **IPv6** - `ip_v6`
   - Pattern: Colon-separated hex (8 groups)
   - Mask: `full`
   - Compliance: GDPR

---

## Masking Strategies

### Strategies

1. **`last4`** (Default)
   - Preserves last 4 characters/digits
   - Used for: Credit cards, bank accounts, IBAN
   - Format: `****1111`

2. **`full`**
   - Complete redaction with type label
   - Used for: SSN, SIN, routing numbers, passports, addresses
   - Format: `[REDACTED:SSN]`

3. **`domain`** (Email only)
   - Preserves domain, masks local part
   - Format: `j***@example.com`

### Masking Points

1. **Pre-processing** (`chat.ts:1710`)
   - User input masked before any processing
   - Strategy: `last4`
   - Result stored in `masked` variable

2. **SSE Streaming** (`chat.ts:2611, 2649`)
   - PII masked per chunk during streaming
   - Strategy: `last4`
   - Transform: `sseMasker = (text) => maskPII(text, 'last4').masked`

3. **OCR Text** (`ocr.ts`)
   - OCR extracted text masked before parsing
   - Strategy: `full` (strict)

4. **Fact Storage** (`chat.ts:2301, 2392, 2539, 2720`)
   - Facts extracted from messages masked before storage
   - Strategy: `full`
   - Reason: Long-term storage requires full redaction

5. **Vendor Normalization** (`ocr_normalize.ts:277, 280`)
   - Merchant names and item names masked
   - Strategy: `last4`
   - Reason: UX balance (preserve partial context)

---

## Guardrail Events Logging

### Event Schema

**Table**: `guardrail_events`

**Fields**:
- `user_id` (UUID) - User who triggered the event
- `stage` (string) - Stage where event occurred (`chat`, `ocr`, `chat_moderation`)
- `rule_type` (string) - Type of rule (`pii_detected`, `openai_moderation`, `content_blocked`)
- `action` (string) - Action taken (`masked`, `blocked`, `allowed`)
- `severity` (integer) - Severity level (1-3: low, medium, high)
- `content_hash` (string) - SHA256 hash (first 24 chars) of content
- `meta` (JSONB) - Additional metadata (PII types, category scores, etc.)
- `created_at` (timestamp) - Event timestamp

### Logging Locations

1. **PII Detection** (`chat.ts:1726`)
   - Stage: `chat`
   - Rule: `pii_detected`
   - Action: `masked`
   - Severity: `2`
   - Meta: `{ pii_types: [...], count: N }`

2. **Moderation Block** (`chat.ts:1784`)
   - Stage: `chat_moderation`
   - Rule: `openai_moderation`
   - Action: `blocked`
   - Severity: `3`
   - Meta: `{ categories: {...}, category_scores: {...} }`

3. **OCR Pre-Check Block** (`ocr.ts:335`)
   - Stage: `ocr`
   - Rule: `guardrail_blocked`
   - Action: `blocked`
   - Severity: `3`
   - Meta: `{ blocked: true, stage: 'pre_ocr' }`

4. **OCR Post-Moderation** (`ocr.ts:394`)
   - Stage: `ocr`
   - Rule: `moderation_blocked`
   - Action: `blocked` (if flagged)
   - Severity: `3`
   - Meta: `{ provider: '...', blocked: true/false }`

5. **Unified Guardrails** (`guardrails.ts:468`)
   - Stage: Configurable (default: `chat`)
   - Rule: `guardrail_blocked`
   - Action: `blocked` or `allowed`
   - Severity: Based on preset (`strict` = 3, `balanced` = 2)

---

## SSE Masking

### Implementation

**File**: `netlify/functions/chat.ts:2620-2749`

**Features**:
- Real-time PII masking during SSE streaming
- Buffer management for complete SSE event parsing
- Chunk counting (`streamChunkCount`)
- Final text persistence (unmasked for storage, masked for client)

**Transform Pipeline**:
```
OpenAI SSE Stream → TransformStream → Buffer → Parse SSE Events → Mask PII → Encode → Client
```

**Masking Function**:
```typescript
const sseMasker = (text: string) => maskPII(text, 'last4').masked;
```

**Headers**:
- `X-Stream-Chunk-Count`: Set after streaming completes (if provided to `buildResponseHeaders`)

---

## Tests

### Test Coverage

**File**: `netlify/functions/_shared/__tests__/pii-patterns.test.ts`

**Coverage**:
- ✅ Financial PII (credit cards, bank accounts, routing, IBAN)
- ✅ Government IDs (SSN, SIN, NINO, passport, driver license)
- ✅ Contact info (email with domain strategy, phone)
- ✅ Address patterns (street, postal codes, ZIP)
- ✅ Network (IP addresses, MAC addresses, URLs)
- ✅ Masking strategies (`last4`, `full`, `domain`)
- ✅ False positive avoidance (SSN vs routing number, passport vs driver license)

**Gaps**:
- ⚠️ SSE masking transform not directly tested (tested indirectly via `sse_mask_transform.test.ts`)
- ⚠️ Guardrail events logging not unit tested (integration tested in `ocr_guardrails.test.ts`)

---

## Notable Gaps

1. **`buildResponseHeaders` Missing in `chat.ts`**
   - Referenced at lines 2341, 2478, 2580, 2793
   - Defined in `ocr.ts:23` but not shared
   - **Impact**: Headers may not be set correctly for non-streaming responses

2. **Guardrail Presets Not Fully Documented**
   - `balanced`, `strict`, `creative` presets exist but usage unclear
   - Default preset selection logic not documented

3. **PII Masking Performance**
   - No performance benchmarks for large text (10k+ characters)
   - Priority ordering helps but not validated

4. **Event Logging Non-Blocking**
   - All guardrail event logs are non-blocking (catch/log and continue)
   - No retry mechanism if Supabase insert fails

5. **Masked Text Storage**
   - `chat_messages.content_redacted` stores masked text
   - Original unmasked text not stored (by design, but limits recovery)
   - No audit trail for what was masked







