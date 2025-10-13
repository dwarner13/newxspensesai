export function nextUpdateText(last: Date | null) {
  const period = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastMs = last ? new Date(last).getTime() : (now - 2*24*60*60*1000);
  const remaining = Math.max(0, period - (now - lastMs));
  const days = Math.ceil(remaining / (24*60*60*1000));
  return days === 0 ? "updates today" : `updates in ${days} day${days>1?"s":""}`;
}




