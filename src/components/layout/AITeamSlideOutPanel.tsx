import React, { useState, useEffect } from 'react';
import { Bot, X, ChevronRight } from 'lucide-react';
import AITeamSidebar from './AITeamSidebar';

interface AITeamSlideOutPanelProps {
  autoOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

const AITeamSlideOutPanel: React.FC<AITeamSlideOutPanelProps> = ({ autoOpen = false, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasActiveTasks, setHasActiveTasks] = useState(false);

  // Auto-open when tasks are active
  useEffect(() => {
    if (autoOpen && hasActiveTasks && !isOpen) {
      setIsOpen(true);
      onToggle?.(true);
    }
  }, [autoOpen, hasActiveTasks, isOpen, onToggle]);

  // Simulate task activity (replace with real logic later)
  useEffect(() => {
    const interval = setInterval(() => {
      setHasActiveTasks(Math.random() > 0.7);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Slide-out panel */}
      <div 
        className={`fixed right-0 top-0 h-screen z-[50] transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '360px' }}
      >
        {/* Panel content */}
        <div className="h-full bg-[#0f172a]/95 backdrop-blur-sm border-l border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-semibold">AI Team</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                onToggle?.(false);
              }}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Sidebar content */}
          <div className="h-[calc(100%-73px)]">
            <AITeamSidebar />
          </div>
        </div>
      </div>

      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          onToggle?.(!isOpen);
        }}
        className={`fixed top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center gap-1 px-3 py-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
          isOpen ? 'right-[360px] rounded-l-lg' : 'right-0 rounded-l-lg'
        } ${hasActiveTasks ? 'animate-pulse' : ''}`}
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed'
        }}
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <>
            <Bot className="w-5 h-5" />
            {hasActiveTasks && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-ping" />
            )}
            <span className="text-xs font-semibold mt-2">AI TEAM</span>
          </>
        )}
      </button>
    </>
  );
};

export default AITeamSlideOutPanel;
