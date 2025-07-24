import { ReactNode } from 'react';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import AccessDenied from './AccessDenied';

interface PrivateBetaGuardProps {
  children: ReactNode;
  allowedEmails?: string[];
  message?: string;
}

const PrivateBetaGuard = ({ 
  children, 
  allowedEmails = ["darrell.warner13@gmail.com"],
  message 
}: PrivateBetaGuardProps) => {
  const { userIsAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Check if user is in allowed list (admin is always allowed)
  const hasAccess = userIsAdmin; // You can extend this to check allowedEmails array

  if (!hasAccess) {
    return <AccessDenied type="private-beta" message={message} />;
  }

  return <>{children}</>;
};

export default PrivateBetaGuard;
