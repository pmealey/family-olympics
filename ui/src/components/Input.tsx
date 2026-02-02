import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

// Input types that should NOT auto-capitalize
const noCapitalizeTypes = ['number', 'time', 'date', 'datetime-local', 'email', 'url', 'password', 'tel'];

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helpText,
  className = '',
  type,
  autoCapitalize,
  ...props
}) => {
  // Determine auto-capitalize: explicit prop > smart default based on type
  const resolvedAutoCapitalize = autoCapitalize ?? 
    (noCapitalizeTypes.includes(type || '') ? 'none' : 'words');

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-winter-dark mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        autoCapitalize={resolvedAutoCapitalize}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-winter-accent focus:border-transparent transition-all min-h-[44px] ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-winter-gray">{helpText}</p>
      )}
    </div>
  );
};

