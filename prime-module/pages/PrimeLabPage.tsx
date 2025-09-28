import React from 'react';
import { PrimeChat } from '../components/PrimeChat';

export default function PrimeLabPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Prime Module Test Lab</h1>
            <div className="flex gap-2">
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                ⚠️ Isolated Module
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                🧪 Using Mock Data
              </span>
            </div>
          </div>
          
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Prime Bot Features</h2>
            <ul className="text-sm text-gray-800 space-y-1">
              <li>• AI-powered conversational interface</li>
              <li>• Real-time streaming responses</li>
              <li>• Context-aware conversations</li>
              <li>• Integration with XspensesAI data</li>
            </ul>
          </div>
          
          <PrimeChat />
        </div>
      </div>
    </div>
  );
}
