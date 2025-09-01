import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, User, Shield, CreditCard, Bell, Globe, 
  Key, Zap, Bot, Download, Trash2, Copy, Eye, EyeOff, 
  Upload, Camera, Plus, CheckCircle, AlertTriangle,
  ExternalLink, HelpCircle, Gift, Crown, Users, 
  Lock, RefreshCw, FileText, Mail, ChevronRight, Edit, Save,
  Download as DownloadIcon, Link, X, Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardHeader from '../../components/ui/DashboardHeader';



interface ProfileData {
  name: string;
  email: string;
  phone: string;
  plan: 'free' | 'pro' | 'enterprise';
  planRenewal: string;
  twoFactorEnabled: boolean;
}

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
}

interface AIChatbot {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  expertise: 'basic' | 'advanced';
}

const Settings = () => {
  const [activeSection, setActiveSection] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    plan: 'pro',
    planRenewal: 'March 15, 2024',
    twoFactorEnabled: true
  });

  const [tempProfile, setTempProfile] = useState<ProfileData>(profileData);

  const integrations = [
    { id: '1', name: 'Google Drive', icon: '📁', status: 'connected' as const, lastSync: '2 hours ago' },
    { id: '2', name: 'Slack', icon: '💬', status: 'connected' as const, lastSync: '1 hour ago' },
    { id: '3', name: 'Dropbox', icon: '📦', status: 'disconnected' as const, lastSync: 'Never' }
  ];

  const aiChatbots = [
    { id: '1', name: 'TaxBot', description: 'Tax preparation assistant', isEnabled: true, expertise: 'advanced' as const },
    { id: '2', name: 'BizBot', description: 'Business intelligence expert', isEnabled: true, expertise: 'advanced' as const },
    { id: '3', name: 'AnalyticsBot', description: 'Financial data analysis', isEnabled: true, expertise: 'advanced' as const },
    { id: '4', name: 'AutoBot', description: 'Automation setup', isEnabled: false, expertise: 'basic' as const }
  ];

  const sections = [
    { id: 'account', name: 'Account & Profile', icon: User },
    { id: 'integrations', name: 'Integrations & APIs', icon: Zap },
    { id: 'ai', name: 'AI Chatbot Settings', icon: Bot },
    { id: 'preferences', name: 'Dashboard Preferences', icon: SettingsIcon },
    { id: 'payment', name: 'Upgrade & Payment', icon: CreditCard },
    { id: 'security', name: 'Security & Privacy', icon: Shield },
    { id: 'support', name: 'Support & Help', icon: HelpCircle }
  ];

  const handleSaveProfile = () => {
    setProfileData(tempProfile);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTempProfile(profileData);
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'disconnected': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full">
      <DashboardHeader />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <nav className="space-y-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                          activeSection === section.id
                            ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{section.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  
                  {/* Account & Profile */}
                  {activeSection === 'account' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Account & Profile</h3>
                          <p className="text-white/60 text-sm">Manage your personal information and account settings</p>
                        </div>
                      </div>

                      {/* Profile Photo */}
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {profileData.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <button className="absolute -bottom-1 -right-1 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all">
                            <Camera size={16} className="text-white" />
                          </button>
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">Profile Photo</h4>
                          <p className="text-white/60 text-sm">Upload a new profile picture</p>
                        </div>
                      </div>

                      {/* Profile Information */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-semibold">Profile Information</h4>
                          {!isEditing ? (
                            <button
                              onClick={() => setIsEditing(true)}
                              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg transition-all flex items-center gap-2"
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSaveProfile}
                                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 rounded-lg transition-all flex items-center gap-2"
                              >
                                <Save size={16} />
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg transition-all flex items-center gap-2"
                              >
                                <X size={16} />
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-white/60 text-sm">Full Name</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={profileData.name}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mt-1"
                              />
                            ) : (
                              <div className="text-white font-medium">{profileData.name}</div>
                            )}
                          </div>
                          <div>
                            <label className="text-white/60 text-sm">Email</label>
                            {isEditing ? (
                              <input
                                type="email"
                                value={profileData.email}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mt-1"
                              />
                            ) : (
                              <div className="text-white font-medium">{profileData.email}</div>
                            )}
                          </div>
                          <div>
                            <label className="text-white/60 text-sm">Phone</label>
                            {isEditing ? (
                              <input
                                type="tel"
                                value={profileData.phone}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white mt-1"
                              />
                            ) : (
                              <div className="text-white font-medium">{profileData.phone}</div>
                            )}
                          </div>
                          <div>
                            <label className="text-white/60 text-sm">Plan</label>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-white font-medium capitalize">{profileData.plan}</span>
                              <span className="text-white/60 text-sm">• Renews {profileData.planRenewal}</span>
                            </div>
                          </div>
                        </div>

                        {/* Security Settings */}
                        <div className="border-t border-white/10 pt-6">
                          <h4 className="text-white font-semibold mb-4">Security</h4>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">Two-Factor Authentication</div>
                              <div className="text-white/60 text-sm">Add an extra layer of security</div>
                            </div>
                            <button className={`px-3 py-1 rounded text-sm transition-all ${
                              profileData.twoFactorEnabled 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {profileData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Integrations */}
                  {activeSection === 'integrations' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Link size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Integrations</h3>
                          <p className="text-white/60 text-sm">Connect your favorite apps and services</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {integrations.map((integration) => (
                          <div key={integration.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white text-lg">{integration.icon}</span>
                                </div>
                                <div>
                                  <div className="text-white font-semibold">{integration.name}</div>
                                  <div className="text-white/60 text-sm">Last synced {integration.lastSync}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(integration.status)}`}></div>
                                <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-sm transition-all">
                                  {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Chatbot Settings */}
                  {activeSection === 'ai' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Bot size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">AI Chatbot Settings</h3>
                          <p className="text-white/60 text-sm">Configure your AI assistants and their expertise levels</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {aiChatbots.map((chatbot) => (
                          <div key={chatbot.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="text-white font-semibold">{chatbot.name}</div>
                                <div className="text-white/60 text-sm">{chatbot.description}</div>
                              </div>
                              <button className={`px-3 py-1 rounded text-sm transition-all ${
                                chatbot.isEnabled 
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                              }`}>
                                {chatbot.isEnabled ? 'Enabled' : 'Disabled'}
                              </button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <label className="text-white/60 text-sm">Expertise Level</label>
                                  <select 
                                    value={chatbot.expertise}
                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
                                  >
                                    <option value="basic">Basic</option>
                                    <option value="advanced">Advanced</option>
                                  </select>
                                </div>
                              </div>
                              <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-sm transition-all">
                                View History
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Referral Program */}
                  <div className="mt-8 p-6 bg-gradient-to-br from-green-600/20 to-blue-600/20 rounded-lg border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Gift size={24} className="text-yellow-400" />
                        <div>
                          <h4 className="text-white font-semibold">Referral Program</h4>
                          <p className="text-white/60 text-sm">Invite friends and earn rewards</p>
                        </div>
                      </div>
                      <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all">
                        Invite Friends
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">Your Referral Code</div>
                        <div className="text-blue-400 font-mono">JOHNDOE2024</div>
                      </div>
                      <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-all">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings; 