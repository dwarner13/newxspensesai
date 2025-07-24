import { ReactNode } from 'react';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import AccessDenied from './AccessDenied';

interface PremiumGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

const PremiumGuard = ({ 
  children, 
  fallback,
  showUpgrade = true 
}: PremiumGuardProps) => {
  const { hasAccess, loading } = useAdminAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!hasAccess('premium')) {
    return fallback || <AccessDenied type="premium" showUpgrade={showUpgrade} />;
  }

  return <>{children}</>;
};

export default PremiumGuard;
