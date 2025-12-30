import React from 'react';

interface CardProps {
  children: React.ReactNode;
  teamColor?: 'green' | 'pink' | 'yellow' | 'orange';
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  teamColor, 
  onClick, 
  className = '' 
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-md overflow-hidden';
  const interactiveClasses = onClick ? 'card-interactive cursor-pointer touch-feedback' : '';
  
  const teamColorBorders = {
    green: 'border-t-4 border-team-green',
    pink: 'border-t-4 border-team-pink',
    yellow: 'border-t-4 border-team-yellow',
    orange: 'border-t-4 border-team-orange',
  };
  
  const teamColorClass = teamColor ? teamColorBorders[teamColor] : '';
  
  return (
    <div 
      className={`${baseClasses} ${interactiveClasses} ${teamColorClass} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-4 py-3 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-4 py-3 bg-gray-50 border-t border-gray-200 ${className}`}>
    {children}
  </div>
);

