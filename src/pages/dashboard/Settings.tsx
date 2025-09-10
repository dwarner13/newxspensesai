import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  CreditCard, 
  Bell, 
  Globe, 
  Key, 
  Zap, 
  Bot, 
  Download, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Upload, 
  Camera, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink, 
  HelpCircle, 
  Gift, 
  Crown, 
  Users, 
  Lock, 
  RefreshCw, 
  FileText, 
  Mail, 
  ChevronRight, 
  Edit, 
  Save,
  Download as DownloadIcon, 
  Link, 
  X, 
  Music,
  Palette,
  Database,
  Activity,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Languages,
  Clock,
  Calendar,
  BarChart3,
  MessageCircle,
  Play,
  Target
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Settings Interfaces
interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  plan: 'free' | 'pro' | 'enterprise';
  planRenewal: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface SubscriptionData {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due';
  renewalDate: string;
  monthlyPrice: number;
  features: string[];
  usage: {
    aiQueries: number;
    dataStorage: number;
    integrations: number;
  };
  limits: {
    maxAiQueries: number;
    maxStorage: number;
    maxIntegrations: number;
  };
}

interface AISettings {
  primaryAI: 'crystal' | 'byte' | 'tag' | 'prime';
  responseStyle: 'professional' | 'casual' | 'technical';
  learningEnabled: boolean;
  dataProcessing: 'minimal' | 'standard' | 'comprehensive';
  personality: 'analytical' | 'friendly' | 'direct';
  autoSuggestions: boolean;
  voiceEnabled: boolean;
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    aiInsights: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    aiResponses: boolean;
    anomalies: boolean;
    achievements: boolean;
  };
  sms: {
    enabled: boolean;
    criticalAlerts: boolean;
    twoFactor: boolean;
  };
}

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync: string;
  category: 'banking' | 'accounting' | 'crm' | 'marketing' | 'other';
  permissions: string[];
}

