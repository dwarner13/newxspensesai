import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UnifiedAssistantChat from '../../components/chat/UnifiedAssistantChat';

/**
 * Custodian Page
 * 
 * Security & Settings specialist - handles account security, settings, privacy, and onboarding.
 */
export default function CustodianPage() {
  const { user } = useAuth();
  const userId = user?.id || '';

  return (
    <div className="h-full w-full">
      <UnifiedAssistantChat
        isOpen={true}
        initialEmployeeSlug="custodian"
        mode="fullscreen"
      />
    </div>
  );
}





