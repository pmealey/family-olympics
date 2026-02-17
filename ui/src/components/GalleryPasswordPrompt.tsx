import React, { useState, useCallback } from 'react';
import { Card, CardBody, Button, Input } from './index';

interface GalleryPasswordPromptProps {
  onSubmit: (password: string) => Promise<boolean>;
  error?: string | null;
}

export const GalleryPasswordPrompt: React.FC<GalleryPasswordPromptProps> = ({
  onSubmit,
  error: externalError,
}) => {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          <Input
            type="password"
            label="Gallery password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={externalError ?? undefined}
            autoComplete="current-password"
            disabled={submitting}
          />
          <Button type="submit" loading={submitting} disabled={!password.trim()}>
            View gallery
          </Button>
        </form>
      </CardBody>
    </Card>
  );
};
