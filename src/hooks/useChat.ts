import * as React from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "../contexts/AuthContext";
import { postMessage, resumeToolCall } from "../lib/chat-api"; // new
import { useLocalStorage } from "./useLocalStorage";

export function useChat(employeeSlug: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useLocalStorage<any[]>(`chat:${employeeSlug}`, []);
  const [pendingTool, setPendingTool] = React.useState<null | { id: string; name: string }>(null);

  async function send(text: string, opts?: { attachments?: File[] }) {
    const id = uuid();

    const userMessage = {
      id,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((m) => [...m, userMessage]);

    // Call backend (non-streaming for this simple wrapper)
    try {
      const resp = await postMessage({
        userId: user?.id || undefined,
        employeeSlug,
        message: text,
        sessionId: null,
        stream: false,
      });

      if (resp?.messages) {
        setMessages((m) => [...m, ...resp.messages]);
      }
    } catch (e) {
      console.error('send error', e);
    }
  }

  // resumable tool-call flow
  async function handleToolResponse(args: { toolCallId: string; result: unknown }) {
    const res = await resumeToolCall({
      employeeSlug,
      toolCallId: args.toolCallId,
      result: args.result,
    });
    if (res?.messages) setMessages((m) => [...m, ...res.messages]);
    setPendingTool(null);
  }

  function markPendingTool(call: { id: string; name: string }) {
    setPendingTool(call);
  }

  return {
    messages,
    send,
    pendingTool,
    markPendingTool,
    handleToolResponse,
  };
}

export default useChat;
