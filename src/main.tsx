
import { CHAT_CONTRACT_VERSION } from "./chat/chatContract";


import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';

import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
// Legacy chat mounts removed - now using UnifiedAssistantChat from DashboardLayout
// import PrimeChatMount from './ui/components/PrimeChatMount';
// import PrimeChatV2Mount from './components/prime/PrimeChatV2Mount';
import { PRIME_CHAT_V2 } from './lib/flags';
import './styles.css';
import './styles/mobile-menu-static.css';
import './utils/assertSingleMobileNav';
console.info("[ChatContract]", CHAT_CONTRACT_VERSION);

// Legacy PrimeChatV2 flag check removed - unified chat is always enabled

// Dev-only: StrictMode removed to reduce noisy double-invoked effects while stabilizing OCR.

// Dev-only route classification self-check
if (import.meta.env.DEV) {
  import('./hooks/__tests__/routeClassificationSelfCheck').then(({ runRouteClassificationSelfCheck }) => {
    runRouteClassificationSelfCheck();
  }).catch(() => {
    // Ignore if test file doesn't exist or fails to load
  });
}

// Import Montserrat font from Google Fonts
const link = document.createElement('link');
link.rel = 'preconnect';
link.href = 'https://fonts.googleapis.com';
document.head.appendChild(link);

const link2 = document.createElement('link');
link2.rel = 'preconnect';
link2.href = 'https://fonts.gstatic.com';
link2.crossOrigin = 'anonymous';
document.head.appendChild(link2);

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap';
document.head.appendChild(fontLink);

// QUIET MODE: Global console muting in DEV (intentional, reversible)
// Purpose: Suppress console spam during OCR/Smart Import debugging
// This is NOT a bug - it's a feature flag that gates console output
// Re-enable: Remove VITE_CHAT_QUIET_MODE from .env.local or set to false
// Note: console.error() remains active (never muted)
const QUIET =
  (import.meta as any)?.env?.VITE_CHAT_QUIET_MODE === 'true' ||
  (import.meta as any)?.env?.VITE_QUIET_MODE === 'true';

if (import.meta.env.DEV && QUIET) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  // keep console.error ON (errors must always print)
}

const AppWrapper = (
  <HelmetProvider>
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <App />
        {PRIME_CHAT_V2 ? null : null}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: 'white',
              },
            }
          }}
        />
      </AuthProvider>
    </Router>
  </HelmetProvider>
);

createRoot(document.getElementById('root')!).render(
  AppWrapper
);
