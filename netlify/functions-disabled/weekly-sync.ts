import type { Handler } from "@netlify/functions";
import { supabaseAdmin as supabase } from "./supabase";

function scoreFromWeights(x: {
  syncFresh: number;      // 0..1
  categorize: number;     // 0..1
  budget: number;         // 0..1
  goals: number;          // 0..1
  streak: number;         // 0..1
}) {
  const weights = { syncFresh:0.30, categorize:0.25, budget:0.20, goals:0.15, streak:0.10 };
  const raw = x.syncFresh*weights.syncFresh +
              x.categorize*weights.categorize +
              x.budget*weights.budget +
              x.goals*weights.goals +
              x.streak*weights.streak;
  return Math.round(raw * 900);
}

async function getStreak(userId: string) {
  const { data } = await supabase
    .from("financial_scores")
    .select("breakdown, calculated_at")
    .eq("user_id", userId)
    .order("calculated_at", { ascending:false })
    .limit(6);
  
  // Count consecutive snapshots with breakdown.hasNewData === true
  let s = 0;
  for (const row of data || []) {
    if (row.breakdown?.hasNewData) s++;
    else break;
  }
  return Math.min(s / 6, 1);
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const method = event.httpMethod;
    const payload = event.body ? JSON.parse(event.body) : {};
    const userId = (payload.userId || event.queryStringParameters?.userId) as string | undefined;

    if (!userId) {
      return { 
        statusCode: 400, 
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: "userId required" }) 
      };
    }

    // === Minimal metrics ===
    // 1) New data last 7 days?
    const since7 = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    
    // Check receipts (if table exists)
    let rcptCount = 0;
    try {
      const { count } = await supabase
        .from("receipts")
        .select("*", { count:"exact", head:true })
        .eq("user_id", userId)
        .gte("created_at", since7);
      rcptCount = count || 0;
    } catch (e) {
      console.log("Receipts table not found, skipping...");
    }

    // Check transactions (if table exists)
    let txCount7 = 0;
    try {
      const { count } = await supabase
        .from("transactions")
        .select("*", { count:"exact", head:true })
        .eq("user_id", userId)
        .gte("created_at", since7);
      txCount7 = count || 0;
    } catch (e) {
      console.log("Transactions table not found, skipping...");
    }

    // Check chat messages as activity indicator
    const { count: chatCount } = await supabase
      .from("chat_messages")
      .select("*", { count:"exact", head:true })
      .eq("user_id", userId)
      .gte("created_at", since7);

    const hasNewData = (rcptCount || 0) + (txCount7 || 0) + (chatCount || 0) > 0;

    // 2) Categorization completeness last 30d
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    let categorizeRate = 0;
    let total30 = 0;
    let categorized30 = 0;

    try {
      const { data: tx30 } = await supabase
        .from("transactions")
        .select("id, category")
        .eq("user_id", userId)
        .gte("created_at", since30);

      total30 = tx30?.length || 0;
      categorized30 = tx30?.filter(t => !!t.category)?.length || 0;
      categorizeRate = total30 ? categorized30/total30 : 0;
    } catch (e) {
      console.log("No transactions table, using chat activity for categorization score");
      // Use chat activity as a proxy
      categorizeRate = (chatCount || 0) > 5 ? 0.8 : 0.5;
    }

    // 3) Budget/Goals placeholders (wire to real tables later)
    const budgetScore = 0.8; // TODO: replace with real plan adherence
    const goalsScore  = 0.7; // TODO: replace with real goal pace

    // 4) Reliability streak
    const streak = await getStreak(userId);

    // Final score
    const score = scoreFromWeights({
      syncFresh: hasNewData ? 1 : 0,
      categorize: categorizeRate,
      budget: budgetScore,
      goals: goalsScore,
      streak
    });

    const breakdown = {
      hasNewData, 
      categorizeRate, 
      budgetScore, 
      goalsScore, 
      streak,
      activity: {
        receipts: rcptCount,
        transactions: txCount7,
        chatMessages: chatCount || 0
      }
    };

    // Persist score
    await supabase.from("financial_scores").insert({
      user_id: userId, 
      score, 
      breakdown
    });

    // XP & events
    if (hasNewData) {
      await supabase.from("user_xp").insert({ 
        user_id: userId, 
        delta: 15, 
        reason: "weekly_sync" 
      });
      
      await supabase.from("sync_events").insert({
        user_id: userId,
        kind: "success",
        title: "Weekly sync complete",
        details: `Activity detected: ${rcptCount} receipts, ${txCount7} transactions, ${chatCount} chat messages.`
      });
    } else {
      await supabase.from("sync_events").insert({
        user_id: userId,
        kind: "warning",
        title: "No new data this week",
        details: "Upload receipts, connect accounts, or chat with your AI team to keep your score healthy."
      });
    }

    // Award bonus XP for high scores
    if (score >= 700) {
      await supabase.from("user_xp").insert({
        user_id: userId,
        delta: 25,
        reason: "high_score_bonus"
      });
    }

    return { 
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, score, breakdown }) 
    };

  } catch (e: any) {
    console.error("weekly-sync error:", e);
    return { 
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: e.message }) 
    };
  }
};


