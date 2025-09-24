import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
  isPulling: boolean;
}

const PullToRefreshIndicator: React.FC<PullToRefreshProps> = ({
  isRefreshing,
  pullDistance,
  threshold,
  isPulling
}) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = isPulling || isRefreshing;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4"
        >
          <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-lg">
            <div className="flex items-center gap-3">
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                  <span className="text-white text-sm font-medium">Refreshing...</span>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: progress > 0.8 ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowDown className="w-5 h-5 text-white/70" />
                  </motion.div>
                  <span className="text-white/70 text-sm">
                    {progress > 0.8 ? 'Release to refresh' : 'Pull to refresh'}
                  </span>
                </>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PullToRefreshIndicator;
