import React from 'react';

export function PrimeLabPage() {
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
          <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Start Chatting
          </button>
        </div>
      </div>
    </div>
  );
}
