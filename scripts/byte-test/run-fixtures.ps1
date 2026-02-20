param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("bank", "credit-card", "scanned", "split-columns", "single-amount")]
  [string]$Folder
)

$targetDir = "scripts/byte-test/fixtures/$Folder"

if (-not (Test-Path $targetDir)) {
  Write-Error "[BYTE FIXTURES] Folder not found: $targetDir"
  exit 1
}

Write-Host "[BYTE FIXTURES] Running contract tests for: $targetDir"
npm run byte:test -- --contract --dir $targetDir --fail-on-review

Write-Host ""
Write-Host "[BYTE FIXTURES] Contract summary saved to:"
Write-Host "  scripts/byte-test/output/contract-report.json"

