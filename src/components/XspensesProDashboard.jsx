import React from 'react';
import { ConnectedDashboard } from './dashboard/ConnectedDashboard';

export default function XspensesProDashboard() {
  return (
    <div className="w-full pt-32 px-4 sm:px-6 lg:px-8" style={{ 
      transform: 'translateZ(0)', 
      WebkitTransform: 'translateZ(0)',
      contain: 'layout style paint'
    }}>
      <ConnectedDashboard />
    </div>
  );
}