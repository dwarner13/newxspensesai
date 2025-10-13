export function sanitizeUserInput(s: string, maxChars = 8000) {
  if (!s) return ''
  const trimmed = s.slice(0, maxChars)           // hard cap
  return trimmed.replace(/\u0000/g, '')          // strip null bytes (can cause issues)
}




