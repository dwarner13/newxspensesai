import { useAuth } from '../contexts/AuthContext';
import { LogIn, LogOut, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthDebugPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl ">
      <div
        className="flex items-center space-x-3 mb-8"
      >
        <Shield size={32} className="text-primary-600" />
        <h1 className="text-2xl font-bold">🔐 Auth Debug</h1>
      </div>

      <div
        className="bg-white rounded-xl shadow-card p-6 mb-6"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-700">Logged In:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
            }`}>
              {user ? '✅ Yes' : '❌ No'}
            </span>
          </div>

          {user && (
            <>
              <div>
                <span className="font-medium text-gray-700">User ID:</span>
                <pre className="mt-1 bg-gray-50 rounded p-2 text-sm font-mono overflow-auto">
                  {user.id}
                </pre>
              </div>

              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <pre className="mt-1 bg-gray-50 rounded p-2 text-sm font-mono overflow-auto">
                  {user.email}
                </pre>
              </div>

              <div>
                <span className="font-medium text-gray-700">Full Session Data:</span>
                <pre className="mt-1 bg-gray-50 rounded p-2 text-sm font-mono overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        {!user ? (
          <button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignIn}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign in with Google
          </button>
        ) : (
          <button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-error-600 hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
