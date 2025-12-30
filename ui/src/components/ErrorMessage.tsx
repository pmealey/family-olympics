import React from 'react';
import { Button } from './Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-2xl">⚠️</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-900 mb-1">{title}</h3>
          <p className="text-sm text-red-700">{message}</p>
          {onRetry && (
            <div className="mt-4">
              <Button onClick={onRetry} variant="secondary" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

