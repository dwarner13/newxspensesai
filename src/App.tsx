import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { therapistTriggerAtom, isTherapistModalOpenAtom } from './lib/uiStore';
import TherapistNotification from './components/therapist/TherapistNotification';
import TherapistModal from './components/therapist/TherapistModal';
import AppLayout from './components/layout/AppLayout';
import DashboardLayout from './layouts/DashboardLayout';
import MarketingLayout from './layouts/MarketingLayout';
import AuthLayout from './layouts/AuthLayout';
import { ErrorBoundary } from './components/util/ErrorBoundary';
import { DelayedLoadingSpinner } from './components/ui/DelayedLoadingSpinner';

import { AudioProvider } from './contexts/AudioContext';
import { PersonalPodcastProvider } from './contexts/PersonalPodcastContext';
import { AIFinancialAssistantProvider } from './contexts/AIFinancialAssistantContext';
import { UserProvider } from './contexts/UserContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { BossProvider } from './lib/agents/context';
import { ProfileProvider } from './contexts/ProfileContext';
import { OnboardingUIProvider } from './contexts/OnboardingUIContext';
import { RouteTransitionProvider } from './contexts/RouteTransitionContext';
import MobileLayoutGate from './components/layout/MobileLayoutGate';
import MobileRevolution from './components/mobile/MobileRevolution';
import RouteScrollReset from './components/util/RouteScrollReset';
import OnboardingGuard from './components/auth/OnboardingGuard';
import RouteDecisionGate from './components/auth/RouteDecisionGate';
import { RouteTransitionOverlay } from './components/ui/RouteTransitionOverlay';
import { isPrimeV2Enabled } from './env';
import { DevToolsProvider } from './contexts/DevToolsContext';
import DevPanel from './components/dev/DevPanel';
import { JobsDrawer } from './components/system/JobsDrawer';
import { useJobsRealtime } from './lib/realtime/useJobsRealtime';
import { RightPanelProvider } from './context/RightPanelContext';
import { PrimeProvider } from './contexts/PrimeContext';
import { useMobileDetection } from './hooks/useMobileDetection';
const SecurityCheckPage = lazy(() => import('./pages/dev/SecurityCheckPage'));

// Scroll bar width calculation hook
const useScrollbarWidth = () => {
  useEffect(() => {
    const calculateScrollbarWidth = () => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    };

    calculateScrollbarWidth();
    window.addEventListener('resize', calculateScrollbarWidth);
    
    return () => window.removeEventListener('resize', calculateScrollbarWidth);
  }, []);
};

// Critical components - load immediately
import HomePage from './pages/HomePage';
import XspensesProDashboard from './components/XspensesProDashboard';
import { PrimeChatPage } from './pages/dashboard/PrimeChatPage';
import { SmartImportChatPage } from './pages/dashboard/SmartImportChatPage';
import { AIChatAssistantPage } from './pages/dashboard/AIChatAssistantPage';
import OverviewPage from './pages/dashboard/OverviewPage';
import WorkspacePage from './pages/dashboard/WorkspacePage';
import PlanningPage from './pages/dashboard/PlanningPage';
const AnalyticsPage = lazy(() => import('@/pages/dashboard/AnalyticsPage'));
import BusinessPage from './pages/dashboard/BusinessPage';
import EntertainmentPage from './pages/dashboard/EntertainmentPage';
const ReportsPage = lazy(() => import('@/pages/dashboard/ReportsPage'));
import TestPage from './pages/dashboard/TestPage';

