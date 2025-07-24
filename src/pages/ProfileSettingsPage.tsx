import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Save, 
  Upload, 
  Camera, 
  Mail, 
  Calendar,
  BarChart3,
  DollarSign,
  Shield,
  LogOut,
  Key,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SubscriptionManager from '../components/ui/SubscriptionManager';
import toast from 'react-hot-toast';
import AccountSettingsSidebar from '../components/layout/AccountSettingsSidebar';

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
  role: 'free' | 'premium' | 'admin';
  last_login_at: string | null;
  transaction_count: number;
  total_uploaded: number;
  account_created_at: string;
}

interface UserStats {
  transactionCount: number;
  totalIncome: number;
  totalExpenses: number;
  categoriesUsed: number;
  filesUploaded: number;
  lastTransaction: string | null;
}

// Flag to enable mock mode
const useMockData = true;

const ProfileSettingsPage = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    avatar_url: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadUserStats();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Check if mock mode is enabled
      if (useMockData) {
        const mockProfile = {
          id: "user_123",
          display_name: "Darrell Warner",
          avatar_url: "https://ui-avatars.com/api/?name=Darrell+Warner",
          updated_at: "2025-06-20T15:30:00Z",
          role: "premium",
          last_login_at: "2025-06-26T18:22:00Z",
          transaction_count: 157,
          total_uploaded: 12450.75,
          account_created_at: "2025-01-01T10:00:00Z"
        };
        
        setProfile(mockProfile as Profile);
        setFormData({
          display_name: mockProfile.display_name,
          avatar_url: mockProfile.avatar_url
        });
        
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      if (data) {
        setProfile(data);
        setFormData({
          display_name: data.display_name || '',
          avatar_url: data.avatar_url || ''
        });
      } else {
        // Create initial profile if it doesn't exist
        const newProfile = {
          id: user?.id,
          display_name: user?.email?.split('@')[0] || '',
          avatar_url: '',
          role: 'free' as const,
          last_login_at: new Date().toISOString(),
          transaction_count: 0,
          total_uploaded: 0,
          account_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile]);
          
        if (!insertError) {
          setProfile(newProfile);
          setFormData({
            display_name: newProfile.display_name,
            avatar_url: newProfile.avatar_url
          });
        }
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Check if mock mode is enabled
      if (useMockData) {
        const mockStats = {
          transactionCount: 157,
          totalIncome: 24500.75,
          totalExpenses: 18750.25,
          categoriesUsed: 8,
          filesUploaded: 12,
          lastTransaction: "2025-06-25T14:30:00Z"
        };
        
        setStats(mockStats);
        return;
      }
      
      // Get transaction statistics
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('amount, type, category, date')
        .eq('user_id', user?.id);

      if (transError) throw transError;

      // Get files count
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('id')
        .eq('user_id', user?.id);

      if (filesError) throw filesError;

      const totalIncome = transactions?.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = transactions?.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0) || 0;
      const categoriesUsed = new Set(transactions?.map(t => t.category)).size || 0;
      const lastTransaction = transactions?.length > 0 ? transactions[0].date : null;

      setStats({
        transactionCount: transactions?.length || 0,
        totalIncome,
        totalExpenses,
        categoriesUsed,
        filesUploaded: files?.length || 0,
        lastTransaction
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be smaller than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      // If using mock mode, simulate upload
      if (useMockData) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        
        setFormData(prev => ({ ...prev, avatar_url: objectUrl }));
        setProfile(prev => prev ? { ...prev, avatar_url: objectUrl } : null);
        
        toast.success('Profile photo updated successfully!');
        setUploading(false);
        return;
      }
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      toast.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      
      // If using mock mode, simulate saving
      if (useMockData) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProfile(prev => prev ? { 
          ...prev, 
          display_name: formData.display_name.trim() || null,
          avatar_url: formData.avatar_url.trim() || null,
          updated_at: new Date().toISOString()
        } : null);
        
        toast.success('Profile updated successfully!');
        setSaving(false);
        return;
      }
      
      const updates = {
        display_name: formData.display_name.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    try {
      // If using mock mode, simulate password reset
      if (useMockData) {
        toast.success(`Password reset link sent to ${user.email}`);
        return;
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/callback`
      });

      if (error) throw error;

      toast.success(`Password reset link sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Failed to send reset email. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    try {
      // If using mock mode, simulate account deletion
      if (useMockData) {
        toast.success('Account deletion initiated. You will be signed out.');
        
        // Simulate sign out after a delay
        setTimeout(() => {
          signOut();
        }, 2000);
        
        return;
      }
      
      // Delete user data first
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('categorization_rules').delete().eq('user_id', user.id);
      await supabase.from('memory').delete().eq('user_id', user.id);
      await supabase.from('files').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      // Delete avatar from storage
      if (profile?.avatar_url) {
        await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`]);
      }

      toast.success('Account deletion initiated. You will be signed out.');
      
      // Sign out user
      setTimeout(() => {
        signOut();
      }, 2000);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please contact support.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={16} className="text-purple-600" />;
      case 'premium':
        return <DollarSign size={16} className="text-yellow-600" />;
      default:
        return <User size={16} className="text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AccountSettingsSidebar />
      <div className="flex-1 p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-3 mb-8"
        >
          <User size={32} className="text-primary-600" />
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {formData.avatar_url ? (
                      <img
                        src={formData.avatar_url}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary-100"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-xl border-4 border-primary-100 ${formData.avatar_url ? 'hidden' : ''}`}>
                      {formData.display_name ? getInitials(formData.display_name) : <User size={32} />}
                    </div>
                    
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-700 transition-colors cursor-pointer">
                      {uploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Camera size={16} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">Profile Picture</h3>
                      {profile && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(profile.role)}`}>
                          {getRoleIcon(profile.role)}
                          <span className="ml-1 capitalize">{profile.role}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      Upload a photo to personalize your account. Max 5MB.
                    </p>
                    <label className="btn-outline text-sm flex items-center cursor-pointer">
                      <Upload size={14} className="mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Account Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Mail size={16} className="text-gray-400" />
                        <span className="text-gray-600 flex-1">{user?.email}</span>
                        <span className="text-xs bg-success-100 text-success-700 px-2 py-1 rounded">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <input
                        id="display_name"
                        type="text"
                        className="input"
                        placeholder="Enter your display name"
                        value={formData.display_name}
                        onChange={(e) => handleInputChange('display_name', e.target.value)}
                        maxLength={50}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This is how your name will appear throughout the app
                      </p>
                    </div>

                    <div>
                      <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">
                        Avatar URL (Optional)
                      </label>
                      <input
                        id="avatar_url"
                        type="url"
                        className="input"
                        placeholder="https://example.com/your-photo.jpg"
                        value={formData.avatar_url}
                        onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Alternative to uploading: link to your profile picture
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="border-t pt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Subscription Management */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <SubscriptionManager />
            </motion.div>

            {/* Account Management */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              <h3 className="text-lg font-medium text-gray-900 mb-6">Account Management</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Key size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Reset Password</p>
                      <p className="text-sm text-gray-500">Send a password reset link to your email</p>
                    </div>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    className="btn-outline text-sm"
                  >
                    Reset Password
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <LogOut size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Sign Out</p>
                      <p className="text-sm text-gray-500">Sign out of your account on this device</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-outline text-sm"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-error-200 rounded-lg bg-error-50">
                  <div className="flex items-center space-x-3">
                    <Trash2 size={20} className="text-error-600" />
                    <div>
                      <p className="font-medium text-error-900">Delete Account</p>
                      <p className="text-sm text-error-700">Permanently delete your account and all data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-danger text-sm"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Stats and Details */}
          <div className="space-y-6">
            {/* User Statistics */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <BarChart3 size={20} className="mr-2 text-primary-600" />
                  Your Statistics
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Transactions</span>
                    <span className="font-semibold">{stats.transactionCount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Income</span>
                    <span className="font-semibold text-success-600">{formatCurrency(stats.totalIncome)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Expenses</span>
                    <span className="font-semibold text-error-600">{formatCurrency(stats.totalExpenses)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Categories Used</span>
                    <span className="font-semibold">{stats.categoriesUsed}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Files Uploaded</span>
                    <span className="font-semibold">{stats.filesUploaded}</span>
                  </div>
                  
                  {stats.lastTransaction && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-gray-600">Last Transaction</span>
                      <p className="text-sm font-medium">
                        {new Date(stats.lastTransaction).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Account Details */}
            {profile && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="card"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar size={20} className="mr-2 text-primary-600" />
                  Account Details
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Account Created</p>
                    <p className="font-medium">
                      {new Date(profile.account_created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Last Login</p>
                    <p className="font-medium">
                      {profile.last_login_at 
                        ? new Date(profile.last_login_at).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">Profile Updated</p>
                    <p className="font-medium">
                      {new Date(profile.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <p className="text-gray-600">User ID</p>
                    <p className="font-mono text-xs text-gray-500">
                      {profile.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg p-6  mx-4"
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle size={24} className="text-error-600" />
                <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete:
              </p>
              
              <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
                <li>All your transactions and financial data</li>
                <li>Uploaded files and statements</li>
                <li>Categorization rules and preferences</li>
                <li>Your profile and account settings</li>
              </ul>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteAccount();
                    setShowDeleteConfirm(false);
                  }}
                  className="btn-danger flex-1"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
