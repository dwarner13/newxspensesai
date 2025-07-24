import { motion } from 'framer-motion';
import { Zap, CheckCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface MissionCardProps {
  mission: string;
  xpReward: number;
  progress: number;
  goal: number;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const MissionCard = ({
  mission,
  xpReward,
  progress,
  goal,
  icon,
  onClick,
  className = ''
}: MissionCardProps) => {
  const isCompleted = progress >= goal;
  const progressPercent = Math.min((progress / goal) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: onClick && !isCompleted ? 1.02 : 1 }}
      whileTap={{ scale: onClick && !isCompleted ? 0.98 : 1 }}
      className={`bg-white rounded-lg shadow p-4 ${onClick && !isCompleted ? 'cursor-pointer' : ''} ${className}`}
      onClick={!isCompleted && onClick ? onClick : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {isCompleted ? <CheckCircle size={20} /> : icon}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{mission}</h4>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Zap size={12} className="text-yellow-500" />
              <span>+{xpReward} XP</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{progress}/{goal}</div>
          <div className="text-xs text-gray-500">completed</div>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          className={`h-2 rounded-full ${
            isCompleted 
              ? 'bg-green-500' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}
        />
      </div>
      
      {isCompleted && (
        <div className="mt-2 text-xs text-green-600 flex items-center justify-end">
          <CheckCircle size={12} className="mr-1" />
          <span>Mission completed!</span>
        </div>
      )}
    </motion.div>
  );
};

export default MissionCard;
