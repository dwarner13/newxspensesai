export function safeLog(...args: any[]) {
  try { console.log(...args); } catch {}
}
