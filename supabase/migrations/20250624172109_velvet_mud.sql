/*
  # Add onboarding fields to profiles table

  1. New Fields
    - `user_source` - How the user found XspensesAI
    - `referrer_name` - Name of person who referred them
    - `account_name` - Account display name
    - `time_zone` - User's time zone
    - `date_locale` - Date format locale
    - `currency` - Preferred currency
    - `tax_included` - Whether tax is included in amounts
    - `tax_system` - Tax system to use
    - `commitment_level` - User's commitment to financial improvement
    - `marketing_consent` - Whether user consents to marketing
    - `accepted_ai_terms` - Whether user accepted AI terms
    - `onboarding_completed` - Whether onboarding is complete
    - `onboarding_completed_at` - When onboarding was completed
*/

-- Add onboarding fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_source text,
ADD COLUMN IF NOT EXISTS referrer_name text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS time_zone text,
ADD COLUMN IF NOT EXISTS date_locale text,
ADD COLUMN IF NOT EXISTS currency text,
ADD COLUMN IF NOT EXISTS tax_included text,
ADD COLUMN IF NOT EXISTS tax_system text,
ADD COLUMN IF NOT EXISTS commitment_level text,
ADD COLUMN IF NOT EXISTS marketing_consent boolean,
ADD COLUMN IF NOT EXISTS accepted_ai_terms boolean,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;