import React, { useState } from 'react';

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ onRefresh, className = '' }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Keep spinning for at least 500ms for visual feedback
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`touch-target touch-feedback p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 ${className}`}
      aria-label="Refresh"
    >
      <svg
        className={`w-5 h-5 text-winter-gray ${isRefreshing ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
};

