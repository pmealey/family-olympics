import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', message }) => {
  const sizeMap = {
    sm: { container: 'h-12 w-12', text: 'text-sm' },
    md: { container: 'h-16 w-16', text: 'text-base' },
    lg: { container: 'h-24 w-24', text: 'text-lg' },
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`relative ${sizeMap[size].container}`}>
        {/* Spinning snowflake */}
        <div className="absolute inset-0 animate-spin">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2v20M2 12h20M6 6l12 12M6 18L18 6"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="2" fill="url(#gradient)" />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#93c5fd" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {message && (
        <p className={`mt-4 text-winter-gray font-body ${sizeMap[size].text}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} 
       style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, shimmer 2s linear infinite' }}>
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);
