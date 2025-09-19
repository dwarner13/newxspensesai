import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Only render on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <div className={`text-center mb-4 mt-1 ${className}`}>
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3" style={{ WebkitBackgroundClip: 'text' }}>{title}</h1>
      {subtitle && (
        <p className="text-white/60 text-base">{subtitle}</p>
      )}
    </div>
  );
};

export default MobilePageTitle;