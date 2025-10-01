import { ReactNode } from 'react';
import { Zap } from 'lucide-react';

interface TaskCardProps {
  title: string;
  description: string;
  xpReward: number;
  icon: ReactNode;
  completed?: boolean;
  onClick?: () => void;
  className?: string;
}

const TaskCard = ({ 
  title, 
  description, 
  xpReward, 
  icon, 
  completed = false,
  onClick,
  className = ''
}: TaskCardProps) => {
  return (
    <div
      whileHover={{ scale: onClick && !completed ? 1.02 : 1 }}
      whileTap={{ scale: onClick && !completed ? 0.98 : 1 }}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
        completed 
          ? 'bg-gray-50 border-gray-200 opacity-75' 
          : 'bg-white border-primary-200 shadow-sm hover:shadow-md'
      } ${onClick && !completed ? 'cursor-pointer' : ''} ${className}`}
      onClick={!completed && onClick ? onClick : undefined}
    >
      {/* Completed Overlay */}
      {completed && (
        <div className="absolute top-3 right-3 bg-success-500 text-white text-xs font-medium px-2 py-1 rounded-full">
          Completed
        </div>
      )}
      
      <div className="p-5">
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            completed ? 'bg-gray-100 text-gray-400' : 'bg-primary-100 text-primary-600'
          }`}>
            {icon}
          </div>
          
          <div className="flex-1">
            <h3 className={`font-semibold text-lg mb-1 ${completed ? 'text-gray-500' : 'text-gray-900'}`}>
              {title}
            </h3>
            <p className={`text-sm mb-3 ${completed ? 'text-gray-400' : 'text-gray-600'}`}>
              {description}
            </p>
            
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              completed ? 'bg-gray-100 text-gray-500' : 'bg-primary-100 text-primary-700'
            }`}>
              <Zap size={14} className="mr-1" />
              +{xpReward} XP
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Indicator */}
      {!completed && (
        <div className="h-1 w-full bg-gradient-to-r from-primary-500 to-secondary-500"></div>
      )}
    </div>
  );
};

export default TaskCard;
