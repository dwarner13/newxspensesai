import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Settings, 
  MoreVertical,
  FileText,
  Banknote,
  Heart,
  Target,
  TrendingUp,
  Brain,
  Award,
  Calculator,
  Building2,
  Music,
  Headphones,
  Zap,
  Sparkles
} from 'lucide-react';

interface EmployeePersonality {
  id: string;
  name: string;
  specialty: string;
  icon: React.ReactNode;
  color: string;
  status: 'online' | 'typing' | 'processing' | 'away';
  catchphrases: string[];
  lastActive?: string;
}

interface PersonalityHeaderProps {
  employee: EmployeePersonality;
  onClose: () => void;
  onSettings?: () => void;
  isVoiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  isMobile?: boolean;
}

const statusConfig = {
  online: { 
    color: 'bg-green-400', 
    label: 'Online',
    animation: 'animate-pulse'
  },
  typing: { 
    color: 'bg-yellow-400', 
    label: 'Typing...',
    animation: 'animate-bounce'
  },
  processing: { 
    color: 'bg-blue-400', 
    label: 'Processing...',
    animation: 'animate-spin'
  },
  away: { 
    color: 'bg-gray-400', 
    label: 'Away',
    animation: ''
  }
};

const getRandomCatchphrase = (catchphrases: string[]) => {
  return catchphrases[Math.floor(Math.random() * catchphrases.length)];
};

export function PersonalityHeader({ 
  employee, 
  onClose, 
  onSettings, 
  isVoiceEnabled = false, 
  onVoiceToggle,
  isMobile = false 
}: PersonalityHeaderProps) {
  const status = statusConfig[employee.status];
  const catchphrase = getRandomCatchphrase(employee.catchphrases);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${employee.color} px-6 py-4 flex items-center justify-between`}
    >
      {/* Employee Info */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
            {employee.icon}
          </div>
          
          {/* Status Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${status.color} rounded-full border-2 border-white ${status.animation}`}>
            <div className="w-full h-full rounded-full bg-white/30"></div>
          </div>
        </motion.div>

        {/* Employee Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-white font-semibold text-lg truncate">
              {employee.name}
            </h3>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden sm:block"
            >
              <Sparkles className="w-4 h-4 text-white/80" />
            </motion.div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-white/80 text-sm truncate">
              {employee.specialty}
            </span>
            <span className="text-white/60 text-xs">
              •
            </span>
            <span className="text-white/60 text-xs">
              {status.label}
            </span>
          </div>

          {/* Catchphrase */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/70 text-xs truncate mt-1"
          >
            "{catchphrase}"
          </motion.p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Voice Toggle */}
        {onVoiceToggle && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onVoiceToggle}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isVoiceEnabled 
                ? 'bg-white/30 text-white' 
                : 'bg-white/20 text-white/70 hover:bg-white/30 hover:text-white'
            }`}
          >
            {isVoiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </motion.button>
        )}

        {/* Settings */}
        {onSettings && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettings}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:bg-white/30 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        )}

        {/* More Options */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:bg-white/30 hover:text-white transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </motion.button>

        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:bg-white/30 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// Employee icon mapping for consistency
export const employeeIcons: Record<string, React.ReactNode> = {
  'smart-import': <FileText className="w-5 h-5" />,
  'financial-assistant': <Banknote className="w-5 h-5" />,
  'financial-therapist': <Heart className="w-5 h-5" />,
  'goal-concierge': <Target className="w-5 h-5" />,
  'spending-predictions': <TrendingUp className="w-5 h-5" />,
  'categorization': <Brain className="w-5 h-5" />,
  'debt-elimination': <Zap className="w-5 h-5" />,
  'investment-strategy': <TrendingUp className="w-5 h-5" />,
  'budget-reality': <Banknote className="w-5 h-5" />,
  'sassy-spending': <Heart className="w-5 h-5" />,
  'wellness-balance': <Heart className="w-5 h-5" />,
  'automation-efficiency': <Zap className="w-5 h-5" />,
  'motivation-coach': <Zap className="w-5 h-5" />,
  'business-intel': <TrendingUp className="w-5 h-5" />,
  'tax-expert': <Calculator className="w-5 h-5" />,
  'data-viz': <TrendingUp className="w-5 h-5" />,
  'creative-income': <Zap className="w-5 h-5" />,
  'music-wellness': <Music className="w-5 h-5" />
};

// Employee color schemes
export const employeeColors: Record<string, string> = {
  'smart-import': 'from-green-500 to-emerald-600',
  'financial-assistant': 'from-blue-500 to-indigo-600',
  'financial-therapist': 'from-pink-500 to-rose-600',
  'goal-concierge': 'from-purple-500 to-violet-600',
  'spending-predictions': 'from-cyan-500 to-blue-600',
  'categorization': 'from-orange-500 to-red-600',
  'debt-elimination': 'from-red-500 to-pink-600',
  'investment-strategy': 'from-indigo-500 to-purple-600',
  'budget-reality': 'from-yellow-500 to-orange-600',
  'sassy-spending': 'from-pink-500 to-red-600',
  'wellness-balance': 'from-green-500 to-teal-600',
  'automation-efficiency': 'from-blue-500 to-cyan-600',
  'motivation-coach': 'from-orange-500 to-yellow-600',
  'business-intel': 'from-gray-500 to-slate-600',
  'tax-expert': 'from-emerald-500 to-green-600',
  'data-viz': 'from-violet-500 to-purple-600',
  'creative-income': 'from-rose-500 to-pink-600',
  'music-wellness': 'from-indigo-500 to-blue-600'
};
