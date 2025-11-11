
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePrimeChat } from "../../hooks/usePrimeChat";
import HeaderStrip from "../../components/HeaderStrip";

/**
 * Analytics Chat Page
 * 
 * Grade 4 explanation: This page lets you chat with Analytics, 
 * one of the AI employees. The chat sends your messages to the server,
 * and Analytics responds with helpful information.
 */
export default function AnalyticsChat() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  
  // Grade 4 explanation: usePrimeChat hook connects to the chat server
  // and manages messages. We pass 'dash' to tell it which employee to use.
  const { messages, send, headers } = usePrimeChat(
    user?.id || 'anonymous',
    undefined,
    'dash' as any
  );

  // Grade 4 explanation: Check localStorage for any payload from other pages
  // (like when Byte gets data from Smart Import page)
  useEffect(() => {
    const payload = localStorage.getItem('dash:payload');
    if (payload) {
      try {
        const data = JSON.parse(payload);
        // Send payload as first message if present
        if (data && typeof data === 'object') {
          send(JSON.stringify(data));
          localStorage.removeItem('dash:payload');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Grade 4 explanation: When form is submitted, send the message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Analytics</h1>
      
      {/* Grade 4 explanation: HeaderStrip shows headers from the server response */}
      <HeaderStrip headers={headers} />
      
      {/* Show if session summary was applied */}
      {headers?.["X-Session-Summary"] && (
        <div className="mb-2 text-xs px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
          Context-Summary (recent) applied
        </div>
      )}

      {/* Grade 4 explanation: Show all messages in a list */}
      <div className="my-3 space-y-2 min-h-[400px]">
        {messages?.map?.((m: any, i: number) => (
          <div 
            key={i} 
            className={`text-sm p-3 rounded ${m.role === 'user' ? 'bg-blue-50 ml-auto max-w-[80%]' : 'bg-gray-50 max-w-[80%]'}`}
          >
            <b className="text-xs text-gray-500">{m.role}:</b>
            <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      {/* Grade 4 explanation: Input form to type and send messages */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button 
          className="px-3 py-2 rounded bg-black text-white" 
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}
