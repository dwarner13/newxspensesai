import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, LogOut } from 'lucide-react';

export default function LogoutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    // Automatically sign out when this page loads
    const performLogout = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, redirect to login
        window.location.href = '/login';
      }
    };

    // Small delay to show the logout message
    const timer = setTimeout(performLogout, 1500);
    
    return () => clearTimeout(timer);
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
      <div
        className="text-center   p-8"
      >
        <div
          className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center  mb-6"
        >
          <LogOut size={32} className="text-primary-600" />
        </div>

        <h2
          className="text-xl font-semibold mb-3 text-gray-800"
        >
          Signing You Out
        </h2>

        <p
          className="mb-6 text-gray-600"
        >
          Thanks for using XspensesAI! You're being signed out securely.
        </p>

        <div
          className="flex items-center justify-center space-x-2"
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          <span className="text-sm text-gray-500">Clearing your session...</span>
        </div>

        <div
          className="mt-6 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg flex items-center justify-center space-x-2"
        >
          <Zap size={16} className="text-primary-500" />
          <span>See you next time!</span>
        </div>
      </div>
    </div>
  );
}
