import React from 'react';

interface TeamColorIndicatorProps {
  color?: 'green' | 'pink' | 'yellow' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TeamColorIndicator: React.FC<TeamColorIndicatorProps> = ({ 
  color, 
  size = 'md',
  className = '' 
}) => {
  const colorClasses = {
    green: 'bg-team-green',
    pink: 'bg-team-pink',
    yellow: 'bg-team-yellow',
    orange: 'bg-team-orange',
  };
  
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-12 h-6',
    lg: 'w-16 h-8',
  };
  
  if (!color) {
    return null;
  }
  
  return (
    <div 
      className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} rounded ${className}`}
      aria-label={`${color} team`}
    />
  );
};

