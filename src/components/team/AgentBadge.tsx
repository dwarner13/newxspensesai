import React from 'react';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

interface AgentBadgeProps {
  id: string;
  name: string;
  role: string;
  color: string;
  active: boolean;
  emoji?: string;
  onToggle: (id: string) => void;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({
  id,
  name,
  role,
  color,
  active,
  emoji,
  onToggle
}) => {
  return (
    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
      {/* Avatar */}
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
        style={{ backgroundColor: color + '20' }}
      >
        {emoji || name.charAt(0).toUpperCase()}
      </div>
      
      {/* Name and Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm truncate">{name}</span>
          <div className="flex items-center gap-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                active ? 'bg-green-400' : 'bg-gray-500'
              }`}
            />
            <span className="text-xs text-white/50">
              {active ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <p className="text-white/60 text-xs truncate">{role}</p>
      </div>
      
      {/* Toggle Switch */}
      <Switch
        checked={active}
        onCheckedChange={() => onToggle(id)}
        className="data-[state=checked]:bg-green-600"
      />
    </div>
  );
};

