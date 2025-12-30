/**
 * ScoreInput Component - Mobile-friendly 1-10 score picker
 */

import React from 'react';

interface ScoreInputProps {
  value: number | null;
  onChange: (score: number) => void;
  label: string;
  disabled?: boolean;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-winter-dark">
        {label}
      </label>
      <div className="grid grid-cols-10 gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            disabled={disabled}
            className={`
              min-h-[44px] min-w-[44px] rounded-lg font-semibold text-base
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-winter-accent focus:ring-offset-2
              ${
                value === score
                  ? 'bg-winter-accent text-white shadow-md scale-110'
                  : 'bg-white text-winter-dark border-2 border-gray-300 hover:border-winter-accent hover:bg-winter-accent-light hover:bg-opacity-20'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={`Score ${score}`}
            aria-pressed={value === score}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
};

