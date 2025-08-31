import React from 'react';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const LogoContent = (
    <div className={`flex items-center ${className}`}>
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mr-2 shadow-lg`}>
        <Crown size={iconSizes[size]} className="text-white font-bold" />
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
