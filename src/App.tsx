import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { therapistTriggerAtom, isTherapistModalOpenAtom } from './lib/uiStore';
import TherapistNotification from './components/therapist/TherapistNotification';
import TherapistModal from './components/therapist/TherapistModal';
import AppLayout from './components/layout/AppLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import MainHeader from './components/layout/MainHeader';
import AIAssistantPage from './pages/AIAssistantPage';
import AIFinancialAssistantPage from './pages/dashboard/AIFinancialAssistantPage';
import SmartImportAIPage from './pages/dashboard/SmartImportAIPage';
import GoalConciergePage from './pages/dashboard/GoalConciergePage';
import SpendingPredictionsPage from './pages/dashboard/SpendingPredictionsPage';
import AICategorizationPage from './pages/dashboard/AICategorizationPage';
import BillRemindersPage from './pages/dashboard/BillRemindersPage';
import DebtPayoffPlannerPage from './pages/dashboard/DebtPayoffPlannerPage';
import FinancialTherapistPage from './pages/dashboard/FinancialTherapistPage';
import TherapistDemoPage from './pages/dashboard/TherapistDemoPage';
import PersonalPodcastPage from './pages/dashboard/PersonalPodcastPage';
import TaxAssistant from './pages/dashboard/TaxAssistant';
import BusinessIntelligence from './pages/dashboard/BusinessIntelligence';
import SmartAutomation from './pages/dashboard/SmartAutomation';
import Analytics from './pages/dashboard/Analytics';
import Settings from './pages/dashboard/Settings';
import ReportsPage from './pages/ReportsPage';
import AIFinancialFreedomPage from './pages/dashboard/AIFinancialFreedomPage';
import AIEmployees from './pages/AIEmployees';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import ReviewsPage from './pages/ReviewsPage';
import SpendingPredictionsFeaturePage from './archived/SpendingPredictionsFeaturePage';
import SmartImportAIFeaturePage from './archived/SmartImportAIFeaturePage';
import SpotifyIntegrationFeaturePage from './pages/features/spotify-integration';
import SpotifyIntegrationDashboardPage from './pages/dashboard/SpotifyIntegrationDashboard';
import AIInsightsFeaturePage from './pages/features/AIInsightsPage';
import EmailReceiptsFeaturePage from './pages/features/EmailReceiptsPage';
import PersonalBusinessGoalsFeaturePage from './pages/features/PersonalBusinessGoalsPage';
import SmartAutomationFeaturePage from './pages/features/SmartAutomationPage';
import BusinessExpenseIntelligenceFeaturePage from './pages/features/BusinessExpenseIntelligencePage';
import FreelancerTaxFeaturePage from './pages/features/freelancer-tax';
import WellnessStudioFeaturePage from './pages/features/wellness-studio';
import WellnessStudioPage from './pages/dashboard/WellnessStudioPage';
import GoalConciergeFeaturePage from './pages/features/goal-concierge';
import PersonalPodcastFeaturePage from './pages/features/personal-podcast';
import GamificationFeaturePage from './pages/features/gamification';
import BusinessExpensesFeaturePage from './pages/features/business-expenses';
import AITherapistFeaturePage from './pages/features/ai-therapist';
import AICoachFeaturePage from './pages/features/ai-coach';
import AIGoalsFeaturePage from './pages/features/ai-goals';
import AIAssistantFeaturePage from './pages/features/ai-assistant';
import VoiceControlFeaturePage from './pages/features/voice-control';
import SocialMoneyFeaturePage from './pages/features/social-money';
import PredictionsFeaturePage from './pages/features/predictions';
import AutomationFeaturePage from './pages/features/automation';
import PodcastGeneratorFeaturePage from './pages/features/podcast-generator';
import XspensesProDashboard from './components/XspensesProDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import { PersonalPodcastProvider } from './contexts/PersonalPodcastContext';
import { AIFinancialAssistantProvider } from './contexts/AIFinancialAssistantContext';
import { UserProvider } from './contexts/UserContext';

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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                
                {/* Reports route - redirect to dashboard */}
                <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
                
                {/* Feature pages */}
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