export default function Settings() {
  console.log('🚀🚀🚀 LOADING SETTINGS DASHBOARD - Complete System Configuration!');
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Profile Data
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || 'John Doe',
    email: user?.email || 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    avatar: '',
    plan: 'pro',
    planRenewal: 'March 15, 2024',
    twoFactorEnabled: true,
    emailVerified: true,
    phoneVerified: false
  });

  // Subscription Data
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    plan: 'pro',
    status: 'active',
    renewalDate: 'March 15, 2024',
    monthlyPrice: 29.99,
    features: [
      'Unlimited AI Queries',
      'Advanced Analytics',
      'Priority Support',
      'Custom Integrations',
      'Data Export'
    ],
    usage: {
      aiQueries: 1247,
      dataStorage: 2.3,
      integrations: 5
    },
    limits: {
      maxAiQueries: 10000,
      maxStorage: 100,
      maxIntegrations: 20
    }
  });

  // AI Settings
  const [aiSettings, setAiSettings] = useState<AISettings>({
    primaryAI: 'crystal',
    responseStyle: 'professional',
    learningEnabled: true,
    dataProcessing: 'comprehensive',
    personality: 'analytical',
    autoSuggestions: true,
    voiceEnabled: false
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      enabled: true,
      aiInsights: true,
      systemUpdates: true,
      securityAlerts: true,
      marketing: false
    },
    push: {
      enabled: true,
      aiResponses: true,
      anomalies: true,
      achievements: true
    },
    sms: {
      enabled: false,
      criticalAlerts: true,
      twoFactor: true
    }
  });

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'bank-1',
      name: 'Chase Bank',
      icon: '🏦',
      status: 'connected',
      lastSync: '2 minutes ago',
      category: 'banking',
      permissions: ['Read transactions', 'Read account balance']
    },
    {
      id: 'accounting-1',
      name: 'QuickBooks',
      icon: '📊',
      status: 'connected',
      lastSync: '1 hour ago',
      category: 'accounting',
      permissions: ['Read financial data', 'Write transactions']
    },
    {
      id: 'crm-1',
      name: 'Salesforce',
      icon: '👥',
      status: 'error',
      lastSync: '3 days ago',
      category: 'crm',
      permissions: ['Read contacts', 'Read opportunities']
    },
    {
      id: 'marketing-1',
      name: 'Mailchimp',
      icon: '📧',
      status: 'disconnected',
      lastSync: '1 week ago',
      category: 'marketing',
      permissions: ['Read campaigns', 'Write subscribers']
    }
  ]);

  const settingsSections = [
    { key: 'profile', label: 'Profile & Account', icon: User, color: 'from-blue-500 to-cyan-500' },
    { key: 'subscription', label: 'Subscription & Billing', icon: CreditCard, color: 'from-green-500 to-emerald-500' },
    { key: 'ai', label: 'AI Configuration', icon: Bot, color: 'from-purple-500 to-pink-500' },
    { key: 'security', label: 'Security & Privacy', icon: Shield, color: 'from-red-500 to-orange-500' },
    { key: 'notifications', label: 'Notifications', icon: Bell, color: 'from-yellow-500 to-amber-500' },
    { key: 'integrations', label: 'Integrations', icon: Link, color: 'from-indigo-500 to-blue-500' },
    { key: 'appearance', label: 'Appearance & UI', icon: Palette, color: 'from-pink-500 to-rose-500' },
    { key: 'data', label: 'Data Management', icon: Database, color: 'from-gray-500 to-slate-500' }
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
    // Save profile logic here
    console.log('Profile saved:', profileData);
  };

  const handleToggleTwoFactor = () => {
    setProfileData(prev => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled
    }));
  };

  const handleAISettingChange = (key: keyof AISettings, value: any) => {
    setAiSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNotificationChange = (category: keyof NotificationSettings, key: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleIntegrationAction = (id: string, action: 'connect' | 'disconnect' | 'reconnect') => {
    setIntegrations(prev => prev.map(integration => {
      if (integration.id === id) {
        return {
          ...integration,
          status: action === 'connect' ? 'connected' : action === 'disconnect' ? 'disconnected' : 'pending'
        };
      }
      return integration;
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4 sm:p-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">⚙️ System Settings</h1>
            <p className="text-white/70 text-sm sm:text-base">Complete control over your AI-powered financial dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">All Systems Active</span>
            </div>
            <div className="text-2xl">⚙️</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 mb-8"
      >
        {settingsSections.map(({ key, label, icon: Icon, color }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === key
                ? 'bg-indigo-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Profile & Account Section */}
      {activeSection === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Profile Information</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Email Address</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    />
                    {profileData.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    />
                    {profileData.phoneVerified ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      <Camera className="w-4 h-4" />
                      Change Photo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Account Security</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white">Two-Factor Authentication</span>
                      <button
                        onClick={handleToggleTwoFactor}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          profileData.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            profileData.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Email Verified</span>
                      <span className={`text-sm ${profileData.emailVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                        {profileData.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white">Phone Verified</span>
                      <span className={`text-sm ${profileData.phoneVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                        {profileData.phoneVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Subscription & Billing Section */}
      {activeSection === 'subscription' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Current Plan</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-white capitalize">{subscriptionData.plan} Plan</h4>
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-white/70 text-sm mb-2">${subscriptionData.monthlyPrice}/month</p>
                  <p className="text-white/60 text-xs">Renews on {subscriptionData.renewalDate}</p>
                </div>

                <div className="space-y-4">
                  <h5 className="text-white font-medium">Plan Features</h5>
                  <ul className="space-y-2">
                    {subscriptionData.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-white/70 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-white font-medium">Usage This Month</h5>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-white/70 mb-1">
                      <span>AI Queries</span>
                      <span>{subscriptionData.usage.aiQueries.toLocaleString()} / {subscriptionData.limits.maxAiQueries.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(subscriptionData.usage.aiQueries / subscriptionData.limits.maxAiQueries) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-white/70 mb-1">
                      <span>Data Storage</span>
                      <span>{subscriptionData.usage.dataStorage}GB / {subscriptionData.limits.maxStorage}GB</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(subscriptionData.usage.dataStorage / subscriptionData.limits.maxStorage) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-white/70 mb-1">
                      <span>Integrations</span>
                      <span>{subscriptionData.usage.integrations} / {subscriptionData.limits.maxIntegrations}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(subscriptionData.usage.integrations / subscriptionData.limits.maxIntegrations) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors mb-2">
                    Upgrade Plan
                  </button>
                  <button className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    Billing History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Configuration Section */}
      {activeSection === 'ai' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">AI Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Primary AI Assistant</label>
                  <select
                    value={aiSettings.primaryAI}
                    onChange={(e) => handleAISettingChange('primaryAI', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="crystal">Crystal - Predictive Analytics</option>
                    <option value="byte">Byte - Data Processing</option>
                    <option value="tag">Tag - Pattern Recognition</option>
                    <option value="prime">Prime - Strategic Analysis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Response Style</label>
                  <select
                    value={aiSettings.responseStyle}
                    onChange={(e) => handleAISettingChange('responseStyle', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">AI Personality</label>
                  <select
                    value={aiSettings.personality}
                    onChange={(e) => handleAISettingChange('personality', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="analytical">Analytical</option>
                    <option value="friendly">Friendly</option>
                    <option value="direct">Direct</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Data Processing Level</label>
                  <select
                    value={aiSettings.dataProcessing}
                    onChange={(e) => handleAISettingChange('dataProcessing', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="standard">Standard</option>
                    <option value="comprehensive">Comprehensive</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Learning Enabled</span>
                    <button
                      onClick={() => handleAISettingChange('learningEnabled', !aiSettings.learningEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        aiSettings.learningEnabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          aiSettings.learningEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Auto Suggestions</span>
                    <button
                      onClick={() => handleAISettingChange('autoSuggestions', !aiSettings.autoSuggestions)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        aiSettings.autoSuggestions ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          aiSettings.autoSuggestions ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white">Voice Enabled</span>
                    <button
                      onClick={() => handleAISettingChange('voiceEnabled', !aiSettings.voiceEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        aiSettings.voiceEnabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          aiSettings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications Section */}
      {activeSection === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notifications
                </h4>
                <div className="space-y-3">
                  {Object.entries(notificationSettings.email).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <button
                        onClick={() => handleNotificationChange('email', key, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Push Notifications
                </h4>
                <div className="space-y-3">
                  {Object.entries(notificationSettings.push).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <button
                        onClick={() => handleNotificationChange('push', key, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  SMS Notifications
                </h4>
                <div className="space-y-3">
                  {Object.entries(notificationSettings.sms).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <button
                        onClick={() => handleNotificationChange('sms', key, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Integrations Section */}
      {activeSection === 'integrations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Connected Integrations</h3>
              <button className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4" />
                Add Integration
              </button>
            </div>

            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <h4 className="text-white font-medium">{integration.name}</h4>
                        <p className="text-white/60 text-sm">Last sync: {integration.lastSync}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            integration.status === 'connected' ? 'bg-green-400' :
                            integration.status === 'error' ? 'bg-red-400' :
                            integration.status === 'pending' ? 'bg-yellow-400' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-xs text-white/60 capitalize">{integration.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleIntegrationAction(integration.id, 'reconnect')}
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm transition-colors"
                      >
                        Reconnect
                      </button>
                      <button
                        onClick={() => handleIntegrationAction(integration.id, 'disconnect')}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/60 mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {integration.permissions.map((permission, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Other sections placeholder */}
      {!['profile', 'subscription', 'ai', 'notifications', 'integrations'].includes(activeSection) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center"
        >
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {activeSection === 'security' && 'Security & Privacy Coming Soon'}
            {activeSection === 'appearance' && 'Appearance & UI Coming Soon'}
            {activeSection === 'data' && 'Data Management Coming Soon'}
          </h3>
          <p className="text-white/70">
            This section is being enhanced with advanced configuration options. Stay tuned!
          </p>
        </motion.div>
      )}
    </div>
  );
}