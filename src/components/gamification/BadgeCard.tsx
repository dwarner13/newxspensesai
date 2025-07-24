import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Award, Lock, Zap } from 'lucide-react';

interface BadgeCardProps {
  badge: string;
  description: string;
  earned: boolean;
  xpReward?: number;
  icon?: ReactNode;
  progress?: number;
  total?: number;
  className?: string;
}

const BadgeCard = ({
  badge,
  description,
  earned,
  xpReward = 25,
  icon,
  progress = 0,
  total = 1,
  className = ''
}: BadgeCardProps) => {
  const progressPercent = Math.min((progress / total) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
        earned
          ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md'
          : 'border-gray-200 bg-gray-50 opacity-75'
      } ${className}`}
    >
      {/* Badge Icon */}
      <div className="flex items-center space-x-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          earned
            ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg'
            : 'bg-gray-200 text-gray-400'
        }`}>
          {earned ? (
            icon || <Award size={20} />
          ) : (
            <Lock size={20} />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className={`font-semibold ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
            {badge}
          </h4>
          <p className={`text-sm ${earned ? 'text-gray-600' : 'text-gray-400'}`}>
            {description}
          </p>
        </div>
      </div>

      {/* Progress Bar (for unearned badges) */}
      {!earned && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}/{total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* XP Reward */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Zap size={14} className={earned ? 'text-yellow-600' : 'text-gray-400'} />
          <span className={`text-sm font-medium ${earned ? 'text-yellow-600' : 'text-gray-400'}`}>
            +{xpReward} XP
          </span>
        </div>
        
        {earned && (
          <div className="text-xs text-gray-500">
            Earned
          </div>
        )}
      </div>

      {/* Earned Badge Overlay */}
      {earned && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white shadow-lg"
        >
          <Award size={16} />
        </motion.div>
      )}
    </motion.div>
  );
};

export default BadgeCard;
