import React from 'react';
import { Link } from 'react-router-dom';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  linkTo?: string;
}

export default function Logo({ 
  size = 'md', 
  showText = true, 
  className = '',
  linkTo = '/'
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 28
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  // Map Logo sizes to PrimeLogoBadge sizes
  const badgeSizes = {
    sm: 24,
    md: 32,
    lg: 40
  };

  const LogoContent = (
    <div className={`flex items-center ${className}`}>
      <div className="mr-2">
        <PrimeLogoBadge size={badgeSizes[size]} showGlow={true} />
      </div>
      {showText && (
        <span className={`font-bold text-white tracking-tight ${textSizes[size]} font-['Montserrat']`}>
          XspensesAI
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center">
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}
