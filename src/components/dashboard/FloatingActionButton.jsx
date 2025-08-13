import React from 'react';
import { Plus, Bot, Target, Camera, Upload } from 'lucide-react';

/**
 * FloatingActionButton component for quick actions
 * Handles FAB toggle and expanded action buttons
 */
const FloatingActionButton = ({ showFab, onToggleFab, onFabAction }) => {
  return (
    <div className="fixed bottom-24 right-6 z-40">
      {showFab && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-slide-in-up">
          <button
            onClick={() => onFabAction('ask')}
            className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Bot size={16} />
            <span className="text-sm font-medium">Ask AI</span>
          </button>
          <button
            onClick={() => onFabAction('goal')}
            className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Target size={16} />
            <span className="text-sm font-medium">New Goal</span>
          </button>
          <button
            onClick={() => onFabAction('photo')}
            className="flex items-center gap-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Camera size={16} />
            <span className="text-sm font-medium">Take Photo</span>
          </button>
          <button
            onClick={() => onFabAction('upload')}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Upload size={16} />
            <span className="text-sm font-medium">Upload Document</span>
          </button>
        </div>
      )}
      
      <button
        onClick={onToggleFab}
        className={`w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center ${
          showFab ? 'rotate-45' : ''
        }`}
        aria-label="Quick actions"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default FloatingActionButton; 