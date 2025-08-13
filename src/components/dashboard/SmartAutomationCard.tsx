import React from 'react';
import { Bot, Clock, Bell, Settings, Zap, Workflow } from 'lucide-react';

const SmartAutomationCard = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 group h-full flex flex-col relative overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Bot size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Smart Automation</h3>
            <p className="text-sm text-white/60">Automate your business finances with AI.</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/80 text-sm leading-relaxed mb-6 flex-grow">
          Hands-free bookkeeping, reminders, and financial tasks.
        </p>

        {/* Features */}
        <div className="space-y-3 mb-6 flex-grow">
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Clock size={12} className="text-green-400" />
            </div>
            <span>Hands-free bookkeeping and categorization</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Bell size={12} className="text-green-400" />
            </div>
            <span>Smart reminders for bills and deadlines</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Zap size={12} className="text-green-400" />
            </div>
            <span>Automated recurring transactions</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Workflow size={12} className="text-green-400" />
            </div>
            <span>Task automation for financial workflows</span>
          </div>
        </div>

        {/* CTA Button */}
        <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105">
          Setup Automation
        </button>
      </div>
    </div>
  );
};

export default SmartAutomationCard; 
