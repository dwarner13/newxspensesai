$file = "C:\dev\project-bolt-fixed\netlify\functions\apply-category-rules.ts"

$old = "  // Credit card payments
  { key: 'CAPITAL ONE PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'RBC PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },"

$new = "  // Credit card payments
  { key: 'MASTERCARD', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'VISA PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'CAPITAL ONE PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'RBC PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },
  { key: 'PAYMENT', category: 'Transfers', subcategory: 'Credit Card Payment' },"

(Get-Content $file -Raw).Replace($old, $new) | Set-Content $file -NoNewline
Write-Host "Done. MASTERCARD + VISA PAYMENT rules added."
