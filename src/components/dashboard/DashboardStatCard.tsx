import React from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getThemeClasses } from '../../theme/dashboardTheme';
import { cn } from '../../lib/utils';

export interface DashboardStatCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stats: Record<string, string | number>;
  buttonText: string;
  color: string; // Tailwind gradient classes like 'from-blue-500 to-blue-600'
  onClick: () => void;
  navigateTo?: string; // Optional route to navigate to (takes precedence over onClick)
  isLoading?: boolean;
}

/**
 * Reusable dashboard stat card component
 * Updated with MultipurposeThemes-style dark analytics theme
 */
export const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  description,
  icon,
  stats,
  buttonText,
  color,
  onClick,
  navigateTo,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (navigateTo) {
      navigate(navigateTo);
    } else {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between",
        "rounded-3xl",
        "border border-slate-700/60",
        "bg-slate-900/70 backdrop-blur",
        "shadow-[0_18px_45px_rgba(0,0,0,0.45)]",
        "hover:border-sky-500/60",
        "transition-all duration-200",
        "p-6",
        "min-h-[280px]"
      )}
    >
      {/* Top section: icon, title, status, description */}
      <div className="space-y-2 flex-1 min-h-0 flex flex-col">
        {/* Header with icon and stats */}
        <div className="flex items-start justify-between gap-2 flex-shrink-0">
          {/* Icon container */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800/50 flex-shrink-0">
            {icon && <div className="w-6 h-6 text-white flex items-center justify-center">{icon}</div>}
          </div>
          {/* Status text - with truncation to prevent overflow */}
          <div className="text-right text-xs flex flex-col justify-center space-y-1 flex-shrink-0 min-w-0 max-w-[50%]">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="text-xs text-slate-400 leading-tight truncate">
                <span className="truncate block">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: <span className="text-sm font-semibold text-slate-200 tracking-tight">{String(value)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-200 flex-shrink-0">
          {title}
        </h3>
        
        {/* Description - limited to 3 lines with ellipsis to keep cards uniform */}
        <p className="text-sm text-slate-300 flex-1 min-h-0 overflow-hidden" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.5rem'
        }}>
          {description}
        </p>
      </div>
      
      {/* Bottom section: button - always aligned at bottom */}
      <div className="mt-6 flex-shrink-0">
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`w-full bg-gradient-to-r ${color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-center space-x-2 text-sm`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <span>{buttonText}</span>
          )}
        </button>
      </div>
    </div>
  );
};

