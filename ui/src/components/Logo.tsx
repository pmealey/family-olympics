import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'lg', className = '' }) => {
  const sizeMap = {
    sm: 64,
    md: 96,
    lg: 128,
    xl: 192,
  };

  const dimension = sizeMap[size];

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle - winter blue gradient */}
      <defs>
        <linearGradient id="winterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="snowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#e0f2fe', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="100" cy="100" r="95" fill="url(#winterGradient)" />

      {/* Snowflake design */}
      <g transform="translate(100, 100)">
        {/* Center circle */}
        <circle cx="0" cy="0" r="12" fill="url(#snowGradient)" />

        {/* Six main arms */}
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            {/* Main arm */}
            <rect
              x="-4"
              y="-70"
              width="8"
              height="70"
              fill="url(#snowGradient)"
              rx="2"
            />
            {/* Side branches */}
            <rect
              x="-20"
              y="-55"
              width="16"
              height="6"
              fill="url(#snowGradient)"
              rx="2"
              transform="rotate(-45 -12 -52)"
            />
            <rect
              x="4"
              y="-55"
              width="16"
              height="6"
              fill="url(#snowGradient)"
              rx="2"
              transform="rotate(45 12 -52)"
            />
            {/* Tip decoration */}
            <circle cx="0" cy="-70" r="6" fill="url(#snowGradient)" />
          </g>
        ))}

        {/* Olympic rings inspired circles (small decorative elements) */}
        <circle cx="-25" cy="0" r="5" fill="#22c55e" opacity="0.8" />
        <circle cx="25" cy="0" r="5" fill="#ec4899" opacity="0.8" />
        <circle cx="-12" cy="15" r="5" fill="#eab308" opacity="0.8" />
        <circle cx="12" cy="15" r="5" fill="#f97316" opacity="0.8" />
      </g>

      {/* Outer ring decoration */}
      <circle
        cx="100"
        cy="100"
        r="95"
        fill="none"
        stroke="white"
        strokeWidth="3"
        opacity="0.3"
      />
    </svg>
  );
};

