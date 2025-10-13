export async function fetchLatestScore(userId: string) {
  const res = await fetch(`/api/latest-score?userId=${encodeURIComponent(userId)}`);
  if (res.ok) return res.json();
  // fallback to direct supabase via edge if you have it; otherwise return null
  return null;
}

export async function runWeeklySync(userId: string) {
  const res = await fetch("/.netlify/functions/weekly-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error("Sync failed");
  return res.json();
}




