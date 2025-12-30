import React from 'react';

interface StatusBadgeProps {
  status: 'upcoming' | 'in-progress' | 'completed';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  
  const statusClasses = {
    upcoming: 'bg-gray-200 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800 pulse-subtle',
    completed: 'bg-green-100 text-green-800',
  };
  
  const statusLabels = {
    upcoming: 'UPCOMING',
    'in-progress': 'IN PROGRESS',
    completed: 'COMPLETED ✓',
  };
  
  return (
    <span className={`${baseClasses} ${statusClasses[status]} ${className}`}>
      {statusLabels[status]}
    </span>
  );
};

