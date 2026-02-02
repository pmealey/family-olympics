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
    if (!timeString) return '';
    
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

  const hasDay = showDay && (event.scheduledDay === 1 || event.scheduledDay === 2);
  const hasTime = Boolean(event.scheduledTime);
  const hasDateRow = hasDay || hasTime;

  return (
    <Link to={`/events/${event.eventId}`} className={`block ${className}`}>
      <Card onClick={() => {}} className="transition-all">
        <CardBody>
          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              <h4 className="font-display font-semibold text-base sm:text-lg flex-1 min-w-0 break-words">
                {event.name || 'Untitled Event'}
              </h4>
              <StatusBadge completed={event.completed} />
            </div>
            
            <div className="space-y-1 text-sm text-winter-gray">
              {event.sponsor && (
                <div className="flex items-center gap-2">
                  <span className="shrink-0">🤝</span>
                  <span className="break-words">Sponsored by {event.sponsor}</span>
                </div>
              )}

              {hasDateRow && (
                <div className="flex items-center gap-2">
                  <span className="shrink-0">🕐</span>
                  <span>
                    {hasDay && `Day ${event.scheduledDay}`}
                    {hasDay && hasTime ? ' • ' : ''}
                    {hasTime ? formatTime(event.scheduledTime || undefined) : ''}
                  </span>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center gap-2">
                  <span className="shrink-0">📍</span>
                  <span className="break-words">{event.location}</span>
                </div>
              )}
              
              {event.scoringType && (
                <div className="flex items-center gap-2">
                  <span className="shrink-0">🎯</span>
                  <span className="capitalize">
                    {event.scoringType === 'judged'
                      ? `Judged${event.judgedCategories?.length ? ` (${event.judgedCategories.length} cat.)` : ''}`
                      : event.scoringType === 'none'
                      ? 'Non-Scoring'
                      : 'Placement'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
};

