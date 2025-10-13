export async function fetchAlerts(userId: string) {
  const res = await fetch(`/api/alerts?userId=${encodeURIComponent(userId)}`);
  if (res.ok) return res.json();
  return { items: [] };
}

export async function markAlertRead(alertId: string) {
  const res = await fetch(`/api/alerts/${alertId}/read`, {
    method: 'POST'
  });
  return res.ok;
}




