import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody } from '../components';

export const Home: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Logo Placeholder */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-winter-accent to-winter-accent-dark rounded-full flex items-center justify-center mb-4">
          <span className="text-6xl">❄️</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-winter-dark">
          Family Olympics 2025
        </h2>
      </div>

      {/* Schedule CTA */}
      <Link to="/schedule">
        <Button variant="primary" size="lg" fullWidth>
          📅 View Schedule →
        </Button>
      </Link>

      {/* Current Standings */}
      <Card>
        <CardBody>
          <h3 className="text-xl font-display font-bold mb-4">
            Current Standings
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🥇</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-4 bg-team-pink rounded"></div>
                    <span className="font-semibold">Pink Flamingos</span>
                  </div>
                </div>
              </div>
              <span className="font-mono font-bold text-lg">0 pts</span>
            </div>
            
            <div className="text-center text-sm text-winter-gray mt-4">
              Events completed: 0/0
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

