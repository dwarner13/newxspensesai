import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get user ID from request headers if available
    const userId = req.headers.get('x-user-id') || 'user-123';
    
    // Generate mock profile data
    const profileData = generateMockProfile(userId);

    return new Response(
      JSON.stringify(profileData),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

function generateMockProfile(userId: string) {
  // Default profile data
  const defaultProfile = {
    id: userId,
    display_name: "Darrell Warner",
    avatar_url: "https://placehold.co/100x100?text=DW",
    updated_at: new Date().toISOString(),
    role: "admin",
    last_login_at: new Date().toISOString(),
    transaction_count: 157,
    total_uploaded: 12450.75,
    account_created_at: "2025-01-15T00:00:00Z",
    xp: 1250,
    level: 12,
    streak: 7,
    last_activity_date: new Date().toISOString().split('T')[0],
    email_notifications: true,
    stripe_customer_id: "cus_mock123456",
    subscription_id: "sub_mock123456",
    subscription_status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user_source: "google_search",
    referrer_name: null,
    account_name: "Personal Workspace",
    time_zone: "America/Edmonton",
    date_locale: "en-US",
    currency: "USD",
    tax_included: "excluded",
    tax_system: "default",
    commitment_level: "committed",
    marketing_consent: true,
    accepted_ai_terms: true,
    onboarding_completed: true,
    onboarding_completed_at: "2025-01-16T00:00:00Z"
  };

  // Customize based on user ID if needed
  if (userId === 'user-123') {
    return defaultProfile;
  }

  // Generate a random profile for other user IDs
  const names = ["John Smith", "Jane Doe", "Alex Johnson", "Sam Wilson", "Taylor Swift"];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const initials = randomName.split(' ').map(n => n[0]).join('');
  
  return {
    ...defaultProfile,
    id: userId,
    display_name: randomName,
    avatar_url: `https://placehold.co/100x100?text=${initials}`,
    role: Math.random() > 0.8 ? "premium" : "free",
    xp: Math.floor(Math.random() * 2000),
    level: Math.floor(Math.random() * 20) + 1,
    streak: Math.floor(Math.random() * 14),
    transaction_count: Math.floor(Math.random() * 200),
  };
}