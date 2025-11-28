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
import RouteScrollReset from './components/util/RouteScrollReset';
import { isPrimeV2Enabled } from './env';
import { DevToolsProvider } from './contexts/DevToolsContext';
import DevPanel from './components/dev/DevPanel';

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
// import AnalyticsPage from './pages/dashboard/AnalyticsPage'; // Old import
const AnalyticsPage = lazy(() => import('./pages/dashboard/AnalyticsPage'));
import BusinessPage from './pages/dashboard/BusinessPage';
import EntertainmentPage from './pages/dashboard/EntertainmentPage';
// import ReportsPage from './pages/dashboard/ReportsPage'; // Old import
const ReportsPage = lazy(() => import('./pages/dashboard/ReportsPage'));
import TestPage from './pages/dashboard/TestPage';

// Lazy load non-critical components
// const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const AIFinancialAssistantPage = lazy(() => import('./pages/dashboard/AIFinancialAssistantPage'));
const SmartImportAIPage = lazy(() => import('./pages/dashboard/SmartImportAIPage'));
const FinancialStoryPage = lazy(() => import('./pages/dashboard/FinancialStoryPage'));
const DashboardTransactionsPage = lazy(() => import('./pages/dashboard/DashboardTransactionsPage'));
const TransactionsPage = lazy(() => import('./pages/dashboard/TransactionsPage'));
// const BankAccountsPage = lazy(() => import('./pages/dashboard/BankAccountsPage'));
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
// const PrimeLabPage = lazy(() => import('./ui/pages/PrimeLabPage')); // Hidden - using Centralized Chat Runtime instead
// const TeamRoom = lazy(() => import('./pages/dashboard/TeamRoom'));
const SmartAutomation = lazy(() => import('./pages/dashboard/SmartAutomation'));
const Analytics = lazy(() => import('./pages/dashboard/Analytics'));
// const Settings = lazy(() => import('./pages/dashboard/Settings')); // Old import
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
// const ReportsPage = lazy(() => import('./pages/ReportsPage'));
// const Reports = lazy(() => import('./pages/dashboard/Reports'));
// const ViewTransactionsPage = lazy(() => import('./pages/ViewTransactionsPage'));
const AIFinancialFreedomPage = lazy(() => import('./pages/dashboard/AIFinancialFreedomPage'));
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
  const [isPrimeOpen, setIsPrimeOpen] = useState(false);
  
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
                  <DevToolsProvider>
                    <ScrollToTop />
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                      {/* Marketing routes with BossBubble */}
                      <Route element={<MarketingLayout />}>
                        <Route path="/" element={<HomePage />} />
                        {/* <Route path="/ai-assistant" element={<AIAssistantPage />} /> */}
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        
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
                      
                      {/* Test Route */}
                      <Route path="test" element={<TestPage />} />
                      
                      {/* Main Dashboard Pages */}
                      <Route path="overview" element={<OverviewPage />} />
                      <Route path="workspace" element={<WorkspacePage />} />
                      <Route path="planning" element={<PlanningPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="business" element={<BusinessPage />} />
                      <Route path="entertainment" element={<EntertainmentPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      
                      {/* AI Workspace Pages */}
                      <Route path="prime-chat" element={<PrimeChatPage />} />
                      <Route path="smart-import-ai" element={<SmartImportChatPage />} />
                      <Route path="ai-chat-assistant" element={<AIChatAssistantPage />} />
                      <Route path="ai-financial-assistant" element={<AIChatAssistantPage />} />
                      <Route path="ai-assistant" element={<Navigate to="/dashboard/ai-chat-assistant" replace />} />
                      <Route path="smart-categories" element={<SmartCategoriesPage />} />
                      <Route path="ai-categorization" element={<SmartCategoriesPage />} />
                      <Route path="analytics-ai" element={<AnalyticsAI />} />
                      <Route path="ai-financial-freedom" element={<AIFinancialFreedomPage />} />
                      
                      {/* Planning & Analysis */}
                      <Route path="transactions" element={<TransactionsPage />} />
                      <Route path="goal-concierge" element={<GoalConciergePage />} />
                      <Route path="smart-automation" element={<SmartAutomation />} />
                      <Route path="spending-predictions" element={<SpendingPredictionsPage />} />
                      <Route path="debt-payoff-planner" element={<DebtPayoffPlannerPage />} />
                      <Route path="bill-reminders" element={<BillRemindersPage />} />
                      
                      {/* Entertainment & Wellness */}
                      <Route path="personal-podcast" element={<PersonalPodcastPage />} />
                      <Route path="financial-story" element={<FinancialStoryPage />} />
                      <Route path="financial-therapist" element={<AIFinancialTherapistPage />} />
                      <Route path="wellness-studio" element={<WellnessStudioPage />} />
                      <Route path="spotify" element={<SpotifyIntegrationPage />} />
                      
                      {/* Business & Tax */}
                      <Route path="tax-assistant" element={<TaxAssistantPage />} />
                      <Route path="business-intelligence" element={<BusinessIntelligencePage />} />
                      {/* Employee Chat Routes */}
                      <Route path="chat/:employeeId" element={<EmployeeChatPage />} />
                      <Route path="chat" element={<Navigate to="/dashboard/chat/prime" replace />} />
                      <Route path="blitz" element={<EmployeeChatPage />} />
                      {/* <Route path="three-column-demo" element={<ThreeColumnDashboardDemo />} /> */}
                      <Route path="ai-assistant" element={<Navigate to="/dashboard/ai-financial-assistant" replace />} />
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

                {/* Prime chat mount moved into DashboardLayout */}
                  </DevToolsProvider>
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


