import { useState, useEffect } from 'react';
import { Shield, Users, Settings, BarChart3, Zap, Crown, Eye, Database, Mail, ToggleLeft as Toggle, Activity, DollarSign, FileText, Camera, Brain, Star, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { supabase } from '../lib/supabase';
import AccessDenied from '../components/access/AccessDenied';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalReceipts: number;
  totalXPEarned: number;
  premiumUsers: number;
  recentSignups: number;
}

interface UserData {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
  transaction_count: number;
  xp: number;
  level: number;
  streak: number;
}

interface FeatureToggle {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

const AdminPanelPage = () => {
  const { user } = useAuth();
  const { userIsAdmin } = useAdminAccess();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'features' | 'analytics' | 'god-mode'>('overview');
  const [loading, setLoading] = useState(true);
  const [godMode, setGodMode] = useState(false);
  
  // Data states
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalReceipts: 0,
    totalXPEarned: 0,
    premiumUsers: 0,
    recentSignups: 0});
  const [users, setUsers] = useState<UserData[]>([]);
  const [features, setFeatures] = useState<FeatureToggle[]>([
    {
      key: 'ai_categorization',
      name: 'AI Categorization',
      description: 'Automatic transaction categorization using OpenAI',
      enabled: true,
      category: 'AI Features'
    },
    {
      key: 'receipt_scanning',
      name: 'Receipt Scanning',
      description: 'OCR-powered receipt processing',
      enabled: true,
      category: 'Core Features'
    },
    {
      key: 'gamification',
      name: 'Gamification System',
      description: 'XP, badges, and streak tracking',
      enabled: true,
      category: 'Engagement'
    },
    {
      key: 'email_notifications',
      name: 'Email Notifications',
      description: 'Achievement and milestone emails',
      enabled: true,
      category: 'Communication'
    },
    {
      key: 'premium_features',
      name: 'Premium Features',
      description: 'Advanced analytics and AI insights',
      enabled: true,
      category: 'Monetization'
    },
    {
      key: 'chat_assistant',
      name: 'AI Chat Assistant',
      description: 'Financial Q&A chatbot',
      enabled: true,
      category: 'AI Features'
    }
  ]);

  useEffect(() => {
    if (userIsAdmin) {
      loadAdminData();
    }
  }, [userIsAdmin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get user stats
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true});

      const { count: premiumUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['premium', 'admin']);

      const { count: recentSignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('account_created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get transaction stats
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true});

      // Get receipt stats
      const { count: totalReceipts } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true});

      // Get XP stats
      const { data: xpData } = await supabase
        .from('profiles')
        .select('xp');

      const totalXPEarned = xpData?.reduce((sum, profile) => sum + (profile.xp || 0), 0) || 0;

      // Active users (logged in within last 30 days)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalTransactions: totalTransactions || 0,
        totalReceipts: totalReceipts || 0,
        totalXPEarned,
        premiumUsers: premiumUsers || 0,
        recentSignups: recentSignups || 0});
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          role,
          account_created_at,
          last_login_at,
          transaction_count,
          xp,
          level,
          streak
        `)
        .order('account_created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user emails from auth.users (requires service role)
      const userIds = data?.map(p => p.id) || [];
      const usersWithEmails = data?.map(profile => ({
        ...profile,
        email: `user-${profile.id.slice(0, 8)}@hidden.com`, // Placeholder for demo
        created_at: profile.account_created_at
      })) || [];

      setUsers(usersWithEmails as UserData[]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const toggleFeature = (featureKey: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.key === featureKey 
        ? { ...feature, enabled: !feature.enabled }
        : feature
    ));
    toast.success(`Feature ${featureKey} ${features.find(f => f.key === featureKey)?.enabled ? 'disabled' : 'enabled'}`);
  };

  const updateUserRole = async (userId: string, newRole: 'free' | 'premium' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const toggleGodMode = () => {
    setGodMode(!godMode);
    toast.success(`God Mode ${!godMode ? 'ACTIVATED' : 'DEACTIVATED'}`, {
      icon: !godMode ? '⚡' : '🔒',
      duration: 2000});
  };

  if (!userIsAdmin) {
    return <AccessDenied type="admin" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'features', name: 'Features', icon: Settings },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'god-mode', name: 'God Mode', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <Shield size={32} className="text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <span>🛠️ Admin Panel</span>
              {godMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 animate-pulse">
                  ⚡ GOD MODE
                </span>
              )}
            </h1>
            <p className="text-gray-600">Welcome, Darrell. You have full control over XspensesAI.</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">Admin Access</span>
          <Crown size={20} className="text-yellow-600" />
        </div>
      </div>

      {/* God Mode Banner */}
      {godMode && (
        <div
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-lg border-2 border-purple-300"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap size={24} className="animate-pulse" />
              <div>
                <h3 className="font-semibold">⚡ God Mode Activated</h3>
                <p className="text-sm text-purple-100">
                  All limitations bypassed. Premium features unlocked. Debug mode enabled.
                </p>
              </div>
            </div>
            <button
              onClick={toggleGodMode}
              className="bg-white text-purple-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div
        key={activeTab}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Users</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                  </div>
                  <Users size={24} className="text-blue-600" />
                </div>
              </div>

              <div className="card bg-gradient-to-br from-green-50 to-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Active Users</p>
                    <p className="text-2xl font-bold text-green-900">{stats.activeUsers}</p>
                  </div>
                  <Activity size={24} className="text-green-600" />
                </div>
              </div>

              <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Premium Users</p>
                    <p className="text-2xl font-bold text-purple-900">{stats.premiumUsers}</p>
                  </div>
                  <Crown size={24} className="text-purple-600" />
                </div>
              </div>

              <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Total XP</p>
                    <p className="text-2xl font-bold text-orange-900">{stats.totalXPEarned.toLocaleString()}</p>
                  </div>
                  <Star size={24} className="text-orange-600" />
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Transactions</h3>
                  <FileText size={20} className="text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stats.totalTransactions.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Total processed</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Receipts</h3>
                  <Camera size={20} className="text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stats.totalReceipts.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Scanned & processed</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">New Signups</h3>
                  <TrendingUp size={20} className="text-gray-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stats.recentSignups}
                </div>
                <p className="text-sm text-gray-600">Last 7 days</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={toggleGodMode}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    godMode 
                      ? 'border-purple-300 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Zap size={24} className=" mb-2" />
                  <div className="font-medium">
                    {godMode ? 'Deactivate' : 'Activate'} God Mode
                  </div>
                  <div className="text-sm text-gray-600">
                    Bypass all limitations
                  </div>
                </button>

                <button className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                  <Database size={24} className=" mb-2" />
                  <div className="font-medium">Database Health</div>
                  <div className="text-sm text-gray-600">Check system status</div>
                </button>

                <button className="p-4 rounded-lg border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all">
                  <Mail size={24} className=" mb-2" />
                  <div className="font-medium">Send Announcement</div>
                  <div className="text-sm text-gray-600">Email all users</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">User Management</h3>
                <div className="text-sm text-gray-500">
                  {users.length} users shown
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.display_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Level {user.level} • {user.xp} XP</div>
                          <div>{user.transaction_count} transactions</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                            <Eye size={16} />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <AlertTriangle size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-6">Feature Management</h3>
              
              {Object.entries(
                features.reduce((acc, feature) => {
                  if (!acc[feature.category]) acc[feature.category] = [];
                  acc[feature.category].push(feature);
                  return acc;
                }, {} as Record<string, FeatureToggle[]>)
              ).map(([category, categoryFeatures]) => (
                <div key={category} className="mb-8">
                  <h4 className="font-medium text-gray-900 mb-4">{category}</h4>
                  <div className="space-y-4">
                    {categoryFeatures.map((feature) => (
                      <div key={feature.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h5 className="font-medium text-gray-900">{feature.name}</h5>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              feature.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {feature.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                        </div>
                        <button
                          onClick={() => toggleFeature(feature.key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            feature.enabled ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              feature.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">User Growth</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  📈 Chart placeholder - User growth over time
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Feature Usage</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  📊 Chart placeholder - Feature adoption rates
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue Metrics</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  💰 Chart placeholder - Revenue and conversions
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">System Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <span className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" />
                      Healthy
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Response</span>
                    <span className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" />
                      Fast (120ms)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Storage</span>
                    <span className="flex items-center text-yellow-600">
                      <Clock size={16} className="mr-1" />
                      75% Used
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'god-mode' && (
          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
              <div className="flex items-center space-x-3 mb-6">
                <Zap size={24} className="text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900">⚡ God Mode Controls</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-purple-900">Development Tools</h4>
                  
                  <button className="w-full p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                    <div className="font-medium text-purple-900">🔓 Bypass All Limits</div>
                    <div className="text-sm text-purple-700">Remove upload limits, rate limits, etc.</div>
                  </button>

                  <button className="w-full p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                    <div className="font-medium text-purple-900">🎭 Simulate Premium</div>
                    <div className="text-sm text-purple-700">Test premium features without subscription</div>
                  </button>

                  <button className="w-full p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                    <div className="font-medium text-purple-900">🐛 Debug Mode</div>
                    <div className="text-sm text-purple-700">Show detailed error messages and logs</div>
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-purple-900">Data Management</h4>
                  
                  <button className="w-full p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                    <div className="font-medium text-purple-900">📊 Generate Test Data</div>
                    <div className="text-sm text-purple-700">Create sample transactions and receipts</div>
                  </button>

                  <button className="w-full p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                    <div className="font-medium text-purple-900">🔄 Reset User Data</div>
                    <div className="text-sm text-purple-700">Clear specific user's data for testing</div>
                  </button>

                  <button className="w-full p-4 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left">
                    <div className="font-medium text-purple-900">⚡ Force Badge Awards</div>
                    <div className="text-sm text-purple-700">Manually award badges and XP</div>
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-100 rounded-lg">
                <div className="flex items-center space-x-2 text-purple-800">
                  <AlertTriangle size={16} />
                  <span className="font-medium">God Mode Status: {godMode ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  {godMode 
                    ? 'All limitations are bypassed. Use with caution in production.'
                    : 'Click the toggle above to activate god mode and unlock all development tools.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanelPage;
