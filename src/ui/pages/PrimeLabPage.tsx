import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PrimeChatDrawer } from '../components/PrimeChatDrawer';

export function PrimeLabPage() {
  const { session, ready } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Show loading state while auth is initializing
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading auth...</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if no session
  if (ready && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🚀 Prime Agent Kernel</h1>
          <p className="text-xl text-gray-600 mb-8">AI-Powered Financial Assistant</p>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to use Prime Lab.</p>
            <div className="text-sm text-gray-500">
              <p>Prime Lab requires authentication to access:</p>
              <ul className="text-left space-y-1 mt-2">
                <li>• Receipt Processing</li>
                <li>• Expense Categorization</li>
                <li>• Financial Analysis</li>
                <li>• AI Assistant Tools</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Prime Lab interface when authenticated
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🚀 Prime Agent Kernel</h1>
        <p className="text-xl text-gray-600 mb-8">AI-Powered Financial Assistant</p>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Status: Active</h2>
          <p className="text-gray-600 mb-6">Your Prime Agent Kernel is ready to help with:</p>
          <ul className="text-left space-y-2 text-gray-600">
            <li>✅ Receipt Processing</li>
            <li>✅ Expense Categorization</li>
            <li>✅ Financial Analysis</li>
            <li>✅ General Assistance</li>
          </ul>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Chatting
          </button>
        </div>
      </div>

      {/* Prime Chat Drawer */}
      <PrimeChatDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
