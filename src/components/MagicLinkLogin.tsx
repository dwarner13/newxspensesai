import { useState } from 'react';
import { Mail, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function MagicLinkLogin() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      await signInWithOtp(email);
      setEmailSent(true);
      toast.success('Check your email for the magic link!');
    } catch (error: any) {
      console.error('Magic link error:', error);
      toast.error(error.message || 'Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-start">
          <Mail className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Check your email!
            </h3>
            <p className="text-green-800 text-sm mb-4">
              We sent a magic link to <strong>{email}</strong>. Click the link in your email to sign in.
            </p>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              className="text-sm text-green-700 hover:text-green-900 font-medium"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          We'll send you a magic link to sign in without a password
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            Sending magic link...
          </>
        ) : (
          <>
            <Mail className="h-5 w-5" />
            Send magic link
          </>
        )}
      </button>
    </form>
  );
}



