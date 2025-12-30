import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, StatusBadge } from './';
import type { Event } from '../lib/api';

interface EventCardProps {
  event: Event;
  showDay?: boolean;
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  showDay = false,
  className = '' 
}) => {
  // Format time for display
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Time TBD';
    
    try {
      // Time is always in HH:MM format from the admin time input
      // Prepend a date to make it parseable
      const date = new Date(`2000-01-01T${timeString}`);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return timeString;
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  // Get event icon based on name or type
  const getEventIcon = () => {
    const name = event.name.toLowerCase();
    if (name.includes('snow')) return '❄️';
    if (name.includes('ski')) return '⛷️';
    if (name.includes('sled')) return '🛷';
    if (name.includes('ice')) return '🧊';
    if (name.includes('sculpture')) return '⛄';
    if (name.includes('trivia')) return '🎭';
    if (name.includes('talent')) return '🎪';
    return '🏆';
  };

  return (
    <Link to={`/events/${event.eventId}`} className={`block ${className}`}>
      <Card onClick={() => {}} className="transition-all">
        <CardBody>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{getEventIcon()}</span>
                <h4 className="font-display font-semibold text-lg">
                  {event.name}
                </h4>
              </div>
              
              <div className="space-y-1 text-sm text-winter-gray">
                <div className="flex items-center space-x-2">
                  <span>🕐</span>
                  <span>
                    {showDay && event.scheduledDay && `Day ${event.scheduledDay} • `}
                    {formatTime(event.scheduledTime)}
                  </span>
                </div>
                
                {event.location && (
                  <div className="flex items-center space-x-2">
                    <span>📍</span>
                    <span>{event.location}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span className="capitalize">
                    {event.scoringType === 'judged' 
                      ? `Judged (${event.judgedCategories?.length || 0} categories)`
                      : 'Placement'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="ml-4">
              <StatusBadge status={event.status} />
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
};

