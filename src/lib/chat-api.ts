import { postChat } from "@/lib/api/chat";

export async function postMessage({ employeeSlug, message, attachments }: any) {
  return postChat({ employeeSlug, message, attachments });
}

export async function resumeToolCall({ employeeSlug, toolCallId, result }: any) {
  return postChat({ employeeSlug, toolCallId, toolResult: result });
}
