/**
 * Chat Page Redirect Component
 * 
 * Redirects legacy route-based chat pages to dashboard with unified chat open.
 * This ensures all chat goes through the unified chat system.
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface ChatPageRedirectProps {
  employeeSlug: string;
  redirectTo?: string; // Default: '/dashboard'
}

export default function ChatPageRedirect({ 
  employeeSlug, 
  redirectTo = '/dashboard' 
}: ChatPageRedirectProps) {
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();

  useEffect(() => {
    // Open unified chat with the specified employee
    openChat({ 
      initialEmployeeSlug: employeeSlug,
      context: { page: 'chat-redirect' }
    });
    
    // Redirect to dashboard
    navigate(redirectTo, { replace: true });
  }, [employeeSlug, redirectTo, navigate, openChat]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-white text-xl">Redirecting to unified chat...</div>
    </div>
  );
}













