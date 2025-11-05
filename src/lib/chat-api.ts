export async function postMessage({ employeeSlug, message, attachments }: any) {
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeSlug, message, attachments }),
  });
  return res.json();
}

export async function resumeToolCall({ employeeSlug, toolCallId, result }: any) {
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeSlug, toolCallId, toolResult: result }),
  });
  return res.json();
}
