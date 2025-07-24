import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, getProfile } from '../../lib/supabase';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check session validity on protected routes
  useEffect(() => {
    const checkSession = async () => {
      if (!loading && user) {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('⚠️ Invalid session detected, redirecting to login');
          // Store current path for after login
          sessionStorage.setItem('xspensesai-intended-path', location.pathname);
        } else {
          try {
            // Use getProfile function which handles mock mode and dev users
            const profile = await getProfile(user.id);
            
            // Profile creation is handled by getProfile function
            // Gamification disabled - streak and XP updates removed
          } catch (error) {
            console.error('Error in session check:', error);
          }
        }
      }
    };

    checkSession();
  }, [user, loading]); // Remove location.pathname to prevent unnecessary re-renders

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500  mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Store the attempted path for redirect after login
    sessionStorage.setItem('xspensesai-intended-path', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
