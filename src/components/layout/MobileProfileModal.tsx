import React, { useState } from 'react';
// import { 
  User, 
  Settings, 
  Bell, 
  CreditCard, 
  Crown, 
  LogOut, 
  HelpCircle, 
  Shield,
  Zap,
  Star,
  X,
  ArrowLeft,
  Mail,
  Key,
  Bot,
  Download,
  Activity,
  Globe,
  Palette,
  Database,
  FileText,
  Smartphone,
  Lock,
  Eye,
  EyeOff
// } from 'lucide-react';

interface MobileProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileProfileModal: React.FC<MobileProfileModalProps> = ({ isOpen, onClose }) => {
  const [currentView, setCurrentView] = useState<'main' | 'account' | 'security' | 'preferences' | 'data'>('main');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Account form state
  const [accountForm, setAccountForm] = useState({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567'
  });
  
  // Security form state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Save functions
  const handleAccountSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Account saved:', accountForm);
      // Show success message or toast
    } catch (error) {
      console.error('Failed to save account:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySave = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Security settings saved');
      // Clear form
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      // Show success message or toast
    } catch (error) {
      console.error('Failed to save security settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const profileOptions = [
    { icon: User, label: "Account Details", description: "Personal information", view: 'account' },
    { icon: CreditCard, label: "Payment Methods", description: "Cards & billing", view: 'account' },
    { icon: Mail, label: "Email History", description: "Communication logs", view: 'account' },
    { icon: Key, label: "Change Password", description: "Security settings", view: 'security' },
    { icon: Bot, label: "AI Employee Support", description: "Get AI assistance", view: 'main' },
    { icon: HelpCircle, label: "Support", description: "Help & assistance", view: 'main' },
  ];

  const additionalOptions = [
    { icon: Download, label: "Export Data", description: "Download your data" },
    { icon: Activity, label: "Usage Analytics", description: "App usage stats" },
    { icon: Globe, label: "Language & Region", description: "Localization" },
    { icon: Palette, label: "Theme Preferences", description: "Dark/light mode" },
    { icon: Database, label: "Data Management", description: "Storage & sync" },
    { icon: FileText, label: "Terms & Privacy", description: "Legal documents" },
    { icon: Smartphone, label: "Device Management", description: "Connected devices" },
    { icon: Lock, label: "Two-Factor Auth", description: "Extra security" },
  ];

  const upgradeOptions = [
    { icon: Crown, label: "Premium", description: "Unlock all features", price: "$9.99/month" },
    { icon: Zap, label: "Pro", description: "Advanced AI tools", price: "$19.99/month" },
    { icon: Star, label: "Enterprise", description: "Custom solutions", price: "Contact us" },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
        <div
          className="fixed inset-0 bg-[#0f172a] flex flex-col z-50"
          onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {currentView !== 'main' && (
                  <button
                    onClick={() => setCurrentView('main')}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 mr-2"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.5 7h7l-5.5 4 2 7-6-4.5L6 20l2-7-5.5-4h7L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">XspensesAI</h3>
                  <p className="text-sm text-white/60">Profile Settings</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-4 py-2 overflow-y-auto">
              {currentView === 'main' && (
                <>
                  <h4 className="text-sm font-semibold text-white/80 mb-2 uppercase tracking-wide">Account</h4>
                  <div className="space-y-1 mb-4">
                    {profileOptions.map((option, index) => (
                      <button
                        key={option.label}
                        onClick={() => option.view !== 'main' ? setCurrentView(option.view as any) : null}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 active:scale-95"
                      >
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <option.icon size={16} className="text-white/80" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium">{option.label}</p>
                          <p className="text-white/60 text-xs">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <h4 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Additional Features</h4>
                  <div className="space-y-2 mb-6">
                    {additionalOptions.map((option, index) => (
                      <button
                        key={option.label}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 active:scale-95"
                      >
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                          <option.icon size={16} className="text-white/80" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium">{option.label}</p>
                          <p className="text-white/60 text-xs">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {currentView === 'account' && (
                <>
                  <h4 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Account Details</h4>
                  <div className="space-y-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <h5 className="text-white font-medium mb-3">Personal Information</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="text-white/60 text-xs">Full Name</label>
                          <input 
                            type="text" 
                            value={accountForm.fullName}
                            onChange={(e) => setAccountForm(prev => ({ ...prev, fullName: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-white/60 text-xs">Email</label>
                          <input 
                            type="email" 
                            value={accountForm.email}
                            onChange={(e) => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-white/60 text-xs">Phone</label>
                          <input 
                            type="tel" 
                            value={accountForm.phone}
                            onChange={(e) => setAccountForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4">
                      <h5 className="text-white font-medium mb-3">Payment Methods</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard size={16} className="text-white/80" />
                            <span className="text-white text-sm">**** **** **** 1234</span>
                          </div>
                          <span className="text-white/60 text-xs">Primary</span>
                        </div>
                        <button className="w-full p-3 border border-dashed border-white/20 rounded-lg text-white/60 text-sm hover:bg-white/5 transition-colors">
                          + Add Payment Method
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentView('main')}
                      className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAccountSave}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </>
              )}

              {currentView === 'security' && (
                <>
                  <h4 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Security Settings</h4>
                  <div className="space-y-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <h5 className="text-white font-medium mb-3">Change Password</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="text-white/60 text-xs">Current Password</label>
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"} 
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mt-1 pr-10"
                            />
                            <button 
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-white/60 text-xs">New Password</label>
                          <input 
                            type="password" 
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-white/60 text-xs">Confirm New Password</label>
                          <input 
                            type="password" 
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm mt-1"
                          />
                        </div>
                        <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                          Update Password
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4">
                      <h5 className="text-white font-medium mb-3">Two-Factor Authentication</h5>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm">Enable 2FA</p>
                          <p className="text-white/60 text-xs">Add extra security to your account</p>
                        </div>
                        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          Enable
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Upgrade Section */}
              <h4 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">Upgrade Plans</h4>
              <div className="space-y-2 mb-4">
                {upgradeOptions.map((plan, index) => (
                  <button
                    key={plan.label}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 active:scale-95 border border-white/10"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                      <plan.icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{plan.label}</p>
                      <p className="text-white/60 text-xs">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-semibold text-sm">{plan.price}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Logout */}
                <button
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-all duration-200 active:scale-95 border border-red-500/20"
              >
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <LogOut size={16} className="text-red-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-red-400 font-medium">Sign Out</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileProfileModal;
