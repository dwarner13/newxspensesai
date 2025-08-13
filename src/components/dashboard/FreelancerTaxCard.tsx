import React from 'react';
import { Briefcase, TrendingUp, Calculator, FileText, Download, Receipt } from 'lucide-react';

const FreelancerTaxCard = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 group h-full flex flex-col relative overflow-hidden">
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Receipt size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Freelancer Tax Assistant</h3>
            <p className="text-sm text-white/60">Automated tax optimization for freelancers and solopreneurs.</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-white/80 text-sm leading-relaxed mb-6 flex-grow">
          Let AI track your deductible expenses and optimize your taxes—stress-free.
        </p>

        {/* Features */}
        <div className="space-y-3 mb-6 flex-grow">
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <TrendingUp size={12} className="text-orange-400" />
            </div>
            <span>Automatic expense categorization (AI-powered)</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Calculator size={12} className="text-orange-400" />
            </div>
            <span>Finds every possible tax deduction</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <FileText size={12} className="text-orange-400" />
            </div>
            <span>Generates quarterly/annual tax estimates</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-white/80">
            <div className="w-5 h-5 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <Download size={12} className="text-orange-400" />
            </div>
            <span>Download-ready tax reports for your accountant</span>
          </div>
        </div>

        {/* CTA Button */}
        <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105">
          Start Tax Optimization
        </button>
      </div>
    </div>
  );
};

export default FreelancerTaxCard; 
