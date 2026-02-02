import React from 'react';

interface StatusBadgeProps {
  completed?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ completed, className = '' }) => {
  // Only render the badge if event is completed
  if (!completed) {
    return null;
  }
  
  const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  
  return (
    <span className={`${baseClasses} bg-green-100 text-green-800 ${className}`}>
      COMPLETED ✓
    </span>
  );
};

