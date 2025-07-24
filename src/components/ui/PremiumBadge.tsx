import { Crown, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'button' | 'banner';
  onClick?: () => void;
  className?: string;
}

const PremiumBadge = ({ 
  size = 'md', 
  variant = 'badge',
  onClick,
  className = '' 
}: PremiumBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-3 rounded-lg ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown size={20} />
            <span className="font-medium">Upgrade to Premium</span>
          </div>
          {onClick && (
            <button
              onClick={onClick}
              className="bg-white text-yellow-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-yellow-50 transition-colors"
            >
              Learn More
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === 'button') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-medium hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 flex items-center space-x-2 ${sizeClasses[size]} ${className}`}
      >
        <Crown size={iconSizes[size]} />
        <span>Premium</span>
        <Zap size={iconSizes[size]} />
      </motion.button>
    );
  }

  // Default badge variant
  return (
    <span className={`inline-flex items-center space-x-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-medium ${sizeClasses[size]} ${className}`}>
      <Crown size={iconSizes[size]} />
      <span>Premium</span>
    </span>
  );
};

export default PremiumBadge;
