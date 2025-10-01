import React from 'react';
import { Heart, X } from 'lucide-react';
import { useAtom } from 'jotai';
import { therapistTriggerAtom, isTherapistModalOpenAtom } from '../../lib/uiStore';
const TherapistNotification: React.FC = () => {
  const [therapistTrigger, setTherapistTrigger] = useAtom(therapistTriggerAtom);
  const [, setIsTherapistModalOpen] = useAtom(isTherapistModalOpenAtom);

  const handleOpenTherapist = () => {
    setIsTherapistModalOpen(true);
    setTherapistTrigger(prev => ({ ...prev, active: false }));
  };

  const handleDismiss = () => {
    setTherapistTrigger(prev => ({ ...prev, active: false }));
  };

  if (!therapistTrigger.active) return null;

  return (
    
      <div
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl shadow-2xl border border-pink-200/30 p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold text-sm">AI Financial Therapist</h4>
                <button
                  onClick={handleDismiss}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-white/90 text-sm mb-3 leading-relaxed">
                {therapistTrigger.reason}
              </p>
              
              <button
                onClick={handleOpenTherapist}
                className="bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-200 transform hover:scale-105"
              >
                Let's Talk About It
              </button>
            </div>
          </div>
        </div>
      </div>
    
  );
};

export default TherapistNotification; 