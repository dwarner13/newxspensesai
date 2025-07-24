/*
  # Add receipt URL to transactions

  1. Changes
    - Add receipt_url column to transactions table to store receipt image/PDF URLs
    - This enables linking transactions to their source receipts for viewing

  2. Security
    - Column is nullable since not all transactions come from receipts
    - Existing RLS policies will handle access control
*/

-- Add receipt_url column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS receipt_url text;

-- Add index for performance when filtering by receipt URL
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url 
ON transactions(receipt_url) WHERE receipt_url IS NOT NULL;

-- Update existing receipt-based transactions to link to their receipt images
UPDATE transactions 
SET receipt_url = receipts.image_url
FROM receipts 
WHERE transactions.user_id = receipts.user_id 
AND transactions.description LIKE '%' || COALESCE(receipts.extracted_data->>'vendor', 'Receipt') || '%'
AND transactions.receipt_url IS NULL
AND receipts.processing_status = 'completed';