// Lazy load non-critical components
// const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const AIFinancialAssistantPage = lazy(() => import('./pages/dashboard/AIFinancialAssistantPage'));
const SmartImportAIPage = lazy(() => import('./pages/dashboard/SmartImportAIPage'));
const FinancialStoryPage = lazy(() => import('./pages/dashboard/FinancialStoryPage'));
const UploadSpeedTest = lazy(() => import('./pages/dev/UploadSpeedTest'));
const DashboardTransactionsPage = lazy(() => import('./pages/dashboard/DashboardTransactionsPage'));
const TransactionsPage = lazy(() => import('./pages/dashboard/TransactionsPage'));
const BankAccountsPage = lazy(() => import('./pages/dashboard/BankAccountsPage'));
const GoalConciergePage = lazy(() => import('./pages/dashboard/GoalConciergePage'));
const SmartCategoriesPage = lazy(() => import('./pages/dashboard/SmartCategoriesPage'));
const EmployeeChatPage = lazy(() => import('./pages/dashboard/EmployeeChatPage'));
const AnalyticsAI = lazy(() => import('./pages/dashboard/AnalyticsAI'));

// Feature pages
const SmartImportAIFeaturePage = lazy(() => import('./pages/features/smart-import-ai'));
const AIAssistantFeaturePage = lazy(() => import('./pages/features/ai-assistant'));
const AITherapistFeaturePage = lazy(() => import('./pages/features/ai-therapist'));
const GoalConciergeFeaturePage = lazy(() => import('./pages/features/goal-concierge'));
const PredictionsFeaturePage = lazy(() => import('./pages/features/predictions'));
const SpotifyIntegrationFeaturePage = lazy(() => import('./pages/features/spotify-integration'));
const AIInsightsFeaturePage = lazy(() => import('./pages/features/AIInsightsPage'));
const EmailReceiptsFeaturePage = lazy(() => import('./pages/features/EmailReceiptsPage'));
const PersonalBusinessGoalsFeaturePage = lazy(() => import('./pages/features/PersonalBusinessGoalsPage'));
const SmartAutomationFeaturePage = lazy(() => import('./pages/features/SmartAutomationPage'));
const BusinessExpenseIntelligenceFeaturePage = lazy(() => import('./pages/features/BusinessExpenseIntelligencePage'));
const FreelancerTaxFeaturePage = lazy(() => import('./pages/features/freelancer-tax'));
const WellnessStudioFeaturePage = lazy(() => import('./pages/features/wellness-studio'));
const PersonalPodcastFeaturePage = lazy(() => import('./pages/features/PersonalPodcastPage'));
const FinancialStoryFeaturePage = lazy(() => import('./pages/features/financial-story'));
const PodcastPage = lazy(() => import('./pages/features/podcast'));
const GamificationFeaturePage = lazy(() => import('./pages/features/gamification'));
const BusinessExpensesFeaturePage = lazy(() => import('./pages/features/business-expenses'));
const AICoachFeaturePage = lazy(() => import('./pages/features/ai-coach'));
const AIGoalsFeaturePage = lazy(() => import('./pages/features/ai-goals'));
const AICategorizationFeaturePage = lazy(() => import('./pages/features/ai-categorization'));
const TaxAssistantFeaturePage = lazy(() => import('./pages/features/tax-assistant'));
const BusinessIntelligenceFeaturePage = lazy(() => import('./pages/features/business-intelligence'));
const DebtPayoffPlannerFeaturePage = lazy(() => import('./pages/features/debt-payoff-planner'));
const BillRemindersFeaturePage = lazy(() => import('./pages/features/bill-reminders'));
const AIFinancialFreedomFeaturePage = lazy(() => import('./pages/features/ai-financial-freedom'));
const VoiceControlFeaturePage = lazy(() => import('./pages/features/voice-control'));
const SocialMoneyFeaturePage = lazy(() => import('./pages/features/social-money'));
const AutomationFeaturePage = lazy(() => import('./pages/features/automation'));
// const ThreeColumnDashboardDemo = lazy(() => import('./components/layout/ThreeColumnDashboardDemo'));
const SpendingPredictionsPage = lazy(() => import('./pages/dashboard/SpendingPredictionsPage'));
const AICategorizationPage = lazy(() => import('./pages/dashboard/AICategorizationPage'));
const BillRemindersPage = lazy(() => import('./pages/dashboard/BillRemindersPage'));
const DebtPayoffPlannerPage = lazy(() => import('./pages/dashboard/DebtPayoffPlannerPage'));
const AIFinancialTherapistPage = lazy(() => import('./pages/dashboard/AIFinancialTherapistPage'));
// const TherapistDemoPage = lazy(() => import('./pages/dashboard/TherapistDemoPage'));
const PersonalPodcastPage = lazy(() => import('./pages/dashboard/PersonalPodcastPage'));
const OCRTesterPage = lazy(() => import('./pages/OCRTesterPage'));
const LocalOCRTester = lazy(() => import('./pages/LocalOCRTester'));

