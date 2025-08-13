import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const mainPages = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Upload', path: '/upload' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Receipts', path: '/receipts' },
  { label: 'AI Insights', path: '/ai-insights' },
  { label: 'Goals', path: '/goals' },
          { label: 'Reports', path: '/dashboard/reports' },
];

const settingsPages = [
  { label: 'Security & Access', path: '/settings/security-access' },
  { label: 'AI Preferences', path: '/settings/ai-preferences' },
  { label: 'Smart Automations', path: '/settings/smart-automations' },
  { label: 'Goal Settings', path: '/settings/goals' },
  { label: 'Notifications & Alerts', path: '/settings/notifications-alerts' },
  { label: 'OCR & Receipt Settings', path: '/settings/ocr' },
  { label: 'Localization', path: '/settings/localization' },
  { label: 'Business Mode', path: '/settings/business-mode' },
  { label: 'Integrations & APIs', path: '/settings/integrations-apis' },
  { label: 'Export & Backup', path: '/settings/export-backup' },
  { label: 'Team Access', path: '/settings/team-access' },
  { label: 'Billing & Usage', path: '/settings/billing-usage' },
];

const allPages = [...mainPages, ...settingsPages];

export default function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentIdx = allPages.findIndex(p => location.pathname.startsWith(p.path));
  const pageTitle = allPages[currentIdx]?.label || 'XspensesAI';

  // Find which array we're in for cycling
  const isSettings = settingsPages.some(p => location.pathname.startsWith(p.path));
  const pages = isSettings ? settingsPages : mainPages;
  const idx = pages.findIndex(p => location.pathname.startsWith(p.path));

  const goPrev = () => {
    if (idx > -1) {
      navigate(pages[(idx - 1 + pages.length) % pages.length].path);
    }
  };
  const goNext = () => {
    if (idx > -1) {
      navigate(pages[(idx + 1) % pages.length].path);
    }
  };

  return (
    <div className="w-full bg-gray-900 rounded-lg shadow-md px-6 py-4 flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {pageTitle}
        </h1>
        <div className="flex gap-2">
          <button
            className="p-2 rounded-full hover:bg-gray-800 transition text-white"
            aria-label="Previous page"
            onClick={goPrev}
          >
            <ArrowLeft size={24} />
          </button>
          <button
            className="p-2 rounded-full hover:bg-gray-800 transition text-white"
            aria-label="Next page"
            onClick={goNext}
          >
            <ArrowRight size={24} />
          </button>
        </div>
    </div>
  );
} 
