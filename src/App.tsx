import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AppWithAuth } from './contexts/AuthContext';
import { AudioProvider } from './contexts/AudioContext';
import { PersonalPodcastProvider } from './contexts/PersonalPodcastContext';
import { AIFinancialAssistantProvider } from './contexts/AIFinancialAssistantContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { lazy, Suspense } from 'react';
import { ReactNode } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { useEffect } from 'react';
import { mockModeAtom } from './utils/mockState';
import { motion, AnimatePresence } from 'framer-motion';
import { isMobileMenuOpenAtom } from './lib/uiStore';

import AppLayout from './components/layout/AppLayout';
import { FloatingAudioPlayer } from './components/audio/FloatingAudioPlayer';
import { AudioTriggerSystem } from './components/audio/AudioTriggerSystem';

// Public pages
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LogoutPage from './pages/LogoutPage';
import NewHomePage from './pages/NewHomePage';
import SignupPage from './pages/SignupPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CancelPage from "./pages/CancelPage"; // Adjust the path if needed
const SuccessPage = lazy(() => import("./pages/SuccessPage"));

// Lazy loaded pages
const XspensesAIDashboard = lazy(() => import('./components/XspensesAIDashboard'));
const XspensesAIDashboardDemo = lazy(() => import('./components/XspensesAIDashboardDemo'));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const StandalonePricingPage = lazy(() => import("./pages/StandalonePricingPage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const AIDemoPage = lazy(() => import("./pages/AIDemoPage"));
const SmartUploadDemo = lazy(() => import("./components/SmartUploadDemo"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const ReceiptsPage = lazy(() => import("./pages/ReceiptsPage"));
const ScanReceiptPage = lazy(() => import("./pages/ScanReceiptPage"));
const AIInsightsPage = lazy(() => import("./pages/AIInsightsPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const TrashPage = lazy(() => import("./pages/TrashPage"));
const MonthPage = lazy(() => import("./pages/months/MonthPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const AudioEntertainmentPage = lazy(() => import("./pages/AudioEntertainmentPage"));
const PersonalPodcastPage = lazy(() => import("./pages/PersonalPodcastPage"));

// Settings pages
const SettingsIndex = lazy(() => import('./settings/SettingsIndex'));
const SecurityAccess = lazy(() => import('./settings/SecurityAccess'));
const AiPreferences = lazy(() => import('./settings/AiPreferences'));
const SmartAutomations = lazy(() => import('./settings/SmartAutomations'));
const GoalSettings = lazy(() => import('./settings/GoalSettings'));
const NotificationsAlerts = lazy(() => import('./settings/NotificationsAlerts'));
const OcrReceiptSettings = lazy(() => import('./settings/OcrReceiptSettings'));
const Localization = lazy(() => import('./settings/Localization'));
const BusinessMode = lazy(() => import('./settings/BusinessMode'));
const IntegrationsApis = lazy(() => import('./settings/IntegrationsApis'));
const ExportBackup = lazy(() => import('./settings/ExportBackup'));
const TeamAccess = lazy(() => import('./settings/TeamAccess'));
const BillingUsage = lazy(() => import('./settings/BillingUsage'));

// Lazy loaded feature pages
const AIAssistantFeaturePage = lazy(() => import('./pages/features/ai-assistant'));
const PersonalPodcastFeaturePage = lazy(() => import('./pages/features/personal-podcast'));
const AITherapistFeaturePage = lazy(() => import('./pages/features/ai-therapist'));
const PredictionsFeaturePage = lazy(() => import('./pages/features/predictions'));
const VoiceControlFeaturePage = lazy(() => import('./pages/features/voice-control'));
const SpotifyIntegrationFeaturePage = lazy(() => import('./pages/features/spotify-integration'));
const WellnessStudioFeaturePage = lazy(() => import('./pages/features/wellness-studio'));
const GamificationFeaturePage = lazy(() => import('./pages/features/gamification'));
const AutomationFeaturePage = lazy(() => import('./pages/features/automation'));
const SocialMoneyFeaturePage = lazy(() => import('./pages/features/social-money'));
const SmartImportAIPage = lazy(() => import('./pages/features/SmartImportAIPage'));
const AIGoalConciergePage = lazy(() => import('./pages/GoalsPage'));
const PodcastGeneratorPage = lazy(() => import('./pages/features/podcast-generator'));
const FreelancerTaxAssistantPage = lazy(() => import('./pages/features/freelancer-tax'));
const GoalConciergePage = lazy(() => import('./pages/features/goal-concierge'));
const BusinessExpenseIntelligencePage = lazy(() => import('./pages/features/BusinessExpenseIntelligencePage'));
const SpendingPredictionsPage = lazy(() => import('./pages/features/SpendingPredictionsPage'));
const SmartAutomationPage = lazy(() => import('./pages/features/SmartAutomationPage'));

// Lazy load new pages
const About = lazy(() => import('./pages/AboutPage'));
const Contact = lazy(() => import('./pages/ContactPage'));
const Privacy = lazy(() => import('./pages/PrivacyPage'));
const Terms = lazy(() => import('./pages/TermsOfServicePage'));
const Security = lazy(() => import('./pages/SecurityPage'));
const Help = lazy(() => import('./pages/HelpPage'));
const Blog = lazy(() => import('./pages/BlogPage'));
const Careers = lazy(() => import('./pages/CareersPage'));
const Status = lazy(() => import('./pages/StatusPage'));
const CaseStudies = lazy(() => import('./pages/CaseStudiesPage'));
const DemoRequest = lazy(() => import('./pages/DemoRequestPage'));
const Integrations = lazy(() => import('./pages/IntegrationsPage'));
const Resources = lazy(() => import('./pages/ResourcesPage'));
const Compare = lazy(() => import('./pages/ComparePage'));

// Loading spinner with smooth animation
const LoadingFallback = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex items-center justify-center min-h-screen bg-gray-50"
  >
    <div className="text-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full mb-4"
      />
      <p className="text-gray-600">Loading...</p>
    </div>
  </motion.div>
);

function App() {
  const setMockMode = useSetAtom(mockModeAtom);
  useEffect(() => {
    setMockMode(true); // Enable mock mode globally
  }, [setMockMode]);
  

  
  return (
    <AIFinancialAssistantProvider>
      <PersonalPodcastProvider>
        <AudioProvider>
          <AppWithAuth>
            <AuthProvider>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<NewHomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/logout" element={<LogoutPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/success" element={<SuccessPage />} />
                  <Route path="/cancel" element={<CancelPage />} />
                  <Route 
                    path="/pricing" 
                    element={<PricingPage />}
                  />
                  <Route 
                    path="/features" 
                    element={<FeaturesPage />}
                  />
                  <Route 
                    path="/features/ai-assistant" 
                    element={<AIAssistantFeaturePage />}
                  />
                  <Route 
                    path="/features/personal-podcast" 
                    element={<PersonalPodcastFeaturePage />}
                  />
                  <Route 
                    path="/features/ai-therapist" 
                    element={<AITherapistFeaturePage />}
                  />
                  <Route 
                    path="/features/predictions" 
                    element={<PredictionsFeaturePage />}
                  />
                  <Route 
                    path="/features/voice-control" 
                    element={<VoiceControlFeaturePage />}
                  />
                  <Route 
                    path="/features/spotify-integration" 
                    element={<SpotifyIntegrationFeaturePage />}
                  />
                  <Route 
                    path="/features/wellness-studio" 
                    element={<WellnessStudioFeaturePage />}
                  />
                  <Route 
                    path="/features/gamification" 
                    element={<GamificationFeaturePage />}
                  />
                  <Route 
                    path="/features/automation" 
                    element={<AutomationFeaturePage />}
                  />
                  <Route 
                    path="/features/social-money" 
                    element={<SocialMoneyFeaturePage />}
                  />
                  <Route 
                    path="/features/smart-import-ai" 
                    element={<SmartImportAIPage />}
                  />
                  <Route 
                    path="/features/goal-concierge" 
                    element={<AIGoalConciergePage />}
                  />
                  <Route 
                    path="/features/ai-goal-concierge" 
                    element={<AIGoalConciergePage />}
                  />
                  <Route 
                    path="/features/podcast-generator" 
                    element={<PodcastGeneratorPage />} 
                  />
                  <Route 
                    path="/features/freelancer-tax" 
                    element={<FreelancerTaxAssistantPage />}
                  />
                  <Route 
                    path="/features/goal-concierge" 
                    element={<GoalConciergePage />}
                  />
                  <Route 
                    path="/features/business-expense-intelligence" 
                    element={<BusinessExpenseIntelligencePage />}
                  />
                  <Route 
                    path="/features/business-intelligence" 
                    element={<BusinessExpenseIntelligencePage />}
                  />
                  <Route 
                    path="/features/spending-predictions" 
                    element={<SpendingPredictionsPage />}
                  />
                  <Route 
                    path="/features/smart-automation" 
                    element={<SmartAutomationPage />}
                  />
                  <Route 
                    path="/reviews" 
                    element={<ReviewsPage />}
                  />
                  <Route 
                    path="/ai-demo" 
                    element={<AIDemoPage />}
                  />
                  <Route 
                    path="/dashboard-demo" 
                    element={<Suspense fallback={<LoadingFallback />}><XspensesAIDashboardDemo /></Suspense>}
                  />
                  <Route 
                    path="/about" 
                    element={<AboutPage />}
                  />
                  <Route 
                    path="/contact" 
                    element={<ContactPage />}
                  />
                  <Route 
                    path="/help" 
                    element={<HelpPage />}
                  />
                  <Route path="/about" element={<Suspense fallback={null}><About /></Suspense>} />
                  <Route path="/contact" element={<Suspense fallback={null}><Contact /></Suspense>} />
                  <Route path="/privacy" element={<Suspense fallback={null}><Privacy /></Suspense>} />
                  <Route path="/terms" element={<Suspense fallback={null}><Terms /></Suspense>} />
                  <Route path="/security" element={<Suspense fallback={null}><Security /></Suspense>} />
                  <Route path="/help" element={<Suspense fallback={null}><Help /></Suspense>} />
                  <Route path="/blog" element={<Suspense fallback={null}><Blog /></Suspense>} />
                  <Route path="/careers" element={<Suspense fallback={null}><Careers /></Suspense>} />
                  <Route path="/status" element={<Suspense fallback={null}><Status /></Suspense>} />
                  <Route path="/case-studies" element={<Suspense fallback={null}><CaseStudies /></Suspense>} />
                  <Route path="/demo" element={<Suspense fallback={null}><DemoRequest /></Suspense>} />
                  <Route path="/integrations" element={<Suspense fallback={null}><Integrations /></Suspense>} />
                  <Route path="/resources" element={<Suspense fallback={null}><Resources /></Suspense>} />
                  <Route path="/compare" element={<Suspense fallback={null}><Compare /></Suspense>} />
                  
                  {/* Settings Routes */}
                  <Route
                    path="/settings"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <SettingsIndex />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/security-access"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <SecurityAccess />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/ai-preferences"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <AiPreferences />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/smart-automations"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <SmartAutomations />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/goal-settings"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <GoalSettings />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/notifications-alerts"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <NotificationsAlerts />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/ocr-receipt-settings"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <OcrReceiptSettings />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/localization"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <Localization />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/business-mode"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <BusinessMode />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/integrations-apis"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <IntegrationsApis />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/export-backup"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <ExportBackup />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/team-access"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <TeamAccess />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/settings/billing-usage"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <BillingUsage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <AuthGuard>
                        <XspensesAIDashboard />
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <TransactionsPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/upload"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <UploadPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/receipts"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <ReceiptsPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/scan-receipt"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <ScanReceiptPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/ai-insights"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <AIInsightsPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/ai-assistant"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <AIAssistantPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/subscription"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <SubscriptionPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/trash"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <TrashPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/goals"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <GoalsPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/audio"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <AudioEntertainmentPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/personal-podcast"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <PersonalPodcastPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  
                  {/* Month Routes */}
                  <Route
                    path="/months/:month"
                    element={
                      <AuthGuard>
                        <AppLayout>
                          <MonthPage />
                        </AppLayout>
                      </AuthGuard>
                    }
                  />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                
                {/* Audio Components */}
                <FloatingAudioPlayer />
                <AudioTriggerSystem 
                  currentPage={location.pathname.split('/')[1] || 'dashboard'}
                />
              </Suspense>
            </AuthProvider>
          </AppWithAuth>
        </AudioProvider>
      </PersonalPodcastProvider>
    </AIFinancialAssistantProvider>
  );
}

export default App;


