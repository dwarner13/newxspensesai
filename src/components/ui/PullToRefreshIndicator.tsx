import React from 'react';
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
    <>
      {shouldShow && (
        <div
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
                  <div
                  >
                    <ArrowDown className="w-5 h-5 text-white/70" />
                  </div>
                  <span className="text-white/70 text-sm">
                    {progress > 0.8 ? 'Release to refresh' : 'Pull to refresh'}
                  </span>
                </>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                animate={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PullToRefreshIndicator;
