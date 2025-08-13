import React from 'react';

interface DashboardCardProps {
  children: React.ReactNode;
  gradient?: 'dark' | 'blue' | 'purple' | 'pink';
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ 
  children, 
  gradient = 'dark', 
  className = '',
  onClick,
  hover = true
}) => {
  const gradientClass = gradient !== 'dark' ? `card-gradient-${gradient}` : '';
  const hoverClass = hover ? 'hover:transform hover:-translate-y-1' : '';
  
  return (
    <div 
      className={`dashboard-card ${gradientClass} ${hoverClass} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </div>
  );
};

export default DashboardCard; 