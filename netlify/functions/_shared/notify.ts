import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function notify(userId: string, payload: {
  type: 'import' | 'review' | 'system';
  title: string;
  body?: string;
  href?: string;
  meta?: any;
}) {
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.from('user_notifications').insert({
    user_id: userId,
    ...payload,
    created_at: new Date().toISOString()
  });
}

