import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'lg', className = '' }) => {
  const sizeMap = {
    sm: 128,
    md: 192,
    lg: 256,
    xl: 320,
  };

  const dimension = sizeMap[size];

  return (
    <img
      src="/family-olympics/family-olympics-logo.png"
      alt="Family Olympics Logo"
      width={dimension}
      height={dimension}
      className={className}
    />
  );
};

