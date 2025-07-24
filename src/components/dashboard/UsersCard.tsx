import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Mail, Shield, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'contributor';
  avatar?: string;
}

interface UsersCardProps {
  users?: UserData[];
  darkMode?: boolean;
  onInviteUser?: (email: string, role: string) => void;
}

const UsersCard = ({ 
  users = [], 
  darkMode = false,
  onInviteUser
}: UsersCardProps) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const currentUser: UserData = {
    id: '1',
    name: 'You',
    email: 'user@example.com',
    role: 'owner'
  };
  
  const allUsers = [currentUser, ...users];
  
  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onInviteUser) {
        onInviteUser(inviteEmail, inviteRole);
      }
      
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return darkMode 
          ? 'bg-primary-900 text-primary-300' 
          : 'bg-primary-100 text-primary-800';
      case 'admin':
        return darkMode 
          ? 'bg-purple-900 text-purple-300' 
          : 'bg-purple-100 text-purple-800';
      case 'member':
        return darkMode 
          ? 'bg-blue-900 text-blue-300' 
          : 'bg-blue-100 text-blue-800';
      case 'contributor':
        return darkMode 
          ? 'bg-green-900 text-green-300' 
          : 'bg-green-100 text-green-800';
      default:
        return darkMode 
          ? 'bg-gray-700 text-gray-300' 
          : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-lg shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
    >
      <div className="p-6">
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Account Users</h2>
        
        <div className="mb-6">
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Invite team members to collaborate on your financial data. Each user can have different permissions:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Contributor</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Can add expenses and receipts only</p>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Member</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Can view and edit all transactions</p>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Admin</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Full access to all settings and data</p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Invite Team Members</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Send invitations to collaborate on this account</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address" 
                  className={`px-3 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'
                  } border focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
                
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className={`px-3 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-800'
                    } border focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="contributor">Contributor</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                
                <button 
                  onClick={handleInvite}
                  disabled={isSubmitting || !inviteEmail}
                  className={`px-4 py-2 rounded-lg ${
                    darkMode 
                      ? 'bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700' 
                      : 'bg-green-400 hover:bg-green-500 disabled:bg-gray-300'
                    } text-white font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    <>
                      <Mail size={16} className="inline mr-2" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`border-t pt-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Current Users ({allUsers.length})</h3>
          
          <div className="space-y-3">
            {allUsers.map((user) => (
              <div 
                key={user.id}
                className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center mr-3`}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                  
                  {user.role !== 'owner' && (
                    <button className={`p-1 rounded-full ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {users.length === 0 && (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Users size={48} className=" mb-4 opacity-50" />
              <p className="mb-2">No team members yet</p>
              <p className="text-sm">Invite your team to collaborate on this account</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UsersCard;
