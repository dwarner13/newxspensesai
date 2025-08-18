import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { therapistTriggerAtom, isTherapistModalOpenAtom } from './lib/uiStore';
import TherapistNotification from './components/therapist/TherapistNotification';
import TherapistModal from './components/therapist/TherapistModal';
import AppLayout from './components/layout/AppLayout';
import DashboardLayout from './components/layout/DashboardLayout';

import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import { PersonalPodcastProvider } from './contexts/PersonalPodcastContext';
import { AIFinancialAssistantProvider } from './contexts/AIFinancialAssistantContext';
import { UserProvider } from './contexts/UserContext';

// Critical components - load immediately
import HomePage from './pages/HomePage';
import XspensesProDashboard from './components/XspensesProDashboard';

// Lazy load non-critical components
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const AIFinancialAssistantPage = lazy(() => import('./pages/dashboard/AIFinancialAssistantPage'));
const SmartImportAIPage = lazy(() => import('./pages/dashboard/SmartImportAIPage'));
const GoalConciergePage = lazy(() => import('./pages/dashboard/GoalConciergePage'));
const SpendingPredictionsPage = lazy(() => import('./pages/dashboard/SpendingPredictionsPage'));
const AICategorizationPage = lazy(() => import('./pages/dashboard/AICategorizationPage'));
const BillRemindersPage = lazy(() => import('./pages/dashboard/BillRemindersPage'));
const DebtPayoffPlannerPage = lazy(() => import('./pages/dashboard/DebtPayoffPlannerPage'));
const FinancialTherapistPage = lazy(() => import('./pages/dashboard/FinancialTherapistPage'));
const TherapistDemoPage = lazy(() => import('./pages/dashboard/TherapistDemoPage'));
const PersonalPodcastPage = lazy(() => import('./pages/dashboard/PersonalPodcastPage'));
const TaxAssistant = lazy(() => import('./pages/dashboard/TaxAssistant'));
const BusinessIntelligence = lazy(() => import('./pages/dashboard/BusinessIntelligence'));
const SmartAutomation = lazy(() => import('./pages/dashboard/SmartAutomation'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AIFinancialFreedomPage = lazy(() => import('./pages/dashboard/AIFinancialFreedomPage'));
const AIEmployees = lazy(() => import('./pages/AIEmployees'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// Feature pages - lazy load as they're less critical
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const SmartImportAIFeaturePage = lazy(() => import('./archived/SmartImportAIFeaturePage'));
const SpendingPredictionsFeaturePage = lazy(() => import('./archived/SpendingPredictionsFeaturePage'));
const SpotifyIntegrationFeaturePage = lazy(() => import('./pages/features/spotify-integration'));
const SpotifyIntegrationDashboardPage = lazy(() => import('./pages/dashboard/SpotifyIntegrationDashboard'));
const AIInsightsFeaturePage = lazy(() => import('./pages/features/AIInsightsPage'));
const EmailReceiptsFeaturePage = lazy(() => import('./pages/features/EmailReceiptsPage'));
const PersonalBusinessGoalsFeaturePage = lazy(() => import('./pages/features/PersonalBusinessGoalsPage'));
const SmartAutomationFeaturePage = lazy(() => import('./pages/features/SmartAutomationPage'));
const BusinessExpenseIntelligenceFeaturePage = lazy(() => import('./pages/features/BusinessExpenseIntelligencePage'));
const FreelancerTaxFeaturePage = lazy(() => import('./pages/features/freelancer-tax'));
const WellnessStudioFeaturePage = lazy(() => import('./pages/features/wellness-studio'));
const WellnessStudioPage = lazy(() => import('./pages/dashboard/WellnessStudioPage'));
const GoalConciergeFeaturePage = lazy(() => import('./pages/features/goal-concierge'));
const PersonalPodcastFeaturePage = lazy(() => import('./pages/features/personal-podcast'));
const GamificationFeaturePage = lazy(() => import('./pages/features/gamification'));
const BusinessExpensesFeaturePage = lazy(() => import('./pages/features/business-expenses'));
const AITherapistFeaturePage = lazy(() => import('./pages/features/ai-therapist'));
const AICoachFeaturePage = lazy(() => import('./pages/features/ai-coach'));
const AIGoalsFeaturePage = lazy(() => import('./pages/features/ai-goals'));
const AIAssistantFeaturePage = lazy(() => import('./pages/features/ai-assistant'));
const VoiceControlFeaturePage = lazy(() => import('./pages/features/voice-control'));
const SocialMoneyFeaturePage = lazy(() => import('./pages/features/social-money'));
const PredictionsFeaturePage = lazy(() => import('./pages/features/predictions'));
const AutomationFeaturePage = lazy(() => import('./pages/features/automation'));
const PodcastGeneratorFeaturePage = lazy(() => import('./pages/features/podcast-generator'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
  </div>
);

// Scroll restoration component
function ScrollToTop() {
  const location = useLocation();
  
  useEffect(() => {
    // For dashboard routes, preserve scroll position and don't scroll to top
    if (location.pathname.startsWith('/dashboard')) {
      // Don't scroll - preserve current position including sidebar scroll
      return;
    }
    // For non-dashboard routes, scroll to top
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return null;
}

function App() {
  const [therapistTrigger] = useAtom(therapistTriggerAtom);
  const [isTherapistModalOpen] = useAtom(isTherapistModalOpenAtom);
  
  return (
    <AuthProvider>
      <AudioProvider>
        <PersonalPodcastProvider>
          <AIFinancialAssistantProvider>
            <UserProvider>
            <ScrollToTop />
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/ai-assistant" element={<AIAssistantPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  
                  {/* Reports route - redirect to dashboard */}
                  <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
                  
                  {/* Feature pages */}
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/features/smart-import" element={<SmartImportAIFeaturePage />} />
                  <Route path="/features/smart-import-ai" element={<SmartImportAIFeaturePage />} />
                  <Route path="/features/spending-predictions" element={<SpendingPredictionsFeaturePage />} />
                  <Route path="/features/spotify-integration" element={<SpotifyIntegrationFeaturePage />} />
                  <Route path="/features/ai-insights" element={<AIInsightsFeaturePage />} />
                  <Route path="/features/email-receipts" element={<EmailReceiptsFeaturePage />} />
                  <Route path="/features/personal-business-goals" element={<PersonalBusinessGoalsFeaturePage />} />
                  <Route path="/features/smart-automation" element={<SmartAutomationFeaturePage />} />
                  <Route path="/features/business-expense-intelligence" element={<BusinessExpenseIntelligenceFeaturePage />} />
                  <Route path="/features/freelancer-tax" element={<FreelancerTaxFeaturePage />} />
                  <Route path="/features/wellness-studio" element={<WellnessStudioFeaturePage />} />
                  <Route path="/features/goal-concierge" element={<GoalConciergeFeaturePage />} />
                  <Route path="/features/personal-podcast" element={<PersonalPodcastFeaturePage />} />
                  <Route path="/features/gamification" element={<GamificationFeaturePage />} />
                  <Route path="/features/business-expenses" element={<BusinessExpensesFeaturePage />} />
                  <Route path="/features/ai-therapist" element={<AITherapistFeaturePage />} />
                  <Route path="/features/ai-coach" element={<AICoachFeaturePage />} />
                  <Route path="/features/ai-goals" element={<AIGoalsFeaturePage />} />
                  <Route path="/features/ai-assistant" element={<AIAssistantFeaturePage />} />
                  <Route path="/features/voice-control" element={<VoiceControlFeaturePage />} />
                  <Route path="/features/social-money" element={<SocialMoneyFeaturePage />} />
                  <Route path="/features/predictions" element={<PredictionsFeaturePage />} />
                  <Route path="/features/automation" element={<AutomationFeaturePage />} />
                  <Route path="/features/podcast-generator" element={<PodcastGeneratorFeaturePage />} />
                  
                  {/* Dashboard routes with persistent layout */}
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<XspensesProDashboard />} />
                    <Route path="ai-financial-assistant" element={<AIFinancialAssistantPage />} />
                    <Route path="smart-import-ai" element={<SmartImportAIPage />} />
                    <Route path="goal-concierge" element={<GoalConciergePage />} />
                    <Route path="spending-predictions" element={<SpendingPredictionsPage />} />
                    <Route path="ai-categorization" element={<AICategorizationPage />} />
                    <Route path="bill-reminders" element={<BillRemindersPage />} />
                    <Route path="debt-payoff-planner" element={<DebtPayoffPlannerPage />} />
                    <Route path="ai-financial-freedom" element={<AIFinancialFreedomPage />} />
                    <Route path="therapist-demo" element={<TherapistDemoPage />} />
                    <Route path="personal-podcast" element={<PersonalPodcastPage />} />
                    <Route path="tax-assistant" element={<TaxAssistant />} />
                    <Route path="business-intelligence" element={<BusinessIntelligence />} />
                    <Route path="smart-automation" element={<SmartAutomation />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="spotify-integration" element={<SpotifyIntegrationDashboardPage />} />
                    <Route path="wellness-studio" element={<WellnessStudioPage />} />
                    <Route path="financial-therapist" element={<FinancialTherapistPage />} />
                  </Route>
                  
                  <Route path="/ai-employees" element={<AIEmployees />} />
                </Routes>
              </Suspense>
            </div>
            
            {/* Global Therapist Components */}
            {therapistTrigger && <TherapistNotification />}
            <TherapistModal />
          </UserProvider>
          </AIFinancialAssistantProvider>
        </PersonalPodcastProvider>
      </AudioProvider>
    </AuthProvider>
  );
}

export default App;


