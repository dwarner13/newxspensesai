import React from 'react';

const AITeamSidebar: React.FC = () => {
  const activities = [
    { id: '1', aiName: 'Byte', title: 'processing chase statement', timestamp: '2 min ago' },
    { id: '2', aiName: 'Crystal', title: 'analyzing trends', timestamp: '5 min ago' },
    { id: '3', aiName: 'Tag', title: 'categorizing transactions', timestamp: '12 min ago' },
    { id: '4', aiName: 'Ledger', title: 'tax analysis', timestamp: '8 min ago' },
    { id: '5', aiName: 'Chime', title: 'bill reminder', timestamp: '18 min ago' }
  ];

  const workers = [
    { name: 'Byte - Smart Import AI', progress: 67 },
    { name: 'Crystal - Prediction Engine', progress: 45 },
    { name: 'Tag - AI Categorization Engine', progress: 78 },
    { name: 'Ledger - Tax Assistant', progress: 52 },
    { name: 'Quantum - Analytics AI', progress: 89 },
    { name: 'Nexus - Integration Engine', progress: 34 }
  ];


  return (
    <div className="h-full flex flex-col pl-8 pr-6 py-6 space-y-4">
      {/* LIVE ACTIVITY Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Static Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">LIVE ACTIVITY</h3>
          <div className="bg-green-500/20 text-green-400 text-xs rounded-full px-2 py-1 font-medium">
            {activities.length}
        </div>
      </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/60 text-xs mb-1">{activity.timestamp}</div>
                  <div className="text-white/90 text-xs leading-relaxed">{activity.aiName} {activity.title}</div>
                </div>
              </div>
            ))}
          </div>
                  </div>
                </div>
                
      {/* WORKERS Section - Fixed height to show exactly 4 workers */}
      <div className="flex flex-col h-48 min-h-0">
        {/* Static Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">WORKERS</h3>
          <div className="text-white/60 text-xs font-medium">4/4</div>
                  </div>
                  
        {/* Fixed Content - No scrolling, shows exactly 4 workers */}
        <div className="flex-1 overflow-hidden">
          <div className="space-y-2.5">
            {workers.slice(0, 4).map((worker, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/90 font-medium">{worker.name}</div>
                  <div className="text-xs text-white font-medium">{worker.progress}%</div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${worker.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AITeamSidebar;