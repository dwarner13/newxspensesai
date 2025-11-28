/**
 * Liberty Chat Page
 * 
 * Phase 3.3: Now uses SharedChatInterface for consistency
 * 
 * Grade 4 explanation: This page lets you chat with Liberty, 
 * one of the AI employees. The chat sends your messages to the server,
 * and Liberty responds with helpful information.
 */

import React, { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { SharedChatInterface } from "../../components/chat/SharedChatInterface";

export default function LibertyChat() {
  const { user } = useAuth();
  
  // Grade 4 explanation: Check localStorage for any payload from other pages
  // (like when Byte gets data from Smart Import page)
  useEffect(() => {
    const payload = localStorage.getItem('liberty:payload');
    if (payload) {
      try {
        const data = JSON.parse(payload);
        // Payload will be handled by SharedChatInterface when user sends first message
        // For now, just clear it
        localStorage.removeItem('liberty:payload');
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <SharedChatInterface
        employeeSlug="liberty-ai"
        mode="page"
        sessionId={user?.id ? `liberty-${user.id}` : undefined}
        className="max-w-4xl mx-auto"
      />
    </div>
  );
}
