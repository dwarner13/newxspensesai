# Netlify environment setup (no secrets committed)

- Required server keys:
  - OPENAI_API_KEY
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE

- Optional client keys (Vite):
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_PRIME_CHAT_V2 (default true)

Commands:

- netlify env:set OPENAI_API_KEY "<your-openai-key>"
- netlify env:set SUPABASE_URL "<your-supabase-url>"
- netlify env:set SUPABASE_SERVICE_ROLE "<your-service-role>"
- netlify env:set VITE_SUPABASE_URL "<your-supabase-url>"
- netlify env:set VITE_SUPABASE_ANON_KEY "<your-anon-key>"
- netlify env:set VITE_PRIME_CHAT_V2 "true"

Local dev: create `.env.local` with these keys. Do not commit secrets.



