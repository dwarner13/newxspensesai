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

async function checkCols() {
  console.log("Checking transactions table for merchant_name...");
  const { error: e1 } = await supabase.from('transactions').select('merchant_name').limit(1);
  if (e1) {
    console.log('❌ merchant_name is MISSING:', e1.message);
  } else {
    console.log('✅ merchant_name EXISTS in the database.');
  }

  console.log("Checking chat_messages table for client_message_id...");
  const { error: e2 } = await supabase.from('chat_messages').select('client_message_id').limit(1);
  if (e2) {
    console.log('❌ client_message_id is MISSING:', e2.message);
  } else {
    console.log('✅ client_message_id EXISTS in the database.');
  }
}

checkCols();
