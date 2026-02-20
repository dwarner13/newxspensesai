#!/usr/bin/env bash
set -euo pipefail

FOLDER="${1:-}"

if [[ -z "$FOLDER" ]]; then
  echo "Usage: ./scripts/byte-test/run-fixtures.sh <bank|credit-card|scanned|split-columns|single-amount>"
  exit 1
fi

BASE_DIR="scripts/byte-test/fixtures"
TARGET_DIR="${BASE_DIR}/${FOLDER}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "[BYTE FIXTURES] Folder not found: $TARGET_DIR"
  exit 1
fi

echo "[BYTE FIXTURES] Running contract tests for: $TARGET_DIR"
npm run byte:test -- --contract --dir "$TARGET_DIR" --fail-on-review

echo
echo "[BYTE FIXTURES] Contract summary saved to:"
echo "  scripts/byte-test/output/contract-report.json"

