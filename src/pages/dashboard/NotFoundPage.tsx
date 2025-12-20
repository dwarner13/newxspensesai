/**
 * NotFoundPage Component
 * 
 * Fallback page for unmatched dashboard routes
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <DashboardPageShell
      center={
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-4xl shadow-lg">
                ?
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Page Not Found
            </h2>
            <p className="text-slate-400 mb-2">
              The page <code className="text-slate-300 bg-slate-800 px-2 py-1 rounded">{location.pathname}</code> doesn't exist.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Check the URL or return to the dashboard.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Home className="w-5 h-5" />
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>
      }
    />
  );
}







