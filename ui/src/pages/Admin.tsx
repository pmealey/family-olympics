import React from 'react';
import { Card, CardBody } from '../components';

export const Admin: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Admin Dashboard</h2>

      <Card>
        <CardBody>
          <div className="text-center py-8">
            <span className="text-6xl mb-4 block">🔐</span>
            <h3 className="text-xl font-display font-semibold mb-2">
              Admin Interface
            </h3>
            <p className="text-winter-gray">
              Admin functionality will be implemented in Phase 2.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

