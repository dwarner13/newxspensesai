import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { therapistTriggerAtom, isTherapistModalOpenAtom } from './lib/uiStore';
import TherapistNotification from './components/therapist/TherapistNotification';
import TherapistModal from './components/therapist/TherapistModal';
import AppLayout from './components/layout/AppLayout';
import DashboardLayout from './layouts/DashboardLayout';
import MarketingLayout from './layouts/MarketingLayout';
import { ErrorBoundary } from './components/util/ErrorBoundary';

import { AuthProvider } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import { PersonalPodcastProvider } from './contexts/PersonalPodcastContext';
import { AIFinancialAssistantProvider } from './contexts/AIFinancialAssistantContext';
import { UserProvider } from './contexts/UserContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { BossProvider } from './lib/agents/context';
import MobileLayoutGate from './components/layout/MobileLayoutGate';
import MobileRevolution from './components/mobile/MobileRevolution';
import DesktopDashboard from './components/DesktopDashboard';
import RouteScrollReset from './components/util/RouteScrollReset';

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

// Lazy load non-critical components
// const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
// const AIFinancialAssistantPage = lazy(() => import('./pages/dashboard/AIFinancialAssistantPage'));
// const SmartImportAIPage = lazy(() => import('./pages/dashboard/SmartImportAIPage'));
// const FinancialStoryPage = lazy(() => import('./pages/dashboard/FinancialStoryPage'));
// const DashboardTransactionsPage = lazy(() => import('./pages/dashboard/DashboardTransactionsPage'));
// const BankAccountsPage = lazy(() => import('./pages/dashboard/BankAccountsPage'));
// const GoalConciergePage = lazy(() => import('./pages/dashboard/GoalConciergePage'));
// const ThreeColumnDashboardDemo = lazy(() => import('./components/layout/ThreeColumnDashboardDemo'));
// const SpendingPredictionsPage = lazy(() => import('./pages/dashboard/SpendingPredictionsPage'));
// const AICategorizationPage = lazy(() => import('./pages/dashboard/AICategorizationPage'));
// const BillRemindersPage = lazy(() => import('./pages/dashboard/BillRemindersPage'));
// const DebtPayoffPlannerPage = lazy(() => import('./pages/dashboard/DebtPayoffPlannerPage'));
// const FinancialTherapistPage = lazy(() => import('./pages/dashboard/FinancialTherapistPage'));
// const TherapistDemoPage = lazy(() => import('./pages/dashboard/TherapistDemoPage'));
// const PersonalPodcastPage = lazy(() => import('./pages/dashboard/PersonalPodcastPage'));
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
// const TaxAssistantPage = lazy(() => import('./pages/dashboard/TaxAssistant')); // 🚀🚀🚀 BRAND NEW VERSION
// const BusinessIntelligence = lazy(() => import('./pages/features/business-intelligence'));
// const BusinessIntelligencePage = lazy(() => import('./pages/dashboard/BusinessIntelligence'));
const PrimeLabPage = lazy(() => import('./ui/pages/PrimeLabPage'));
// const TeamRoom = lazy(() => import('./pages/dashboard/TeamRoom'));
// const SmartAutomation = lazy(() => import('./pages/dashboard/SmartAutomation'));
// const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
// const Settings = lazy(() => import('./pages/dashboard/Settings'));
// const ReportsPage = lazy(() => import('./pages/ReportsPage'));
// const Reports = lazy(() => import('./pages/dashboard/Reports'));
// const ViewTransactionsPage = lazy(() => import('./pages/ViewTransactionsPage'));
// const AIFinancialFreedomPage = lazy(() => import('./pages/dashboard/AIFinancialFreedomPage'));
// const AIFinancialFreedomFeaturePage = lazy(() => import('./pages/features/ai-financial-freedom'));
// const AIEmployees = lazy(() => import('./pages/AIEmployees'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
// const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
// const PricingPage = lazy(() => import('./pages/PricingPage'));

// Spotify integration components
const SpotifyCallbackPage = lazy(() => import('./pages/SpotifyCallbackPage'));
const SpotifyPlayerPage = lazy(() => import('./pages/SpotifyPlayerPage'));
// const SpotifyIntegrationPage = lazy(() => import('./pages/dashboard/SpotifyIntegrationPage'));

