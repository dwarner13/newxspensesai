import { useState } from 'react';
import { Users, Settings, HelpCircle } from 'lucide-react';
import AccountCard from '../components/dashboard/AccountCard';
import UsersCard from '../components/dashboard/UsersCard';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'contributor';
  avatar?: string;
}

const AccountUsersPage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [accountInfo, setAccountInfo] = useState({
    accountName: 'Personal Workspace',
    taxSystem: 'Default',
    timeZone: 'America/Edmonton'
  });
  
  const handleEditAccountInfo = (field: string, value: string) => {
    setAccountInfo(prev => ({
      ...prev,
      [field]: value
    }));
    toast.success(`${field} updated successfully`);
  };
  
  const handleInviteUser = (email: string, role: string) => {
    // In a real app, this would send an API request
    const newUser: UserData = {
      id: Date.now().toString(),
      name: email.split('@')[0],
      email,
      role: role as 'owner' | 'admin' | 'member' | 'contributor'
    };
    
    setUsers([...users, newUser]);
    toast.success(`Invitation sent to ${email}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1
          className={`text-2xl font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}
        >
          <Users className="mr-2" size={24} />
          Account & Users
        </h1>
        
        <div
          className="flex flex-wrap gap-3"
        >
          <button className={`px-4 py-2 rounded-lg flex items-center ${
            darkMode 
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <Settings size={16} className="mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Account Card */}
      <AccountCard 
        accountName={accountInfo.accountName}
        taxSystem={accountInfo.taxSystem}
        timeZone={accountInfo.timeZone}
        darkMode={darkMode}
        onEdit={handleEditAccountInfo}
      />
      
      {/* Users Card */}
      <UsersCard 
        users={users}
        darkMode={darkMode}
        onInviteUser={handleInviteUser}
      />
      
      {/* Help Section */}
      <div
        className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
      >
        <div className="flex items-start">
          <HelpCircle size={20} className={`mr-3 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
          <div>
            <h3 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Need Help?</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Learn more about account management in our <a href="#" className={`${darkMode ? 'text-primary-400' : 'text-primary-600'} hover:underline`}>help center</a> or <a href="#" className={`${darkMode ? 'text-primary-400' : 'text-primary-600'} hover:underline`}>contact support</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountUsersPage;
