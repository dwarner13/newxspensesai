import { ReactNode } from 'react';
interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

const StatCard = ({ title, value, icon, trend, className = '' }: StatCardProps) => {
  return (
    <div
      className={`stat-card ${className}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#718096', margin: '0' }}>{title}</p>
          <p style={{ fontSize: '1.875rem', fontWeight: '700', color: '#2D3748', margin: '8px 0 0 0' }}>{value}</p>
        </div>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#EBF8FF', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      
      {trend && (
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: '500',
            color: trend.value >= 0 ? '#48BB78' : '#F56565'
          }}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span style={{ marginLeft: '8px', fontSize: '0.875rem', color: '#718096' }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
