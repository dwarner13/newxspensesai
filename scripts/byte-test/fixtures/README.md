# BYTE Fixtures

Drop local test documents here for contract-gate validation.  
Do **not** commit real statements containing sensitive data.

Structure:

- `scripts/byte-test/fixtures/bank/`
- `scripts/byte-test/fixtures/credit-card/`
- `scripts/byte-test/fixtures/scanned/`
- `scripts/byte-test/fixtures/split-columns/`
- `scripts/byte-test/fixtures/single-amount/`

Recommended:

- `bank/`: monthly bank statements with opening/closing + deposits/withdrawals.
- `credit-card/`: statements with previous/new balance + due date + limit.
- `scanned/`: OCR-heavy image-based PDFs.
- `split-columns/`: statements with separate debit/credit columns.
- `single-amount/`: statements with one amount column and inferred direction.

Run in contract mode:

`npm run byte:test -- --dir scripts/byte-test/fixtures --contract`

