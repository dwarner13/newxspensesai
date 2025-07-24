import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getProfile } from '../lib/supabase';

interface AdminAccessHook {
  userIsAdmin: boolean;
  userPlan: 'free' | 'premium' | 'admin';
  hasAccess: (feature?: 'premium' | 'admin') => boolean;
  loading: boolean;
}

export const useAdminAccess = (): AdminAccessHook => {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<'free' | 'premium' | 'admin'>('free');
  const [loading, setLoading] = useState(true);

  // Admin email check
  const userIsAdmin = user?.email === "darrell.warner13@gmail.com";

  useEffect(() => {
    if (user) {
      loadUserPlan();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserPlan = async () => {
    try {
      setLoading(true);
      
      // If admin, set admin role
      if (userIsAdmin) {
        setUserPlan('admin');
        setLoading(false);
        return;
      }

      // Load user plan from database using getProfile
      const profile = await getProfile(user?.id || '');
      
      if (profile && 'role' in profile) {
        setUserPlan(profile.role || 'free');
      } else {
        setUserPlan('free');
      }
    } catch (error) {
      console.error('Error in loadUserPlan:', error);
      setUserPlan('free');
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (feature?: 'premium' | 'admin'): boolean => {
    if (userIsAdmin) return true; // Admin has access to everything
    
    if (!feature) return true; // No specific feature required
    
    if (feature === 'admin') return userIsAdmin;
    
    if (feature === 'premium') {
      return userPlan === 'premium' || userPlan === 'admin';
    }
    
    return false;
  };

  return {
    userIsAdmin,
    userPlan,
    hasAccess,
    loading
  };
};