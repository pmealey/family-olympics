import React from 'react';
import { Card, CardBody } from '../components';

export const Judge: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Judge Portal</h2>

      <Card>
        <CardBody>
          <div className="text-center py-8">
            <span className="text-6xl mb-4 block">⚖️</span>
            <h3 className="text-xl font-display font-semibold mb-2">
              Judge Interface
            </h3>
            <p className="text-winter-gray">
              Judge functionality will be available once events are configured.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

