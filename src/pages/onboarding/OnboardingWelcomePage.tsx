import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingWelcomePage() {
  const navigate = useNavigate();
  const { user, firstName } = useAuth();

  const handleStartSetup = () => {
    navigate('/onboarding/setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 md:p-12 flex flex-col items-center text-center">
          {/* Prime Avatar */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/40 via-orange-500/30 to-pink-500/40 blur-2xl animate-pulse" />
            <div className="relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/90 via-orange-500 to-pink-500 shadow-[0_10px_40px_rgba(251,191,36,0.4)] border border-amber-300/30">
              <Crown className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
          </div>

          {/* Welcome Message */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Welcome to XspensesAI{firstName && firstName !== 'there' ? `, ${firstName}` : ''}
          </h1>
          
          <p className="text-base md:text-lg text-slate-300 mb-2 max-w-md mx-auto">
            I'm Prime, your AI financial CEO.
          </p>
          
          <p className="text-sm md:text-base text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Prime will guide you. Custodian will set up your profile.
          </p>

          {/* Start Setup Button */}
          <Button
            onClick={handleStartSetup}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-8 py-3 text-base"
          >
            Start Setup
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}




