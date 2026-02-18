import React, { useState, useCallback } from 'react';
import { Card, CardBody, Button, Input } from './index';

interface GalleryPasswordPromptProps {
  onSubmit: (password: string) => Promise<boolean>;
  error?: string | null;
}

export function PasswordEyeIcon({ show }: { show: boolean }) {
  if (show) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export const GalleryPasswordPrompt: React.FC<GalleryPasswordPromptProps> = ({
  onSubmit,
  error: externalError,
}) => {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim()) return;
      setSubmitting(true);
      try {
        await onSubmit(password.trim());
        setPassword('');
      } finally {
        setSubmitting(false);
      }
    },
    [password, onSubmit]
  );

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <p className="text-winter-dark">
            This gallery is protected. Enter the password to view photos and videos.
          </p>
          <div className="w-full">
            <label className="block text-sm font-medium text-winter-dark mb-1">
              Gallery password
            </label>
            <div className="relative w-full">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={externalError ?? undefined}
                autoComplete="current-password"
                disabled={submitting}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded text-winter-gray hover:text-winter-dark hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <PasswordEyeIcon show={!showPassword} />
              </button>
            </div>
          </div>
          <Button type="submit" loading={submitting} disabled={!password.trim()}>
            View gallery
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};
