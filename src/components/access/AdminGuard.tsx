import { ReactNode } from 'react';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import AccessDenied from './AccessDenied';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
}

const AdminGuard = ({ 
  children, 
  fallback,
  message 
}: AdminGuardProps) => {
  const { userIsAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!userIsAdmin) {
    return fallback || <AccessDenied type="admin" message={message} />;
  }

  return <>{children}</>;
};

export default AdminGuard;
