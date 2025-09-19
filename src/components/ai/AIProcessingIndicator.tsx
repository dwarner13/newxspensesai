import React from 'react';

interface AIProcessingIndicatorProps {
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  text?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export default function AIProcessingIndicator({
  color = 'blue',
  text = 'AI Processing',
  position = 'top-right',
  className = ""
}: AIProcessingIndicatorProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400'
  };

  const positionClasses = {
    'top-right': 'top-3 right-3',
    'top-left': 'top-3 left-3',
    'bottom-right': 'bottom-3 right-3',
    'bottom-left': 'bottom-3 left-3'
  };

  const dotColors = {
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    purple: 'bg-purple-400',
    orange: 'bg-orange-400',
    red: 'bg-red-400'
  };

  return (
    <div className={`absolute ${positionClasses[position]} flex items-center gap-1 ${colorClasses[color]} rounded-lg px-2 py-1 ${className}`}>
      <div className={`w-2 h-2 ${dotColors[color]} rounded-full animate-pulse`}></div>
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}

