import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Alerts component for real-time notification banners
 * Displays dismissible alerts with different types (warning, success, info)
 */
const Alerts = ({ alerts, onDismissAlert }) => {
  return (
    <>
      {alerts.filter(alert => !alert.dismissed).map((alert) => (
        <div
          key={alert.id}
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 animate-slide-in-down ${
            alert.type === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
            alert.type === 'info' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
            'bg-gradient-to-r from-green-500 to-emerald-500'
          } text-white rounded-lg shadow-xl border border-white/20 backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-white" />
              <span className="font-medium">{alert.message}</span>
            </div>
            <button
              onClick={() => onDismissAlert(alert.id)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss alert"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      ))}
    </>
  );
};

export default Alerts; 