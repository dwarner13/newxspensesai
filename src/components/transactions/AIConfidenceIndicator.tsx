import React from 'react';
import { Brain, Edit2, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AIConfidenceIndicatorProps {
  confidence: number;
  source: 'ai' | 'manual' | 'memory';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AIConfidenceIndicator: React.FC<AIConfidenceIndicatorProps> = ({
  confidence,
  source,
  showLabel = true,
  size = 'md'
}) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-400';
    if (conf >= 0.7) return 'text-yellow-400';
    if (conf >= 0.5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getConfidenceBgColor = (conf: number) => {
    if (conf >= 0.9) return 'bg-green-500/20';
    if (conf >= 0.7) return 'bg-yellow-500/20';
    if (conf >= 0.5) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.9) return 'Very High';
    if (conf >= 0.7) return 'High';
    if (conf >= 0.5) return 'Medium';
    return 'Low';
  };

  const getSourceIcon = (src: string) => {
    switch (src) {
      case 'ai':
        return <Brain className="w-4 h-4 text-blue-500" />;
      case 'manual':
        return <Edit2 className="w-4 h-4 text-green-500" />;
      case 'memory':
        return <Zap className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'ai':
        return 'AI';
      case 'manual':
        return 'Manual';
      case 'memory':
        return 'Learned';
      default:
        return 'Unknown';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          text: 'text-xs',
          icon: 'w-3 h-3',
          progress: 'h-1'
        };
      case 'lg':
        return {
          container: 'px-4 py-2',
          text: 'text-sm',
          icon: 'w-5 h-5',
          progress: 'h-2'
        };
      default: // md
        return {
          container: 'px-3 py-1.5',
          text: 'text-xs',
          icon: 'w-4 h-4',
          progress: 'h-1.5'
        };
    }
  };

  const sizeClasses = getSizeClasses(size);

  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses.container} ${getConfidenceBgColor(confidence)} rounded-full`}>
      {getSourceIcon(source)}
      
      {source === 'ai' && (
        <div className="flex items-center gap-1">
          <div className={`w-12 ${sizeClasses.progress} bg-slate-600 rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${getConfidenceColor(confidence).replace('text-', 'bg-')} transition-all duration-300`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          {showLabel && (
            <span className={`${sizeClasses.text} ${getConfidenceColor(confidence)} font-medium`}>
              {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
      )}
      
      {source === 'manual' && (
        <div className="flex items-center gap-1">
          <CheckCircle className={`${sizeClasses.icon} text-green-500`} />
          {showLabel && (
            <span className={`${sizeClasses.text} text-green-400 font-medium`}>
              Manual
            </span>
          )}
        </div>
      )}
      
      {source === 'memory' && (
        <div className="flex items-center gap-1">
          <Clock className={`${sizeClasses.icon} text-purple-500`} />
          {showLabel && (
            <span className={`${sizeClasses.text} text-purple-400 font-medium`}>
              Learned
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AIConfidenceIndicator;
