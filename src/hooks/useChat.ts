import * as React from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "../contexts/AuthContext";
import { postMessage, resumeToolCall } from "../lib/chat-api"; // new
import { useLocalStorage } from "./useLocalStorage";

export function useChat(employeeSlug: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useLocalStorage<any[]>(`chat:${employeeSlug}`, []);
  const [pendingTool, setPendingTool] = React.useState<null | { id: string; name: string }>(null);
  const [activeEmployeeSlug, setActiveEmployeeSlug] = React.useState<string>(employeeSlug);

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
        employeeSlug: activeEmployeeSlug, // Use active employee (may have changed from handoff)
        message: text,
        sessionId: null,
        stream: false,
      });

      // Handle handoff if present
      if (resp?.meta?.handoff) {
        const { from, to } = resp.meta.handoff;
        console.log(`[useChat] 🔄 Handoff detected: ${from} → ${to}`);
        setActiveEmployeeSlug(to);
        
        // Add handoff notification message
        const handoffMessage = {
          id: uuid(),
          role: 'system' as const,
          content: `${from} handed you off to ${to}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((m) => [...m, handoffMessage]);
      }

      // Update active employee if response includes it
      if (resp?.employee && resp.employee !== activeEmployeeSlug) {
        setActiveEmployeeSlug(resp.employee);
      }

      if (resp?.messages) {
        setMessages((m) => [...m, ...resp.messages]);
      } else if (resp?.content) {
        // Handle simple content response
        const assistantMessage = {
          id: uuid(),
          role: 'assistant' as const,
          content: resp.content,
          timestamp: new Date().toISOString(),
        };
        setMessages((m) => [...m, assistantMessage]);
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
    activeEmployeeSlug, // Expose active employee (may differ from initial if handoff occurred)
  };
}

export default useChat;
