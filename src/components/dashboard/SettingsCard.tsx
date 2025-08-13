import React from 'react';
import { Settings, Shield, Moon, Sun, Database, Bell } from 'lucide-react';

const SettingsCard = () => {
  const isDarkMode = true;
  const notificationsEnabled = true;
  const zeroStorageStatus = "Active";

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Settings</h3>
      </div>

      {/* Zero Storage Status */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 mb-4 border border-green-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-green-400" />
          <span className="text-sm font-medium text-white">Zero Storage Status</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/80">No sensitive data stored</span>
          <span className="text-xs font-bold text-green-400">{zeroStorageStatus}</span>
        </div>
      </div>

      {/* Quick Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-3">
            {isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-400" />}
            <span className="text-sm text-white">Dark Mode</span>
          </div>
          <div className="w-10 h-6 bg-white/20 rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all duration-300"></div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-purple-400" />
            <span className="text-sm text-white">Notifications</span>
          </div>
          <div className="w-10 h-6 bg-green-500 rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all duration-300"></div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-3">
            <Database size={16} className="text-orange-400" />
            <span className="text-sm text-white">Data Sync</span>
          </div>
          <div className="w-10 h-6 bg-white/20 rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all duration-300"></div>
          </div>
        </div>
      </div>

      <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl">
        Open Settings
      </button>
    </div>
  );
};

export default SettingsCard; 
