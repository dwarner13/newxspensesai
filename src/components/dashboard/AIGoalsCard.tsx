import React from 'react';
import { Target, Plus, TrendingUp, Calendar, DollarSign } from 'lucide-react';

const AIGoalsCard = () => {
  const goals = [
    { name: 'Emergency Fund', target: 10000, current: 6500, percentage: 65, color: 'from-green-500 to-emerald-500' },
    { name: 'Vacation Fund', target: 5000, current: 3200, percentage: 64, color: 'from-blue-500 to-purple-500' },
    { name: 'Car Down Payment', target: 8000, current: 4800, percentage: 60, color: 'from-purple-500 to-pink-500' }
  ];

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Target size={20} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">AI Goals</h3>
        </div>
        <button className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center hover:from-emerald-500 hover:to-green-500 transition-all duration-300 shadow-lg">
          <Plus size={16} className="text-white" />
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((goal, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">{goal.name}</h4>
                <p className="text-xs text-white/60">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}</p>
              </div>
              <span className="text-sm font-bold text-white">{goal.percentage}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div 
                className={`bg-gradient-to-r ${goal.color} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${goal.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">${(goal.target - goal.current).toLocaleString()} to go</span>
              <span className="text-green-400 font-medium">On track</span>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl">
        Add New Goal
      </button>
    </div>
  );
};

export default AIGoalsCard; 
