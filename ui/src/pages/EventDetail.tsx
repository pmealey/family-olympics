import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, CardBody } from '../components';

export const EventDetail: React.FC = () => {
  const { eventId } = useParams();

  return (
    <div className="space-y-6">
      <Link to="/schedule">
        <Button variant="ghost" size="sm">
          ← Back to Schedule
        </Button>
      </Link>

      <Card>
        <CardBody>
          <h2 className="text-2xl font-display font-bold mb-4">
            Event Details
          </h2>
          <p className="text-winter-gray">
            Event ID: {eventId}
          </p>
          <p className="mt-4 text-winter-gray">
            Event details will be displayed here once configured.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