// Prime Module - conditionally loaded (replacing existing PrimeLabPage)
const MobileCheck = lazy(() => import('./pages/debug/MobileCheck'));
const MobileTest = lazy(() => import('./pages/debug/MobileTest'));
const NavCheck = lazy(() => import('./pages/debug/NavCheck'));
// const SheetCheck = lazy(() => import('./pages/debug/SheetCheck'));
// const PodcastDashboard = lazy(() => import('./pages/PodcastDashboard'));
// const TaxAssistant = lazy(() => import('./pages/features/tax-assistant'));
// const PrimeAITestPage = lazy(() => import('./pages/test/PrimeAITestPage'));
const TaxAssistantPage = lazy(() => import('./pages/dashboard/TaxAssistantPage'));
// const BusinessIntelligence = lazy(() => import('./pages/features/business-intelligence'));
const BusinessIntelligencePage = lazy(() => import('./pages/dashboard/BusinessIntelligencePage'));
const CustodianPage = lazy(() => import('./pages/dashboard/CustodianPage'));
// const PrimeLabPage = lazy(() => import('./ui/pages/PrimeLabPage')); // Hidden - using Centralized Chat Runtime instead
// const TeamRoom = lazy(() => import('./pages/dashboard/TeamRoom'));
const SmartAutomation = lazy(() => import('./pages/dashboard/SmartAutomation'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
// const Settings = lazy(() => import('./pages/dashboard/Settings')); // Old import
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'));
const PreferencesPage = lazy(() => import('./pages/settings/PreferencesPage'));
const SecurityPage = lazy(() => import('./pages/settings/SecurityPage'));
const OnboardingWelcomePage = lazy(() => import('./pages/onboarding/OnboardingWelcomePage'));
const OnboardingSetupPage = lazy(() => import('./pages/onboarding/OnboardingSetupPage'));
// const ReportsPage = lazy(() => import('./pages/ReportsPage'));
// const Reports = lazy(() => import('./pages/dashboard/Reports'));
// const ViewTransactionsPage = lazy(() => import('./pages/ViewTransactionsPage'));
const AIFinancialFreedomPage = lazy(() => import('./pages/dashboard/AIFinancialFreedomPage'));
const NotFoundPage = lazy(() => import('./pages/dashboard/NotFoundPage'));
// const AIFinancialFreedomFeaturePage = lazy(() => import('./pages/features/ai-financial-freedom'));
const AIEmployees = lazy(() => import('./pages/AIEmployees'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

// Spotify integration components
const SpotifyCallbackPage = lazy(() => import('./pages/SpotifyCallbackPage'));
const SpotifyPlayerPage = lazy(() => import('./pages/SpotifyPlayerPage'));
const SpotifyIntegrationPage = lazy(() => import('./pages/dashboard/SpotifyIntegrationPage'));

// Additional components
const WellnessStudioPage = lazy(() => import('./pages/dashboard/WellnessStudioPage'));
const ByteChatTest = lazy(() => import('./pages/ByteChatTest'));
// Legacy PrimeChat routes removed - now using floating bubble panel in dashboard
// const PrimeChat = lazy(() => import('./pages/chat/PrimeChat'));
const ChatTest = lazy(() => import('./pages/ChatTest'));
const SimpleTest = lazy(() => import('./pages/SimpleTest'));
const PodcastGeneratorFeaturePage = lazy(() => import('./pages/features/podcast-generator'));

// Auth pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Employee Chat Pages - Legacy route-based chats now redirect to unified chat
// Legacy chat pages redirect to dashboard with unified chat open
const ChatPageRedirect = lazy(() => import('./components/chat/ChatPageRedirect'));
const ByteChat = lazy(() => import('./pages/ByteChatTest')); // Uses existing page (test page)
const CrystalChat = lazy(() => import('./pages/dashboard/SpendingPredictionsPage')); // Uses existing
// Legacy chat page imports removed - now using ChatPageRedirect component
// const TherapistChat = lazy(() => import('./pages/chat/TherapistChat'));
// const WellnessChat = lazy(() => import('./pages/chat/WellnessChat'));
// const SpotifyChat = lazy(() => import('./pages/chat/SpotifyChat'));
// const TaxChat = lazy(() => import('./pages/chat/TaxChat'));
// const BIChat = lazy(() => import('./pages/chat/BIChat'));
// const AnalyticsChat = lazy(() => import('./pages/chat/AnalyticsChat'));
// const SettingsChat = lazy(() => import('./pages/chat/SettingsChat'));

// Loading component for Suspense fallback - now uses delayed visibility to prevent flicker
const LoadingSpinner = () => (
  <DelayedLoadingSpinner isLoading={true} showDelayMs={350} minDisplayMs={400} />
);

// Scroll restoration component
function ScrollToTop() {
  const location = useLocation();
  
  useEffect(() => {
    // For dashboard routes, scroll to top but preserve sidebar scroll
    if (location.pathname.startsWith('/dashboard')) {
      // Scroll main content to top, but preserve sidebar scroll
      const mainContent = document.querySelector('.dashboard-main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      } else {
        // Fallback to window scroll if main content not found
        window.scrollTo(0, 0);
      }
    } else {
      // For non-dashboard routes, scroll to top
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);
  
  return null;
}

function App() {
  const [therapistTrigger] = useAtom(therapistTriggerAtom);
  const [isTherapistModalOpen] = useAtom(isTherapistModalOpenAtom);
  const [isPrimeOpen, setIsPrimeOpen] = useState(false);
  
  // Calculate scrollbar width for fixed elements
  useScrollbarWidth();
  
  // Mobile detection - sets body[data-mobile] for CSS scoping
  useMobileDetection();
  
  // Initialize jobs realtime subscriptions (global, works across all pages)
  useJobsRealtime();

  // Force hide all scrollbars on mount
  useEffect(() => {
    const hideScrollbars = () => {
      const style = document.createElement('style');
      style.id = 'force-hide-scrollbars';
      style.textContent = `
        html, body, * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      
      const existing = document.getElementById('force-hide-scrollbars');
      if (existing) existing.remove();
      
      document.head.appendChild(style);
    };
    
    hideScrollbars();
  }, []);
  
  return (
    <BossProvider>
      <AudioProvider>
          <PersonalPodcastProvider>
            <AIFinancialAssistantProvider>
              <UserProvider>
                <ProfileProvider>
                  <OnboardingUIProvider>
                    <RouteTransitionProvider>
                <WorkspaceProvider>
                  <DevToolsProvider>
                    <RightPanelProvider>
                      <ScrollToTop />
                      <RouteTransitionOverlay />
                      <ErrorBoundary>
                      <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                      {/* Auth routes - dedicated layout without marketing nav */}
                      <Route element={<AuthLayout />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/auth/callback" element={<AuthCallbackPage />} />
                        <Route path="/reset-password" element={<Suspense fallback={<LoadingSpinner />}><ResetPasswordPage /></Suspense>} />
                      </Route>

                      {/* Marketing routes with BossBubble */}
                      <Route element={<MarketingLayout />}>
                        <Route path="/" element={<HomePage />} />
                        {/* <Route path="/ai-assistant" element={<AIAssistantPage />} /> */}
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        
                        {/* Onboarding routes - redirect to dashboard (overlay handles onboarding now) */}
                        <Route path="/onboarding/welcome" element={<OnboardingWelcomePage />} />
                        {/* Note: /onboarding/setup moved to dashboard layout section below */}
                        
                        {/* Spotify integration routes */}
                        <Route path="/callback" element={<SpotifyCallbackPage />} />
                        <Route path="/spotify/callback" element={<SpotifyCallbackPage />} />
                        <Route path="/spotify-player" element={<SpotifyPlayerPage />} />
                        
                        {/* Reports route - redirect to dashboard */}
                        <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
                        
                        {/* OCR Tester routes */}
                        <Route path="/ocr-tester" element={<OCRTesterPage />} />
                        <Route path="/local-ocr-test" element={<LocalOCRTester />} />
                        <Route path="/byte-test" element={<ByteChatTest />} />
                        {/* Legacy Prime Chat route removed - use floating bubble on dashboard instead */}
                        {/* <Route path="/chat/prime" element={<PrimeChatSimple />} /> */}
                        <Route path="/chat-test" element={<ChatTest />} />
                        <Route path="/simple-test" element={<SimpleTest />} />
                        
                        {/* Dev routes */}
                        <Route path="/dev/security-check" element={<Suspense fallback={<LoadingSpinner />}><SecurityCheckPage /></Suspense>} />
                        
                        {/* Employee Chat Routes - Legacy routes now redirect to unified chat */}
                        <Route path="/prime" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/chat/prime" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/chat/tag" element={<ChatPageRedirect employeeSlug="tag-ai" />} />
                        <Route path="/smart-import" element={<ByteChat />} />
                        <Route path="/predict" element={<CrystalChat />} />
                        <Route path="/goals" element={<ChatPageRedirect employeeSlug="goalie-ai" />} />
                        <Route path="/automation" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/debt" element={<ChatPageRedirect employeeSlug="liberty-ai" />} />
                        <Route path="/freedom" element={<ChatPageRedirect employeeSlug="liberty-ai" />} />
                        <Route path="/bills" element={<ChatPageRedirect employeeSlug="chime-ai" />} />
                        <Route path="/podcast" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/therapist" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/wellness" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/spotify" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/tax" element={<ChatPageRedirect employeeSlug="ledger-tax" />} />
                        <Route path="/bi" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                        <Route path="/analytics" element={<ChatPageRedirect employeeSlug="crystal-ai" />} />
                        <Route path="/settings" element={<ChatPageRedirect employeeSlug="prime-boss" />} />
                      
            <Route path="/debug/mobile" element={<MobileCheck />} />
            <Route path="/debug/mobile-test" element={<MobileTest />} />
            <Route path="/debug/navcheck" element={<NavCheck />} />
                      {/* <Route path="/debug/sheet" element={<SheetCheck />} /> */}
                        
                        {/* Prime AI Test Page */}
                        {/* <Route path="/test/prime-ai" element={<PrimeAITestPage />} /> */}
                        
                        {/* Prime Lab Page - Hidden (using Centralized Chat Runtime at /chat/prime) */}
                        {/* <Route path="/prime-lab" element={<PrimeLabPage />} /> */}
                        
                        {/* Feature pages */}
                        <Route path="/features/smart-import-ai" element={<SmartImportAIFeaturePage />} />
                        <Route path="/features/ai-assistant" element={<AIAssistantFeaturePage />} />
                        <Route path="/features/ai-therapist" element={<AITherapistFeaturePage />} />
                        <Route path="/features/goal-concierge" element={<GoalConciergeFeaturePage />} />
                        <Route path="/features/spending-predictions" element={<PredictionsFeaturePage />} />
                        <Route path="/features/spotify-integration" element={<SpotifyIntegrationFeaturePage />} />
                        <Route path="/features/ai-insights" element={<AIInsightsFeaturePage />} />
                        <Route path="/features/email-receipts" element={<EmailReceiptsFeaturePage />} />
                        <Route path="/features/personal-business-goals" element={<PersonalBusinessGoalsFeaturePage />} />
                        <Route path="/features/smart-automation" element={<SmartAutomationFeaturePage />} />
                        <Route path="/features/business-expense-intelligence" element={<BusinessExpenseIntelligenceFeaturePage />} />
                        <Route path="/features/freelancer-tax" element={<FreelancerTaxFeaturePage />} />
                        <Route path="/features/wellness-studio" element={<WellnessStudioFeaturePage />} />
                        <Route path="/features/personal-podcast" element={<PersonalPodcastFeaturePage />} />
                        <Route path="/features/financial-story" element={<FinancialStoryFeaturePage />} />
                        <Route path="/features/podcast" element={<PodcastPage />} />
                        <Route path="/features/gamification" element={<GamificationFeaturePage />} />
                        <Route path="/features/business-expenses" element={<BusinessExpensesFeaturePage />} />
                        <Route path="/features/ai-coach" element={<AICoachFeaturePage />} />
                        <Route path="/features/ai-goals" element={<AIGoalsFeaturePage />} />
                        <Route path="/features/ai-categorization" element={<AICategorizationFeaturePage />} />
                        <Route path="/features/tax-assistant" element={<TaxAssistantFeaturePage />} />
                        <Route path="/features/business-intelligence" element={<BusinessIntelligenceFeaturePage />} />
                        <Route path="/features/debt-payoff-planner" element={<DebtPayoffPlannerFeaturePage />} />
                        <Route path="/features/bill-reminders" element={<BillRemindersFeaturePage />} />
                        <Route path="/features/ai-financial-freedom" element={<AIFinancialFreedomFeaturePage />} />
                        <Route path="/features/voice-control" element={<VoiceControlFeaturePage />} />
                        <Route path="/features/social-money" element={<SocialMoneyFeaturePage />} />
                        <Route path="/features/automation" element={<AutomationFeaturePage />} />
                        <Route path="/features/podcast-generator" element={<PersonalPodcastFeaturePage />} />
                      
                      {/* AI Employees page */}
                      <Route path="/ai-employees" element={<AIEmployees />} />
                    </Route>
                    
                    {/* Onboarding setup route - uses dashboard layout (no marketing header/footer) */}
                    {/* FIXED: Use nested route so DashboardLayout can render <Outlet /> */}
                    <Route path="/onboarding/setup" element={
                      <MobileLayoutGate 
                        Mobile={MobileRevolution} 
                        Desktop={DashboardLayout}
                        mobileProps={{
                          currentView: 'dashboard',
                          onViewChange: (view: string) => console.log('View change:', view),
                          onUpload: () => console.log('Upload triggered'),
                          isProcessing: false,
                          transactionCount: 0,
                          discoveries: [],
                          activeEmployee: "",
                          notifications: 0,
                          onEmployeeSelect: (employeeId: string) => console.log('Employee selected:', employeeId),
                          onStoryAction: (action: string, storyId: string) => console.log('Story action:', action, storyId)
                        }}
                        desktopProps={{}}
                      />
                    }>
                      <Route index element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <OnboardingSetupPage />
                        </Suspense>
                      } />
                    </Route>
                    
                    {/* Dashboard routes with persistent layout - Each route shows its specific page */}
                    <Route path="/dashboard" element={
                      <PrimeProvider>
                        <RouteDecisionGate>
                          <MobileLayoutGate 
                            Mobile={MobileRevolution} 
                            Desktop={DashboardLayout}
                          mobileProps={{
                            currentView: 'dashboard',
                            onViewChange: (view: string) => console.log('View change:', view),
                            onUpload: () => console.log('Upload triggered'),
                            isProcessing: false,
                            transactionCount: 0,
                            discoveries: [],
                            activeEmployee: "",
                            notifications: 0,
                            onEmployeeSelect: (employeeId: string) => console.log('Employee selected:', employeeId),
                            onStoryAction: (action: string, storyId: string) => console.log('Story action:', action, storyId)
                          }}
                          desktopProps={{}}
                        />
                        </RouteDecisionGate>
                      </PrimeProvider>
                    }>
                      <Route index element={<XspensesProDashboard />} />
                      
                      {/* Test Route */}
                      <Route path="test" element={<TestPage />} />
                      
                      {/* Dev Routes */}
                      {import.meta.env.DEV && (
                        <Route path="dev/upload-speed-test" element={
                          <Suspense fallback={<LoadingSpinner />}>
                            <UploadSpeedTest />
                          </Suspense>
                        } />
                      )}
                      
                      {/* Main Dashboard Pages */}
                      <Route path="overview" element={<OverviewPage />} />
                      <Route path="workspace" element={<WorkspacePage />} />
                      <Route path="planning" element={<PlanningPage />} />
                      <Route path="analytics" element={<Suspense fallback={<LoadingSpinner />}><AnalyticsPage /></Suspense>} />
                      <Route path="business" element={<BusinessPage />} />
                      <Route path="entertainment" element={<EntertainmentPage />} />
                      <Route path="reports" element={<Suspense fallback={<LoadingSpinner />}><ReportsPage /></Suspense>} />
                      <Route path="settings" element={<Suspense fallback={<LoadingSpinner />}><SettingsPage /></Suspense>} />
                      <Route path="settings/profile" element={<Suspense fallback={<LoadingSpinner />}><ProfilePage /></Suspense>} />
                      <Route path="settings/preferences" element={<Suspense fallback={<LoadingSpinner />}><PreferencesPage /></Suspense>} />
                      <Route path="settings/security" element={<Suspense fallback={<LoadingSpinner />}><SecurityPage /></Suspense>} />
                      
                      {/* AI Workspace Pages */}
                      <Route path="prime-chat" element={
                        <ErrorBoundary>
                          <PrimeChatPage />
                        </ErrorBoundary>
                      } />
                      <Route path="smart-import-ai" element={<SmartImportChatPage />} />
                      <Route path="ai-chat-assistant" element={<AIChatAssistantPage />} />
                      <Route path="ai-financial-assistant" element={<AIChatAssistantPage />} />
                      <Route path="ai-assistant" element={<Navigate to="/dashboard/ai-chat-assistant" replace />} />
                      <Route path="smart-categories" element={<Suspense fallback={<LoadingSpinner />}><SmartCategoriesPage /></Suspense>} />
                      <Route path="ai-categorization" element={<Suspense fallback={<LoadingSpinner />}><SmartCategoriesPage /></Suspense>} />
                      <Route path="analytics-ai" element={<Suspense fallback={<LoadingSpinner />}><AnalyticsAI /></Suspense>} />
                      <Route path="ai-financial-freedom" element={<Suspense fallback={<LoadingSpinner />}><AIFinancialFreedomPage /></Suspense>} />
                      
                      {/* Planning & Analysis */}
                      <Route path="transactions" element={<TransactionsPage />} />
                      <Route path="bank-accounts" element={<Suspense fallback={<LoadingSpinner />}><BankAccountsPage /></Suspense>} />
                      <Route path="goal-concierge" element={<GoalConciergePage />} />
                      <Route path="smart-automation" element={<Suspense fallback={<LoadingSpinner />}><SmartAutomation /></Suspense>} />
                      <Route path="spending-predictions" element={<Suspense fallback={<LoadingSpinner />}><SpendingPredictionsPage /></Suspense>} />
                      <Route path="debt-payoff-planner" element={<Suspense fallback={<LoadingSpinner />}><DebtPayoffPlannerPage /></Suspense>} />
                      <Route path="bill-reminders" element={<Suspense fallback={<LoadingSpinner />}><BillRemindersPage /></Suspense>} />
                      
                      {/* Entertainment & Wellness */}
                      <Route path="personal-podcast" element={<PersonalPodcastPage />} />
                      <Route path="financial-story" element={<FinancialStoryPage />} />
                      <Route path="financial-therapist" element={<AIFinancialTherapistPage />} />
                      <Route path="wellness-studio" element={<WellnessStudioPage />} />
                      <Route path="spotify" element={<SpotifyIntegrationPage />} />
                      
                      {/* Business & Tax */}
                      <Route path="tax-assistant" element={<Suspense fallback={<LoadingSpinner />}><TaxAssistantPage /></Suspense>} />
                      <Route path="business-intelligence" element={<Suspense fallback={<LoadingSpinner />}><BusinessIntelligencePage /></Suspense>} />
                      
                      {/* Tools & Settings */}
                      <Route path="custodian" element={<Suspense fallback={<LoadingSpinner />}><CustodianPage /></Suspense>} />
                      
                      {/* Missing routes: redirects for sidebar compatibility */}
                      <Route path="podcast" element={<Navigate to="/dashboard/personal-podcast" replace />} />
                      <Route path="spotify-integration" element={<Navigate to="/dashboard/spotify" replace />} />
                      <Route path="team-room" element={<Navigate to="/dashboard/prime-chat" replace />} />
                      
                      {/* Employee Chat Routes */}
                      <Route path="chat/:employeeId" element={<EmployeeChatPage />} />
                      <Route path="chat" element={<Navigate to="/dashboard/chat/prime" replace />} />
                      <Route path="blitz" element={<EmployeeChatPage />} />
                      
                      {/* Catch-all: 404 for unmatched dashboard routes */}
                      <Route path="*" element={<Suspense fallback={<LoadingSpinner />}><NotFoundPage /></Suspense>} />
                      {/* <Route path="three-column-demo" element={<ThreeColumnDashboardDemo />} /> */}
                      {/* <Route path="financial-story" element={<FinancialStoryPage />} /> */}
                      {/* <Route path="bank-accounts" element={<BankAccountsPage />} /> */}
                      {/* <Route path="goal-concierge" element={<GoalConciergePage />} /> */}
                      {/* <Route path="ai-categorization" element={<AICategorizationPage />} /> */}
                      {/* <Route path="smart-categories" element={<AICategorizationPage />} /> */}
                      {/* <Route path="bill-reminders" element={<BillRemindersPage />} /> */}
                      {/* <Route path="debt-payoff-planner" element={<DebtPayoffPlannerPage />} /> */}
                      {/* <Route path="ai-financial-freedom" element={<AIFinancialFreedomPage />} /> */}
                      {/* <Route path="personal-podcast" element={<PersonalPodcastPage />} /> */}
                      {/* <Route path="podcast" element={<PersonalPodcastPage />} /> */}
                      {/* <Route path="smart-automation" element={<SmartAutomation />} /> */}
                      {/* <Route path="analytics" element={<Analytics key="analytics" />} /> */}
                      {/* <Route path="settings" element={<Settings />} /> */}
                      {/* <Route path="reports" element={<Reports />} /> */}
                      {/* <Route path="spotify" element={<SpotifyIntegrationDashboardPage />} /> */}
                      {/* <Route path="spotify-integration" element={<SpotifyIntegrationPage />} /> */}
                      {/* <Route path="spotify-integration-new" element={<SpotifyIntegrationPage />} /> */}
                      {/* <Route path="wellness-studio" element={<WellnessStudioPage />} /> */}
                      {/* <Route path="financial-therapist" element={<FinancialTherapistPage />} /> */}
                      {/* <Route path="tax-assistant" element={<TaxAssistantPage />} /> */}
                      {/* <Route path="business-intelligence" element={<BusinessIntelligencePage />} /> */}
                    </Route>
                    </Routes>
                    </Suspense>
                  </ErrorBoundary>
                
                {/* Global Therapist Components */}
                {therapistTrigger && <TherapistNotification />}
                <TherapistModal />

                {/* Dev Tools Panel removed for clean production UI */}
                {/* <DevPanel /> */}

                {/* Global Jobs System - Jobs Drawer (Pulse button integrated into DesktopChatSideBar) */}
                <JobsDrawer />

                {/* Prime chat mount moved into DashboardLayout */}
                    </RightPanelProvider>
                  </DevToolsProvider>
                </WorkspaceProvider>
                    </RouteTransitionProvider>
                  </OnboardingUIProvider>
                </ProfileProvider>
              </UserProvider>
            </AIFinancialAssistantProvider>
          </PersonalPodcastProvider>
        </AudioProvider>
      </BossProvider>
  );
}

export default App;


