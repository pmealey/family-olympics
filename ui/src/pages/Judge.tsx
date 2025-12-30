/**
 * Judge Page - Entry point for judge interface
 * Handles name entry and redirects to event list
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../contexts';
import { Card, CardBody, CardFooter, Input, Button } from '../components';

export const Judge: React.FC = () => {
  const navigate = useNavigate();
  const { judgeName, setJudgeName } = useJudge();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Redirect to events if judge name is already set
  useEffect(() => {
    if (judgeName) {
      navigate('/judge/events');
    }
  }, [judgeName, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setJudgeName(trimmedName);
    navigate('/judge/events');
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <span className="text-6xl mb-4 block">⚖️</span>
        <h2 className="text-2xl font-display font-bold">Judge Portal</h2>
        <p className="text-winter-gray mt-2">
          Enter your name to begin scoring events
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-4">
            <Input
              label="Your Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Uncle Bob"
              error={error}
              autoFocus
            />
            <p className="text-sm text-winter-gray">
              Your name will be stored locally and used to track your scores.
            </p>
          </CardBody>
          <CardFooter>
            <Button type="submit" fullWidth>
              Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

