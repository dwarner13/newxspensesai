Day 2: PII Masking Unification - Scan Report
===============================================
Generated: 2025-01-XX

OBJECTIVE
---------
Consolidate 4+ PII masking implementations into single source of truth:
`netlify/functions/_shared/pii-patterns.ts`

CURRENT PII UTILITIES
---------------------

1. ✅ CANONICAL MODULE (Keep as source of truth)
   File: netlify/functions/_shared/pii-patterns.ts
   Status: Comprehensive (30+ detectors)
   Categories:
   - Financial: 6 detectors (cards, bank accounts, IBAN, SWIFT)
   - Government: 9 detectors (SSN, SIN, passports, licenses, NHS)
   - Contact: 4 detectors (email, phone, IP)
   - Address: 4 detectors (street, postal, ZIP)
   - Network: 4 detectors (URLs, MAC)
   - Crypto: 2 detectors (BTC, ETH)
   Export: PII_DETECTORS, getDetector(), getDetectorsByCategory()

2. ✅ WRAPPER MODULE (Keep as main API)
   File: netlify/functions/_shared/pii.ts
   Status: Uses pii-patterns.ts internally
   Exports: maskPII(), containsPII(), countPII(), maskSpecificPII()
   Usage: Primary API for PII masking

3. ⚠️ CHAT RUNTIME REDACTION (Needs update)
   File: chat_runtime/redaction.ts
   Status: Has own patterns (7 types)
   Patterns: creditCard, ssn, email, phone, zip, ip, accountNumber
   Action: Replace with import from pii.ts wrapper

4. ⚠️ WORKER REDACTION (Needs update)
   File: worker/src/redaction/patterns.ts
   Status: Has own patterns (9 types)
   Patterns: creditCard, ssn, email, phone, postalCode, accountNumber, routingNumber, iban, driversLicense, passport
   Action: Replace with import from pii.ts wrapper

5. ⚠️ GUARDRAILS REDACTION (Needs update)
   File: netlify/functions/_shared/guardrails.ts
   Status: Has inline redactPII() function (40+ patterns)
   Lines: 127-381 (redactPII function)
   Action: Remove duplicate redactPII(), import maskPII() from pii.ts

6. ⚠️ SERVER REDACTION (Needs check)
   File: src/server/redact.ts
   Status: Has redactText() function
   Usage: Used by src/agent/kernel.ts
   Action: Check if needs update to use pii.ts

7. ⚠️ WORKER LOGGING (Needs check)
   File: worker/src/logging.ts
   Status: Has redactPII() function (basic patterns)
   Lines: 18-34
   Action: Check if needs update to use pii.ts

CALL SITES ANALYSIS
-------------------

Files using maskPII from pii.ts (CORRECT):
✓ netlify/functions/chat.ts (Line 26, 1557, 2055)
✓ netlify/functions/transactions-list.ts (Line 41, 113)
✓ src/components/chat/PrimeUpload.tsx (Line 3, 109)

Files using redactPII/redactText (NEEDS UPDATE):
⚠ chat_runtime/redaction.ts - Own implementation
⚠ worker/src/redaction/patterns.ts - Own implementation
⚠ netlify/functions/_shared/guardrails.ts - Own redactPII() function
⚠ src/server/redact.ts - Own redactText() function
⚠ src/agent/kernel.ts - Uses src/server/redact.ts
⚠ worker/src/logging.ts - Own redactPII() function

Files importing from wrong location:
⚠ src/components/chat/PrimeUpload.tsx - Uses "../../lib/pii" (should use _shared/pii)

PATTERN COMPARISON
------------------

chat_runtime/redaction.ts patterns (7):
- creditCard: /\b(?:\d{4}[\s-]?){3}\d{1,4}\b/g (with Luhn validation)
- ssn: /\b\d{3}-\d{2}-\d{4}\b/g
- email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
- phone: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g
- zip: /\b\d{5}(?:-\d{4})?\b/g
- ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g (with validation)
- accountNumber: /\b\d{9,19}\b/g

worker/src/redaction/patterns.ts patterns (9):
- creditCard: /\b(?:\d[ -]*?){13,19}\b/g
- ssn: /\b\d{3}-\d{2}-\d{4}\b/g
- email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
- phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g
- postalCode: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/g (CA)
- accountNumber: /\b\d{9,19}\b/g
- routingNumber: /\b\d{9}\b/g
- iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g
- driversLicense: /\b[A-Z]\d{7,8}\b/g
- passport: /\b[A-Z]{1,2}\d{6,9}\b/g

pii-patterns.ts patterns (30+):
- More comprehensive, includes all above plus:
  - US SSN variants (with/without dashes)
  - ITIN, EIN
  - Canadian SIN
  - UK NINO, NHS
  - EU patterns (Spain, Italy, Poland, Finland)
  - Asia-Pacific (Singapore, Australia, India)
  - Street addresses
  - US ZIP codes
  - Canadian postal codes
  - IP v4 and v6
  - URLs, MAC addresses
  - Crypto addresses

CONCLUSION
----------
pii-patterns.ts is the most comprehensive and should be the single source of truth.
All other implementations should import and use maskPII() from pii.ts wrapper.

ACTION ITEMS
------------
1. ✅ pii-patterns.ts is canonical (already exists, 30+ detectors)
2. ✅ pii.ts wrapper is correct (already uses pii-patterns.ts)
3. ⚠️ Update chat_runtime/redaction.ts to use pii.ts
4. ⚠️ Update worker/src/redaction/patterns.ts to use pii.ts
5. ⚠️ Update guardrails.ts to use pii.ts instead of own redactPII()
6. ⚠️ Check src/server/redact.ts (may need update)
7. ⚠️ Check worker/src/logging.ts (may need update)
8. ⚠️ Fix src/components/chat/PrimeUpload.tsx import path

