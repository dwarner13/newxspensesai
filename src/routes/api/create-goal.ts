import { supabase } from '../../lib/supabase';

export const POST = async ({ request }: { request: Request }) => {
  const goal = await request.json();

  const { error } = await supabase.from('personal_goals').insert([goal]);
  if (error) return new Response(JSON.stringify({ error }), { status: 500});

  return new Response(JSON.stringify({ success: true }), { status: 200});
}; 