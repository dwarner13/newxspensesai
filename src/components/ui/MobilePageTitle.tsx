import React from 'react';

interface MobilePageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const MobilePageTitle: React.FC<MobilePageTitleProps> = ({ 
  title, 
  subtitle, 
  className = "" 
}) => {
  return (
    <div className={`text-center mb-2 mt-2 block md:hidden ${className}`} style={{ position: 'relative', zIndex: 50 }}>
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>{title}</h1>
      {subtitle && (
        <p className="text-white/60 text-sm">{subtitle}</p>
      )}
    </div>
  );
};

export default MobilePageTitle;