/**
 * Prime Sidebar Chat Component
 * 
 * Prime canonical chat: all dashboard pages use this to talk to Prime (employeeSlug="prime-boss").
 * This component provides a simple, reusable Prime chat interface for the right sidebar.
 * It uses usePrimeChat hook directly and passes everything to EmployeeChatWorkspace.
 */

import React from 'react';
import { usePrimeChat } from '../../hooks/usePrimeChat';
import { EmployeeChatWorkspace } from './EmployeeChatWorkspace';
import { useAuth } from '../../contexts/AuthContext';

export function PrimeSidebarChat() {
  const { userId } = useAuth();
  
  // Prime canonical chat: all dashboard pages use this to talk to Prime (employeeSlug="prime-boss")
  const primeChat = usePrimeChat(
    userId || 'temp-user',
    undefined, // Let hook manage sessionId
    'prime', // Always Prime
    undefined, // No custom system prompt
    [] // No initial messages
  );

  return (
    <div className="h-full flex flex-col">
      <EmployeeChatWorkspace
        employeeSlug="prime-boss"
        className="h-full"
        showHeader={false}
        showComposer={true}
        // Pass Prime chat hook result directly to EmployeeChatWorkspace
        messages={primeChat.messages}
        input={primeChat.input}
        setInput={primeChat.setInput}
        isStreaming={primeChat.isStreaming}
        send={primeChat.send}
        uploads={primeChat.uploads}
        addUploadFiles={primeChat.addUploadFiles}
        removeUpload={primeChat.removeUpload}
        activeEmployeeSlug={primeChat.activeEmployeeSlug}
        headers={primeChat.headers}
      />
    </div>
  );
}

