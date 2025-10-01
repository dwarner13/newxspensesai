import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WelcomeScreen from './onboarding/WelcomeScreen';
import DocumentTypesScreen from './onboarding/DocumentTypesScreen';
import VolumeScreen from './onboarding/VolumeScreen';
import DocumentSourcesScreen from './onboarding/DocumentSourcesScreen';
import AIPreferencesScreen from './onboarding/AIPreferencesScreen';
import ReferralSourceScreen from './onboarding/ReferralSourceScreen';
import AccountSetupScreen from './onboarding/AccountSetupScreen';
import CommitmentScreen from './onboarding/CommitmentScreen';
import MarketingConsentScreen from './onboarding/MarketingConsentScreen';
import FinalScreen from './onboarding/FinalScreen';

const OnboardingFlow = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      navigate('/login', { replace: true});
    }
    
    // Check if onboarding is already completed
    const checkOnboardingStatus = async () => {
      if (user) {
        // In a real app, you would check if the user has completed onboarding
        // For now, we'll just let them go through the flow
      }
    };
    
    checkOnboardingStatus();
  }, [user, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/document-types" element={<DocumentTypesScreen />} />
      <Route path="/volume" element={<VolumeScreen />} />
      <Route path="/document-sources" element={<DocumentSourcesScreen />} />
      <Route path="/ai-preferences" element={<AIPreferencesScreen />} />
      <Route path="/referral-source" element={<ReferralSourceScreen />} />
      <Route path="/account-setup" element={<AccountSetupScreen />} />
      <Route path="/commitment" element={<CommitmentScreen />} />
      <Route path="/marketing-consent" element={<MarketingConsentScreen />} />
      <Route path="/final" element={<FinalScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default OnboardingFlow;
