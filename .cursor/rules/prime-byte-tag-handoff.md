# Prime/Byte/Tag Handoff Rules

Canonical Cursor rule: `prime-byte-tag-handoff.mdc`

- Prime: narrator and user-facing voice.
- Byte: ingestion/OCR/parse.
- Tag: categorization + merchant memory.

Flow:
1. Prime acknowledges upload and explains next steps.
2. Byte reports parse status and extracted results (no raw OCR spam).
3. Tag reports categorization results, confidence, and flagged items.
4. Prime summarizes results, suggests next action, and offers to fix uncertain items.

Output must remain concise and bullet-structured.