// Feature pages - lazy load as they're less critical
// const SmartImportAIFeaturePage = lazy(() => import('./pages/features/smart-import-ai'));
// const SpendingPredictionsFeaturePage = lazy(() => import('./archived/SpendingPredictionsFeaturePage'));
// const SpotifyIntegrationFeaturePage = lazy(() => import('./pages/features/spotify-integration'));
// const SpotifyIntegrationDashboardPage = lazy(() => import('./pages/dashboard/SpotifyIntegrationDashboard'));
// const AIInsightsFeaturePage = lazy(() => import('./pages/features/AIInsightsPage'));
// const EmailReceiptsFeaturePage = lazy(() => import('./pages/features/EmailReceiptsPage'));
// const PersonalBusinessGoalsFeaturePage = lazy(() => import('./pages/features/PersonalBusinessGoalsPage'));
// const SmartAutomationFeaturePage = lazy(() => import('./pages/features/smart-automation'));
// const BusinessExpenseIntelligenceFeaturePage = lazy(() => import('./pages/features/BusinessExpenseIntelligencePage'));
// const FreelancerTaxFeaturePage = lazy(() => import('./pages/features/freelancer-tax'));
// const WellnessStudioFeaturePage = lazy(() => import('./pages/features/wellness-studio'));
// const WellnessStudioPage = lazy(() => import('./pages/dashboard/WellnessStudioPage'));
// const GoalConciergeFeaturePage = lazy(() => import('./pages/features/goal-concierge'));
// const PersonalPodcastFeaturePage = lazy(() => import('./pages/features/personal-podcast'));
// const FinancialStoryFeaturePage = lazy(() => import('./pages/features/financial-story'));
// const PodcastPage = lazy(() => import('./pages/features/podcast'));
// const GamificationFeaturePage = lazy(() => import('./pages/features/gamification'));
// const BusinessExpensesFeaturePage = lazy(() => import('./pages/features/business-expenses'));
// const AITherapistFeaturePage = lazy(() => import('./pages/features/ai-therapist'));
// const AICoachFeaturePage = lazy(() => import('./pages/features/ai-coach'));
// const AIGoalsFeaturePage = lazy(() => import('./pages/features/ai-goals'));
// const AIAssistantFeaturePage = lazy(() => import('./pages/features/ai-assistant'));
// const VoiceControlFeaturePage = lazy(() => import('./pages/features/voice-control'));
// const SocialMoneyFeaturePage = lazy(() => import('./pages/features/social-money'));
// const PredictionsFeaturePage = lazy(() => import('./pages/features/predictions'));
// const AICategorizationFeaturePage = lazy(() => import('./pages/features/ai-categorization'));
// const BillRemindersFeaturePage = lazy(() => import('./pages/features/bill-reminders'));
// const DebtPayoffPlannerFeaturePage = lazy(() => import('./pages/features/debt-payoff-planner'));
// const AutomationFeaturePage = lazy(() => import('./pages/features/automation'));
// const PodcastGeneratorFeaturePage = lazy(() => import('./pages/features/podcast-generator'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
    {/* Prime's Crown with Glow Effect */}
    <div className="relative mb-8">
      <div className="w-32 h-32 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
        <span className="text-6xl">👑</span>
      </div>
      {/* Glow effect around the crown */}
      <div className="absolute inset-0 w-32 h-32 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
    </div>
    
    {/* Loading Message */}
    <div className="text-center mb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
        Connecting to AI...
      </h1>
      <p className="text-lg text-white/80 max-w-md mx-auto">
        Assembling your AI dream team under Prime's leadership
      </p>
    </div>
    
    {/* Loading Progress Bar */}
    <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-8">
      <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full animate-pulse"></div>
    </div>
    
    {/* Loading Stages */}
    <div className="text-center space-y-2">
      <div className="text-white/70 text-sm animate-pulse">
        🔍 Initializing AI systems...
      </div>
      <div className="text-white/70 text-sm animate-pulse">
        🧠 Loading financial intelligence...
      </div>
      <div className="text-white/70 text-sm animate-pulse">
        👥 Assembling your AI team...
      </div>
    </div>
  </div>
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
  
  // Calculate scrollbar width for fixed elements
  useScrollbarWidth();
  
  return (
    <BossProvider>
      <AuthProvider>
        <AudioProvider>
          <PersonalPodcastProvider>
            <AIFinancialAssistantProvider>
              <UserProvider>
                <WorkspaceProvider>
                <ScrollToTop />
                <ErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      {/* Marketing routes with BossBubble */}
                      <Route element={<MarketingLayout />}>
                        <Route path="/" element={<HomePage />} />
                        {/* <Route path="/ai-assistant" element={<AIAssistantPage />} /> */}
                        <Route path="/contact" element={<ContactPage />} />
                        {/* <Route path="/reviews" element={<ReviewsPage />} /> */}
                        {/* <Route path="/pricing" element={<PricingPage />} /> */}
                        
                        {/* Spotify integration routes */}
                        <Route path="/callback" element={<SpotifyCallbackPage />} />
                        <Route path="/spotify/callback" element={<SpotifyCallbackPage />} />
                        <Route path="/spotify-player" element={<SpotifyPlayerPage />} />
                        
                        {/* Reports route - redirect to dashboard */}
                        <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
                        
                        {/* OCR Tester routes */}
                        <Route path="/ocr-tester" element={<OCRTesterPage />} />
                        <Route path="/local-ocr-test" element={<LocalOCRTester />} />
                        
            <Route path="/debug/mobile" element={<MobileCheck />} />
            <Route path="/debug/mobile-test" element={<MobileTest />} />
            <Route path="/debug/navcheck" element={<NavCheck />} />
                      {/* <Route path="/debug/sheet" element={<SheetCheck />} /> */}
                        
                        {/* Prime AI Test Page */}
                        {/* <Route path="/test/prime-ai" element={<PrimeAITestPage />} /> */}
                        
                        {/* Prime Lab Page */}
                        <Route path="/prime-lab" element={<PrimeLabPage />} />
                        
                                              {/* Feature pages */}
                      {/* <Route path="/features/smart-import" element={<SmartImportAIFeaturePage />} /> */}
                      {/* <Route path="/features/smart-import-ai" element={<SmartImportAIFeaturePage />} /> */}
                      {/* <Route path="/features/spending-predictions" element={<PredictionsFeaturePage />} /> */}
                      {/* <Route path="/features/spotify-integration" element={<SpotifyIntegrationFeaturePage />} /> */}
                      {/* <Route path="/features/ai-insights" element={<AIInsightsFeaturePage />} /> */}
                      {/* <Route path="/features/email-receipts" element={<EmailReceiptsFeaturePage />} /> */}
                      {/* <Route path="/features/personal-business-goals" element={<PersonalBusinessGoalsFeaturePage />} /> */}
                      {/* <Route path="/features/smart-automation" element={<SmartAutomationFeaturePage />} /> */}
                      {/* <Route path="/features/business-expense-intelligence" element={<BusinessExpenseIntelligenceFeaturePage />} /> */}
                      {/* <Route path="/features/freelancer-tax" element={<FreelancerTaxFeaturePage />} /> */}
                      {/* <Route path="/features/wellness-studio" element={<WellnessStudioFeaturePage />} /> */}
                      {/* <Route path="/features/goal-concierge" element={<GoalConciergeFeaturePage />} /> */}
                      {/* <Route path="/features/personal-podcast" element={<PersonalPodcastFeaturePage />} /> */}
                      {/* <Route path="/features/financial-story" element={<FinancialStoryFeaturePage />} /> */}
                      {/* <Route path="/features/podcast" element={<PodcastPage />} /> */}
                      {/* <Route path="/features/gamification" element={<GamificationFeaturePage />} /> */}
                      {/* <Route path="/features/business-expenses" element={<BusinessExpensesFeaturePage />} /> */}
                      {/* <Route path="/features/ai-therapist" element={<AITherapistFeaturePage />} /> */}
                      {/* <Route path="/features/ai-coach" element={<AICoachFeaturePage />} /> */}
                      {/* <Route path="/features/ai-goals" element={<AIGoalsFeaturePage />} /> */}
                      {/* <Route path="/features/ai-assistant" element={<AIAssistantFeaturePage />} /> */}
                      {/* <Route path="/features/ai-categorization" element={<AICategorizationFeaturePage />} /> */}
                      {/* <Route path="/features/bill-reminders" element={<BillRemindersFeaturePage />} /> */}
                      {/* <Route path="/features/debt-payoff-planner" element={<DebtPayoffPlannerFeaturePage />} /> */}
                      {/* <Route path="/features/ai-financial-freedom" element={<AIFinancialFreedomFeaturePage />} /> */}
                      {/* <Route path="/features/tax-assistant" element={<TaxAssistant />} /> */}
                      {/* <Route path="/features/business-intelligence" element={<BusinessIntelligence />} /> */}
                      {/* <Route path="/features/voice-control" element={<VoiceControlFeaturePage />} /> */}
                      {/* <Route path="/features/social-money" element={<SocialMoneyFeaturePage />} /> */}
                      {/* <Route path="/features/predictions" element={<PredictionsFeaturePage />} /> */}
                      {/* <Route path="/features/automation" element={<AutomationFeaturePage />} /> */}
                      {/* <Route path="/features/podcast-generator" element={<PodcastGeneratorFeaturePage />} /> */}
                      
                      {/* AI Employees page */}
                      {/* <Route path="/ai-employees" element={<AIEmployees />} /> */}
                    </Route>
                    
                    {/* Dashboard routes with persistent layout - Each route shows its specific page */}
                    <Route path="/dashboard" element={
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
                      <Route index element={<XspensesProDashboard />} />
                      {/* <Route path="three-column-demo" element={<ThreeColumnDashboardDemo />} /> */}
                      <Route path="ai-assistant" element={<Navigate to="/dashboard/ai-financial-assistant" replace />} />
                      {/* <Route path="ai-financial-assistant" element={<AIFinancialAssistantPage />} /> */}
                      {/* <Route path="financial-story" element={<FinancialStoryPage />} /> */}
                      {/* <Route path="transactions" element={<DashboardTransactionsPage />} /> */}
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
                </WorkspaceProvider>
              </UserProvider>
          </AIFinancialAssistantProvider>
        </PersonalPodcastProvider>
      </AudioProvider>
    </AuthProvider>
    </BossProvider>
  );
}

export default App;


