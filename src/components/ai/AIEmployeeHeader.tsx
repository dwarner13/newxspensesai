import React from 'react';
import { motion } from 'framer-motion';
import { EMPLOYEES } from '../../data/aiEmployees';

interface AIEmployeeHeaderProps {
  employeeKey: string;
  pageTitle: string;
  pageDescription: string;
  activities?: string[];
  className?: string;
}

export default function AIEmployeeHeader({
  employeeKey,
  pageTitle,
  pageDescription,
  activities = [],
  className = ""
}: AIEmployeeHeaderProps) {
  const employee = EMPLOYEES.find(emp => emp.key === employeeKey);
  
  if (!employee) return null;

  const defaultActivities = [
    "Analyzing data patterns and trends...",
    "Processing information and generating insights...",
    "Preparing recommendations and reports..."
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className={`ai-employee-header mb-8 ${className}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 mb-4"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-3xl">{employee.emoji}</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="text-lg text-purple-400 font-medium">Powered by {employee.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400 font-medium">Active</span>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-1">{pageDescription}</p>
        </div>
      </motion.div>
      
      {/* AI Activity Feed */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚡</span>
          <h3 className="text-sm font-semibold text-white">{employee.name} is working on:</h3>
        </div>
        <div className="space-y-2">
          {displayActivities.map((activity, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-2 text-sm text-white/70"
            >
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                index === 0 ? 'bg-blue-400' : 
                index === 1 ? 'bg-green-400' : 
                'bg-purple-400'
              }`}></div>
              <span>{activity}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}


