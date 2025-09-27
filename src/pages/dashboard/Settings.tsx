import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  Send,
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Brain,
  Loader2,
  Palette,
  Database,
  CheckCircle,
  Music,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getSpotifyLoginUrl } from '../../utils/SpotifyAuth';

interface SettingsMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function SettingsPage() {
  const { updateWorkspaceState, getWorkspaceState } = useWorkspace();
  const workspaceId = 'settings';
  
  // Load saved state
  const savedState = getWorkspaceState(workspaceId);
  
  // View state - force overview on mount
  const [activeView, setActiveView] = useState('overview');
  
  // Chat state
  const [messages, setMessages] = useState<SettingsMessage[]>(savedState.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Spotify integration state
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSpotifyLoading, setIsSpotifyLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Force overview view on mount and clear any previous state
  useEffect(() => {
    setActiveView('overview');
    // Clear any previous messages to ensure clean state
    setMessages([]);
  }, []);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: SettingsMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantResponse: SettingsMessage = {
        role: 'assistant',
        content: getAssistantResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getAssistantResponse = (_message: string): string => {
    const responses = [
      "I've analyzed your settings preferences and optimized your configuration for better performance. Your privacy settings are secure and your notification preferences have been updated for optimal user experience.",
      "Great question! I've reviewed your current settings and identified several optimization opportunities. Your theme preferences are set to dark mode, and I've enabled auto-backup to protect your data.",
      "I've updated your settings configuration based on your preferences. Your security settings are now enhanced with two-factor authentication, and your language preferences have been saved successfully.",
      "Perfect! I've optimized your settings for better performance and security. Your notification settings have been fine-tuned, and your privacy mode has been configured to protect your sensitive data.",
      "I've completed a comprehensive settings review and optimization. Your account is now configured with enhanced security features, and your preferences have been synchronized across all devices."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Save state whenever it changes
  useEffect(() => {
    updateWorkspaceState(workspaceId, {
      activeView,
      messages
    });
  }, [activeView, messages, workspaceId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-20">
      {/* Page Title */}
      <MobilePageTitle 
        title="Settings" 
        subtitle="Customize your dashboard preferences"
      />
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
            {activeView === 'overview' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-bold text-white mb-1"
                  >
                    Settings
                  </motion.h2>
                  <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/60 text-sm mb-3"
                  >
                    Your intelligent guide to customization, security, and account management
                  </motion.p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                    {[
                      { icon: User, title: "Profile Settings", desc: "Account & personal info", color: "from-blue-500 to-cyan-500", view: "profile" },
                      { icon: Shield, title: "Security & Privacy", desc: "Protect your account", color: "from-green-500 to-emerald-500", view: "security" },
                      { icon: Bell, title: "Notifications", desc: "Alert preferences", color: "from-purple-500 to-violet-500", view: "notifications" },
                      { icon: Palette, title: "Appearance", desc: "Theme & customization", color: "from-orange-500 to-yellow-500", view: "appearance" },
                      { icon: Database, title: "Data Management", desc: "Backup & sync settings", color: "from-red-500 to-pink-500", view: "data" },
                      { icon: Brain, title: "Chat with Assistant", desc: "AI settings helper", color: "from-indigo-500 to-purple-500", view: "chat" }
                    ].map((item, index) => (
          <motion.button
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => setActiveView(item.view)}
                        className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-blue-500/10"
                      >
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                          <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                        </div>
          </motion.button>
        ))}
                  </div>
                </div>
              </div>
            ) : activeView === 'profile' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
                <div className="flex items-center gap-3 mb-6">
              <button
                    onClick={() => setActiveView('overview')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
              </button>
                  <h2 className="text-xl font-bold text-white">Profile Settings</h2>
            </div>

                <div className="text-center mb-6">
                  <p className="text-white/70">Manage your account details and personal preferences</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <User className="w-6 h-6 text-white" />
                      </div>
                <div>
                        <h3 className="text-white font-bold text-lg mb-1">Personal Information</h3>
                        <p className="text-white/60 text-xs">Account details</p>
                  </div>
                </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                <div>
                          <span className="text-white font-medium text-sm">Full Name</span>
                          <p className="text-white/60 text-xs">Darrell Warner</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">Active</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>
                      <div className="flex items-center justify-between py-2">
                <div>
                          <span className="text-white font-medium text-sm">Email</span>
                          <p className="text-white/60 text-xs">darrell@example.com</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">Verified</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
                      <div className="flex items-center justify-between py-2">
                <div>
                          <span className="text-white font-medium text-sm">Phone</span>
                          <p className="text-white/60 text-xs">+1 (555) 123-4567</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Protected</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                    </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Preferences</h3>
                        <p className="text-white/60 text-xs">Customization options</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Language</span>
                          <p className="text-white/60 text-xs">English (US)</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">EN</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Auto Backup</span>
                          <p className="text-white/60 text-xs">Enabled</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">On</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Privacy Mode</span>
                          <p className="text-white/60 text-xs">Enhanced protection</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Active</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-purple-500 rounded-full"></div>
                  </div>
                </div>
              </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Shield className="w-6 h-6 text-white" />
              </div>
                  <div>
                        <h3 className="text-white font-bold text-lg mb-1">Security Status</h3>
                        <p className="text-white/60 text-xs">Account protection</p>
                    </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Two-Factor Auth</span>
                          <p className="text-white/60 text-xs">SMS & Email</p>
                  </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">Enabled</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                    </div>
                    </div>
                  </div>
                      <div className="flex items-center justify-between py-2">
                  <div>
                          <span className="text-white font-medium text-sm">Password Strength</span>
                          <p className="text-white/60 text-xs">Strong</p>
                    </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">95%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-5/6 h-full bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Login Activity</span>
                          <p className="text-white/60 text-xs">No suspicious activity</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">Safe</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Database className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Data Management</h3>
                        <p className="text-white/60 text-xs">Storage & sync</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Storage Used</span>
                          <p className="text-white/60 text-xs">2.3 GB of 10 GB</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">23%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-1/4 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                </div>
                      <div className="flex items-center justify-between py-2">
                <div>
                          <span className="text-white font-medium text-sm">Last Backup</span>
                          <p className="text-white/60 text-xs">2 hours ago</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">Recent</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                </div>
                      <div className="flex items-center justify-between py-2">
                <div>
                          <span className="text-white font-medium text-sm">Sync Status</span>
                          <p className="text-white/60 text-xs">All devices</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Synced</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : activeView === 'chat' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveView('overview')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                  </button>
                  <h2 className="text-xl font-bold text-white">Chat with Settings Assistant</h2>
                </div>

                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Brain className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-blue-400">Assistant</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-60 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                  </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Brain className="w-3 h-3 text-white" />
                  </div>
                          <span className="text-xs font-semibold text-blue-400">Assistant</span>
                </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing your settings...</span>
            </div>
          </div>
        </motion.div>
      )}
                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
                <div className="flex items-center gap-3 mb-6">
                      <button
                    onClick={() => setActiveView('overview')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                      </button>
                  <h2 className="text-xl font-bold text-white">
                    {activeView === 'security' ? 'Security & Privacy' :
                     activeView === 'notifications' ? 'Notification Settings' :
                     activeView === 'appearance' ? 'Appearance & Theme' :
                     activeView === 'data' ? 'Data Management' :
                     'Settings'}
                  </h2>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-white/70">
                    {activeView === 'security' ? 'Protect your account with advanced security features and privacy controls' :
                     activeView === 'notifications' ? 'Customize your notification preferences and alert settings' :
                     activeView === 'appearance' ? 'Personalize your experience with themes and visual customization' :
                     activeView === 'data' ? 'Manage your data storage, backups, and synchronization settings' :
                     'Advanced settings and configuration options'}
                  </p>
              </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <SettingsIcon className="w-6 h-6 text-white" />
                      </div>
              <div>
                        <h3 className="text-white font-bold text-lg mb-1">Configuration</h3>
                        <p className="text-white/60 text-xs">System settings</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Current Status</span>
                          <p className="text-white/60 text-xs">All systems operational</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">Active</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Optimization</span>
                          <p className="text-white/60 text-xs">Performance tuned</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">95%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-5/6 h-full bg-blue-500 rounded-full"></div>
                          </div>
                </div>
              </div>
                      <div className="flex items-center justify-between py-2">
              <div>
                          <span className="text-white font-medium text-sm">Updates</span>
                          <p className="text-white/60 text-xs">Latest version</p>
                    </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Current</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-purple-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-6 h-6 text-white" />
            </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Health Check</h3>
                        <p className="text-white/60 text-xs">System diagnostics</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Security Scan</span>
                          <p className="text-white/60 text-xs">No threats detected</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">Clean</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Performance</span>
                          <p className="text-white/60 text-xs">Optimal speed</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">Fast</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Connectivity</span>
                          <p className="text-white/60 text-xs">Stable connection</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Strong</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-purple-500 rounded-full"></div>
                    </div>
                    </div>
                  </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          {activeView === 'chat' && (
            <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about settings, preferences, or account configuration..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;