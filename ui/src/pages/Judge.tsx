/**
 * Judge Page - Entry point for judge interface
 * Identity selection: Council of Unaffiliated Neutral Folks or team representative.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../contexts';
import { useCurrentOlympics, useTeams } from '../hooks/useApi';
import { Card, CardBody, CardFooter, Input, Button, Loading } from '../components';
import { TeamColorIndicator } from '../components/TeamColorIndicator';
import type { Team } from '../lib/api';

type Step = 'choose' | 'cunf-name' | 'team-picker';

const COLOR_ORDER: Array<Team['color']> = ['green', 'pink', 'orange', 'yellow'];

export const Judge: React.FC = () => {
  const navigate = useNavigate();
  const { judgeName, setJudgeAsCunf, setJudgeAsTeamRep } = useJudge();
  const { data: olympics, loading: olympicsLoading } = useCurrentOlympics();
  const { data: teamsData, loading: teamsLoading } = useTeams(olympics?.year ?? null);

  const [step, setStep] = useState<Step>('choose');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Redirect to events if judge identity is already set
  useEffect(() => {
    if (judgeName) {
      navigate('/judge/events');
    }
  }, [judgeName, navigate]);

  const handleCunfSubmit = (e: React.FormEvent) => {
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
    setError('');
    setJudgeAsCunf(trimmedName);
    navigate('/judge/events');
  };

  const handleTeamSelect = (team: Team) => {
    setJudgeAsTeamRep(team.name, team.teamId);
    navigate('/judge/events');
  };

  const teams = teamsData?.teams ?? [];
  const teamsByColor = React.useMemo(() => {
    const order = COLOR_ORDER;
    return [...teams].sort(
      (a, b) => order.indexOf(a.color) - order.indexOf(b.color)
    );
  }, [teams]);

  if (olympicsLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <span className="text-6xl mb-4 block">⚖️</span>
        <h2 className="text-2xl font-display font-bold">Judge Portal</h2>
        <p className="text-winter-gray mt-2">
          {step === 'choose' &&
            'Choose how you’re participating as a judge'}
          {step === 'cunf-name' &&
            'Enter your name to begin scoring events'}
          {step === 'team-picker' &&
            'Select your team'}
        </p>
      </div>

      {step === 'choose' && (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm text-winter-gray">
              Are you judging as a neutral party or as a team representative?
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setStep('cunf-name')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-winter-accent hover:bg-ice-blue/30 focus:outline-none focus:ring-2 focus:ring-winter-accent focus:ring-offset-2 transition-colors"
              >
                <span className="text-3xl shrink-0" aria-hidden>🏛️</span>
                <div>
                  <span className="font-display font-semibold text-winter-dark block">
                    Council of Unaffiliated Neutral Folks
                  </span>
                  <span className="text-sm text-winter-gray">
                    I’m not representing a team
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStep('team-picker')}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white text-left hover:border-winter-accent hover:bg-ice-blue/30 focus:outline-none focus:ring-2 focus:ring-winter-accent focus:ring-offset-2 transition-colors"
              >
                <span className="text-3xl shrink-0" aria-hidden>👤</span>
                <div>
                  <span className="font-display font-semibold text-winter-dark block">
                    I represent a team
                  </span>
                  <span className="text-sm text-winter-gray">
                    I’ll judge the other teams’ entries
                  </span>
                </div>
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 'cunf-name' && (
        <Card>
          <form onSubmit={handleCunfSubmit}>
            <CardBody className="space-y-4">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-sm text-winter-accent hover:underline mb-2"
              >
                ← Back
              </button>
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
      )}

      {step === 'team-picker' && (
        <Card>
          <CardBody className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('choose')}
              className="text-sm text-winter-accent hover:underline mb-2"
            >
              ← Back
            </button>
            {!olympics ? (
              <p className="text-winter-gray text-center py-4">
                No active Olympics found.
              </p>
            ) : teamsLoading ? (
              <Loading />
            ) : teamsByColor.length === 0 ? (
              <p className="text-winter-gray text-center py-4">
                No teams set up for this year yet.
              </p>
            ) : (
              <>
                <p className="text-sm text-winter-gray mb-2">
                  Your name will appear as your team name when you submit scores.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {teamsByColor.map((team) => (
                  <button
                    key={team.teamId}
                    type="button"
                    onClick={() => handleTeamSelect(team)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-winter-accent hover:bg-ice-blue/30 focus:outline-none focus:ring-2 focus:ring-winter-accent focus:ring-offset-2 transition-colors"
                  >
                    <TeamColorIndicator color={team.color} size="lg" />
                    <span className="font-display font-semibold text-winter-dark text-center text-sm">
                      {team.name}
                    </span>
                    <span className="text-xs text-winter-gray capitalize">
                      {team.color}
                    </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};
