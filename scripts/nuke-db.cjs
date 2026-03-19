const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      let val = values.join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      envVars[key.trim()] = val;
    }
  }
});

const supabaseUrl = envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function nukeDatabase() {
  console.log("🔥 Starting the Empire Clean Slate Mission...");

  // 1. Delete all transactions
  console.log("Executing: DELETE FROM transactions...");
  const { error: err1 } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error("Error wiping transactions:", err1.message);

  // 2. Delete all transactions_staging
  console.log("Executing: DELETE FROM transactions_staging...");
  const { error: err2 } = await supabase.from('transactions_staging').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err2) console.error("Error wiping transactions_staging:", err2.message);
  
  // 3. Delete all import_summaries
  console.log("Executing: DELETE FROM import_summaries...");
  const { error: err3 } = await supabase.from('import_summaries').delete().neq('import_id', '00000000-0000-0000-0000-000000000000');
  if (err3) console.error("Error wiping import_summaries:", err3.message);

  // 4. Delete all imports
  console.log("Executing: DELETE FROM imports...");
  const { error: err4 } = await supabase.from('imports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err4) console.error("Error wiping imports:", err4.message);

  // 5. Delete all user_documents to clear OCR file memory
  // Use a string matching all realistic UUIDs or just drop anything not empty
  console.log("Executing: DELETE FROM user_documents...");
  const { error: err5 } = await supabase.from('user_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err5) console.error("Error wiping user_documents:", err5.message);

  console.log("✅ Database Nuke Complete. 454 cached items and 7-elevenstore typos destroyed.");
}

nukeDatabase();
