import React from 'react';
import { Bot, Bell, TrendingUp, Lightbulb, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const AIAssistantCard = () => {
  const nextBills = [
    { name: 'Electric Bill', amount: 85, dueDate: 'Dec 15', daysLeft: 3 },
    { name: 'Car Insurance', amount: 120, dueDate: 'Dec 18', daysLeft: 6 }
  ];

  const debtProgress = {
    total: 15420,
    paid: 8200,
    percentage: 53
  };

  const tipOfTheDay = "Consider setting up automatic payments for recurring bills to avoid late fees and improve your credit score.";

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
      </div>

      {/* Next Bills */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-yellow-400" />
          <span className="text-sm font-medium text-white/90">Next Bills</span>
        </div>
        <div className="space-y-2">
          {nextBills.map((bill, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <div>
                <p className="text-sm font-medium text-white">{bill.name}</p>
                <p className="text-xs text-white/60">Due {bill.dueDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">${bill.amount}</p>
                <p className={`text-xs ${bill.daysLeft <= 3 ? 'text-red-400' : 'text-white/60'}`}>
                  {bill.daysLeft} days left
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debt Progress */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-green-400" />
          <span className="text-sm font-medium text-white/90">Debt Progress</span>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80">Total Debt</span>
            <span className="text-white font-semibold">${debtProgress.total.toLocaleString()}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${debtProgress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Paid: ${debtProgress.paid.toLocaleString()}</span>
            <span className="text-green-400 font-medium">{debtProgress.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Tip of the Day */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-yellow-400" />
          <span className="text-sm font-medium text-white/90">Tip of the Day</span>
        </div>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-500/30">
          <p className="text-sm text-white/90 leading-relaxed">{tipOfTheDay}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4">
        <Link 
          to="/ai-financial-assistant" 
          className="block w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-blue-600 transition-all text-center"
        >
          Chat with AI Assistant
        </Link>
      </div>
    </div>
  );
};

export default AIAssistantCard; 
