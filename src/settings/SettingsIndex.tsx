import React from "react";
import { Link } from "react-router-dom";
import { 
  Shield, Brain, Zap, Target, Bell, FileText, Globe, 
  Briefcase, Link as LinkIcon, Download, Users, CreditCard 
} from "lucide-react";

const settingsPages = [
  { 
    title: "Security & Access", 
    description: "Manage 2FA, session history, and user roles",
    path: "/settings/security-access", 
    icon: <Shield size={24} /> 
  },
  { 
    title: "AI Preferences", 
    description: "Customize how your AI assistant interacts with you",
    path: "/settings/ai-preferences", 
    icon: <Brain size={24} /> 
  },
  { 
    title: "Smart Automations", 
    description: "Set up rules to automate expense categorization",
    path: "/settings/smart-automations", 
    icon: <Zap size={24} /> 
  },
  { 
    title: "Goal Settings", 
    description: "Track personal or business financial goals",
    path: "/settings/goals", 
    icon: <Target size={24} /> 
  },
  { 
    title: "Notifications & Alerts", 
    description: "Create alerts for important financial events",
    path: "/settings/notifications-alerts", 
    icon: <Bell size={24} /> 
  },
  { 
    title: "OCR & Receipt Settings", 
    description: "Customize how receipts are scanned and categorized",
    path: "/settings/ocr", 
    icon: <FileText size={24} /> 
  },
  { 
    title: "Localization", 
    description: "Set your language, currency, and time zone",
    path: "/settings/localization", 
    icon: <Globe size={24} /> 
  },
  { 
    title: "Business Mode", 
    description: "Enable business features like client tagging and tax settings",
    path: "/settings/business-mode", 
    icon: <Briefcase size={24} /> 
  },
  { 
    title: "Integrations & APIs", 
    description: "Connect third-party apps and generate API keys",
    path: "/settings/integrations-apis", 
    icon: <LinkIcon size={24} /> 
  },
  { 
    title: "Export & Backup", 
    description: "Export financial data or set up automatic backups",
    path: "/settings/export-backup", 
    icon: <Download size={24} /> 
  },
  { 
    title: "Team Access", 
    description: "Invite collaborators and assign access roles",
    path: "/settings/team-access", 
    icon: <Users size={24} /> 
  },
  { 
    title: "Billing & Usage", 
    description: "Track plan usage and view billing history",
    path: "/settings/billing-usage", 
    icon: <CreditCard size={24} /> 
  },
];

export default function SettingsIndex() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="mb-8 text-gray-600">Configure your XspensesAI experience</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsPages.map((page) => (
          <Link
            key={page.path}
            to={page.path}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="text-blue-600">
                {page.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{page.title}</h3>
            </div>
            <p className="text-gray-600 text-sm">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
} 
