import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { EventCard } from './EventCard';
import type { Event } from '../lib/api';

// Wrapper component to provide Router context
const RouterWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('EventCard', () => {
  const baseEvent: Event = {
    year: 2025,
    eventId: 'event-123',
    name: 'Snowball Toss',
    location: 'Backyard',
    rulesUrl: 'https://example.com/rules',
    scoringType: 'placement',
    status: 'upcoming',
    scheduledDay: 1,
  };

  describe('Time Formatting', () => {
    it('should not display a time row when scheduledTime is not provided', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} />
        </RouterWrapper>
      );

      expect(screen.queryByText('🕐')).not.toBeInTheDocument();
    });

    it('should format time-only string (HH:MM) correctly', () => {
      const event = {
        ...baseEvent,
        scheduledTime: '14:30',
      };

      render(
        <RouterWrapper>
          <EventCard event={event} />
        </RouterWrapper>
      );

      // Should display formatted time like "2:30 PM"
      expect(screen.getByText(/2:30 PM/i)).toBeInTheDocument();
    });

    it('should format time-only string with seconds (HH:MM:SS) correctly', () => {
      const event = {
        ...baseEvent,
        scheduledTime: '09:15:00',
      };

      render(
        <RouterWrapper>
          <EventCard event={event} />
        </RouterWrapper>
      );

      // Should display formatted time like "9:15 AM"
      expect(screen.getByText(/9:15 AM/i)).toBeInTheDocument();
    });

    it('should format midnight time correctly', () => {
      const event = {
        ...baseEvent,
        scheduledTime: '00:00',
      };

      render(
        <RouterWrapper>
          <EventCard event={event} />
        </RouterWrapper>
      );

      // Should display formatted time like "12:00 AM"
      expect(screen.getByText(/12:00 AM/i)).toBeInTheDocument();
    });

    it('should handle invalid date strings gracefully', () => {
      const event = {
        ...baseEvent,
        scheduledTime: 'invalid-date',
      };

      render(
        <RouterWrapper>
          <EventCard event={event} />
        </RouterWrapper>
      );

      // Should fall back to displaying the original string
      expect(screen.getByText('invalid-date')).toBeInTheDocument();
    });

    it('should not display "Invalid Date" for any valid time format', () => {
      const timeFormats = [
        '14:30',
        '09:15:00',
        '00:00',
        '23:59',
      ];

      timeFormats.forEach((scheduledTime) => {
        const { container } = render(
          <RouterWrapper>
            <EventCard event={{ ...baseEvent, scheduledTime }} />
          </RouterWrapper>
        );

        expect(container.textContent).not.toContain('Invalid Date');
      });
    });
  });

  describe('Event Display', () => {
    it('should display event name', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} />
        </RouterWrapper>
      );

      expect(screen.getByText('Snowball Toss')).toBeInTheDocument();
    });

    it('should display event location', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} />
        </RouterWrapper>
      );

      expect(screen.getByText('Backyard')).toBeInTheDocument();
    });

    it('should display day when showDay is true', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} showDay={true} />
        </RouterWrapper>
      );

      expect(screen.getByText(/Day 1/)).toBeInTheDocument();
    });

    it('should not display day when showDay is false', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} showDay={false} />
        </RouterWrapper>
      );

      expect(screen.queryByText(/Day 1/)).not.toBeInTheDocument();
    });

    it('should display status badge', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} />
        </RouterWrapper>
      );

      // StatusBadge component should be rendered (exact text depends on implementation)
      expect(screen.getByText(/upcoming/i)).toBeInTheDocument();
    });

    it('should display sponsor when provided', () => {
      render(
        <RouterWrapper>
          <EventCard event={{ ...baseEvent, sponsor: 'Acme Co.' }} />
        </RouterWrapper>
      );

      expect(screen.getByText(/Sponsored by Acme Co\./)).toBeInTheDocument();
    });

    it('should not display sponsor row when missing', () => {
      render(
        <RouterWrapper>
          <EventCard event={{ ...baseEvent, sponsor: null }} />
        </RouterWrapper>
      );

      expect(screen.queryByText(/Sponsored by/i)).not.toBeInTheDocument();
    });
  });

  describe('Scoring Type Display', () => {
    it('should display "Placement" for placement events', () => {
      render(
        <RouterWrapper>
          <EventCard event={baseEvent} />
        </RouterWrapper>
      );

      expect(screen.getByText(/Placement/)).toBeInTheDocument();
    });

    it('should display "Judged" with category count for judged events', () => {
      const judgedEvent: Event = {
        ...baseEvent,
        scoringType: 'judged',
        judgedCategories: ['Creativity', 'Execution', 'Style'],
      };

      render(
        <RouterWrapper>
          <EventCard event={judgedEvent} />
        </RouterWrapper>
      );

      expect(screen.getByText(/Judged \(3 categories\)/)).toBeInTheDocument();
    });

    it('should handle judged events with no categories', () => {
      const judgedEvent: Event = {
        ...baseEvent,
        scoringType: 'judged',
        judgedCategories: [],
      };

      render(
        <RouterWrapper>
          <EventCard event={judgedEvent} />
        </RouterWrapper>
      );

      expect(screen.getByText(/^Judged$/)).toBeInTheDocument();
    });
  });

  describe('Link Behavior', () => {
    it('should link to the event detail page', () => {
      const { container } = render(
        <RouterWrapper>
          <EventCard event={baseEvent} />
        </RouterWrapper>
      );

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/events/event-123');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <RouterWrapper>
          <EventCard event={baseEvent} className="custom-class" />
        </RouterWrapper>
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });
  });
});

