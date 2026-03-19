import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reloadSchema() {
  console.log("Triggering schema reload...");
  
  // First, verify the columns actually exist in the table using a safe query
  const { data: cols, error: colError } = await supabase
    .from('transactions')
    .select('merchant_name')
    .limit(1);
    
  if (colError) {
    console.error("Column check failed. The column might actually be missing:", colError.message);
  } else {
    console.log("merchant_name column verified in DB.");
  }

  const { data: cols2, error: colError2 } = await supabase
    .from('chat_messages')
    .select('client_message_id')
    .limit(1);
    
  if (colError2) {
    console.error("Column check failed for chat_messages:", colError2.message);
  } else {
    console.log("client_message_id column verified in DB.");
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept-Profile': 'public'
    }
  });
  console.log("REST API ping status:", res.status);
}

reloadSchema();
