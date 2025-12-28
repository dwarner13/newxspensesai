// src/navigation/nav-registry.tsx
import { 
  Home, Upload, Bot, Tags, LineChart, Brain, Zap, TrendingUp, PiggyBank,
  Shield, Calendar, Mic, BookOpen, Heart, Music, Receipt, BarChart3,
  Settings, FileText, Crown
} from "lucide-react";

const NAV_ITEMS = [
  // MAIN
  { label: "Main Dashboard", to: "/dashboard", icon: <Home className="w-5 h-5" />, group: "MAIN", description: "Overview of your financial dashboard" },
  { label: "👑 Prime Chat", to: "/dashboard/prime-chat", icon: <Crown className="w-5 h-5" />, group: "MAIN", description: "Chat directly with Prime, your AI CEO" },

  // AI WORKSPACE
  { label: "Smart Import AI", to: "/dashboard/smart-import-ai", icon: <Upload className="w-5 h-5" />, group: "AI WORKSPACE", description: "Upload and process receipts with AI" },
  { label: "AI Chat Assistant", to: "/dashboard/ai-chat-assistant", icon: <Bot className="w-5 h-5" />, group: "AI WORKSPACE", description: "Chat with your AI financial assistant" },
  { label: "Smart Categories", to: "/dashboard/smart-categories", icon: <Tags className="w-5 h-5" />, group: "AI WORKSPACE", description: "AI-powered expense categorization" },
  { label: "Analytics AI", to: "/dashboard/analytics-ai", icon: <LineChart className="w-5 h-5" />, group: "AI WORKSPACE", description: "Advanced analytics and insights with Dash" },

  // PLANNING & ANALYSIS
  { label: "Transactions", to: "/dashboard/transactions", icon: <Receipt className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Track all your transactions" },
  { label: "Bank Accounts", to: "/dashboard/bank-accounts", icon: <Shield className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Connect and manage bank accounts" },
  { label: "AI Goal Concierge", to: "/dashboard/goal-concierge", icon: <Brain className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Personal goal planning with AI" },
  { label: "Smart Automation", to: "/dashboard/smart-automation", icon: <Zap className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Automate your financial tasks" },
  { label: "Spending Predictions", to: "/dashboard/spending-predictions", icon: <TrendingUp className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Forecast your spending patterns" },
  { label: "Debt Payoff Planner", to: "/dashboard/debt-payoff-planner", icon: <PiggyBank className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Create a debt payoff plan" },
  { label: "AI Financial Freedom", to: "/dashboard/ai-financial-freedom", icon: <Shield className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Your personalized path to freedom" },
  { label: "Bill Reminder System", to: "/dashboard/bill-reminders", icon: <Calendar className="w-5 h-5" />, group: "PLANNING & ANALYSIS", description: "Never miss a bill" },

  // ENTERTAINMENT & WELLNESS
  { label: "Personal Podcast", to: "/dashboard/personal-podcast", icon: <Mic className="w-5 h-5" />, group: "ENTERTAINMENT & WELLNESS", description: "Your own personalized financial podcast" },
  { label: "Financial Story", to: "/dashboard/financial-story", icon: <BookOpen className="w-5 h-5" />, group: "ENTERTAINMENT & WELLNESS", description: "Visualize your financial journey" },
  { label: "AI Financial Therapist", to: "/dashboard/financial-therapist", icon: <Heart className="w-5 h-5" />, group: "ENTERTAINMENT & WELLNESS", description: "AI-guided financial therapy" },
  { label: "Wellness Studio", to: "/dashboard/wellness-studio", icon: <Heart className="w-5 h-5" />, group: "ENTERTAINMENT & WELLNESS", description: "Tools for your mental wellness" },
  { label: "Spotify Integration", to: "/dashboard/spotify", icon: <Music className="w-5 h-5" />, group: "ENTERTAINMENT & WELLNESS", description: "Curated playlists for focus" },

  // BUSINESS & TAX
  { label: "Tax Assistant", to: "/dashboard/tax-assistant", icon: <Receipt className="w-5 h-5" />, group: "BUSINESS & TAX", description: "AI-powered tax prep & deductions" },
  { label: "Business Intelligence", to: "/dashboard/business-intelligence", icon: <BarChart3 className="w-5 h-5" />, group: "BUSINESS & TAX", description: "Advanced analytics for growth" },

  // TOOLS & SETTINGS
  { label: "Analytics", to: "/dashboard/analytics", icon: <LineChart className="w-5 h-5" />, group: "TOOLS & SETTINGS", description: "All your numbers & insights" },
  { label: "Settings", to: "/dashboard/settings", icon: <Settings className="w-5 h-5" />, group: "TOOLS & SETTINGS", description: "Account, security, integrations" },
  { label: "Custodian", to: "/dashboard/custodian", icon: <Shield className="w-5 h-5" />, group: "TOOLS & SETTINGS", description: "Security & settings specialist" },
  { label: "Reports", to: "/dashboard/reports", icon: <FileText className="w-5 h-5" />, group: "TOOLS & SETTINGS", description: "Comprehensive financial reports" },
];

export default NAV_ITEMS;