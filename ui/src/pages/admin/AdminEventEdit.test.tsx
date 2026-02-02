import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminEventEdit } from './AdminEventEdit';
import { apiClient } from '../../lib/api';
import type { Event } from '../../lib/api';

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ eventId: 'event-123' }),
}));

// Mock the AdminContext
const mockRefreshEvents = jest.fn();
jest.mock('../../contexts/AdminContext', () => ({
  useAdmin: () => ({
    currentYear: 2025,
    refreshEvents: mockRefreshEvents,
  }),
}));

// Mock the API client
jest.mock('../../lib/api', () => ({
  apiClient: {
    getEvent: jest.fn(),
    updateEvent: jest.fn(),
  },
}));

// Mock useMutation hook
jest.mock('../../hooks/useApi', () => ({
  useMutation: (fn: Function) => ({
    mutate: fn,
    loading: false,
    error: null,
  }),
}));

const RouterWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('AdminEventEdit', () => {
  const mockEvent: Event = {
    year: 2025,
    eventId: 'event-123',
    name: 'Snowball Toss',
    sponsor: 'Acme Co.',
    details: 'A fun snowball tossing competition',
    location: 'Backyard',
    rulesUrl: 'https://example.com/rules',
    scoringType: 'placement',
    completed: false,
    scheduledDay: 1,
    scheduledTime: '14:30',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.getEvent as jest.Mock).mockResolvedValue(mockEvent);
    (apiClient.updateEvent as jest.Mock).mockResolvedValue({ ...mockEvent, name: 'Updated Event' });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Make getEvent hang to keep loading state
      (apiClient.getEvent as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      expect(screen.getByText('Loading event...')).toBeInTheDocument();
    });
  });

  describe('Successful Event Load', () => {
    it('should display the event edit form after loading', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Event')).toBeInTheDocument();
      });

      expect(screen.getByText('Editing: Snowball Toss')).toBeInTheDocument();
    });

    it('should populate form fields with event data', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Snowball Toss')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Acme Co.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Backyard')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com/rules')).toBeInTheDocument();
    });

    it('should display back button', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('← Back to Events')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should show error when event is not found', async () => {
      (apiClient.getEvent as jest.Mock).mockResolvedValue(null);

      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Event not found')).toBeInTheDocument();
      });
    });

    it('should show error when API call fails', async () => {
      (apiClient.getEvent as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load event')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to events list when back button is clicked', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('← Back to Events')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('← Back to Events'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/events');
    });

    it('should navigate back when cancel button is clicked', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/events');
    });
  });

  describe('Form Interaction', () => {
    it('should update form field when user types', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Snowball Toss')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Snowball Toss');
      fireEvent.change(nameInput, { target: { value: 'Ice Skating Race' } });

      expect(screen.getByDisplayValue('Ice Skating Race')).toBeInTheDocument();
    });

    it('should call updateEvent when form is submitted', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(apiClient.updateEvent).toHaveBeenCalledWith(
          2025,
          'event-123',
          expect.objectContaining({
            name: 'Snowball Toss',
            scoringType: 'placement',
          })
        );
      });
    });

    it('should navigate to events list after successful save', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/events');
      });
    });

    it('should refresh events after successful save', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockRefreshEvents).toHaveBeenCalled();
      });
    });
  });

  describe('Judged Event Categories', () => {
    const judgedEvent: Event = {
      ...mockEvent,
      scoringType: 'judged',
      judgedCategories: ['Creativity', 'Execution'],
    };

    beforeEach(() => {
      (apiClient.getEvent as jest.Mock).mockResolvedValue(judgedEvent);
    });

    it('should display category inputs for judged events', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Creativity')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Execution')).toBeInTheDocument();
    });

    it('should display add category button', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('+ Add Category')).toBeInTheDocument();
      });
    });

    it('should add new category field when add button is clicked', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('+ Add Category')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Add Category'));

      // Should have 3 category inputs now
      const categoryInputs = screen.getAllByPlaceholderText(/Category \d/);
      expect(categoryInputs.length).toBe(3);
    });

    it('should display remove buttons when there are multiple categories', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Remove').length).toBe(2);
      });
    });

    it('should remove category when remove button is clicked', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Creativity')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByText('Remove');
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Creativity')).not.toBeInTheDocument();
      });
      expect(screen.getByDisplayValue('Execution')).toBeInTheDocument();
    });
  });

  describe('Completed Checkbox', () => {
    it('should display completed checkbox', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Event Completed')).toBeInTheDocument();
      });
    });

    it('should toggle completed when checkbox is clicked', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Event Completed')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('Event Completed') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Scoring Type Selection', () => {
    it('should display scoring type select', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Scoring Type')).toBeInTheDocument();
      });
    });

    it('should show category fields when scoring type is changed to judged', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Placement (Timed/Scored)')).toBeInTheDocument();
      });

      const scoringSelect = screen.getByDisplayValue('Placement (Timed/Scored)');
      fireEvent.change(scoringSelect, { target: { value: 'judged' } });

      await waitFor(() => {
        expect(screen.getByText('Judging Categories')).toBeInTheDocument();
      });
    });

    it('should hide category fields when scoring type is not judged', async () => {
      const judgedEvent: Event = {
        ...mockEvent,
        scoringType: 'judged',
        judgedCategories: ['Creativity'],
      };
      (apiClient.getEvent as jest.Mock).mockResolvedValue(judgedEvent);

      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Judging Categories')).toBeInTheDocument();
      });

      const scoringSelect = screen.getByDisplayValue('Judged (Categories)');
      fireEvent.change(scoringSelect, { target: { value: 'placement' } });

      await waitFor(() => {
        expect(screen.queryByText('Judging Categories')).not.toBeInTheDocument();
      });
    });
  });

  describe('Day and Time Selection', () => {
    it('should display day select with correct value', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Day')).toBeInTheDocument();
      });

      // Day 1 is selected, find the select by displayed option text
      const daySelect = screen.getByDisplayValue('Day 1');
      expect(daySelect).toHaveValue('1');
    });

    it('should display time input with correct value', async () => {
      render(
        <RouterWrapper>
          <AdminEventEdit />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Time')).toBeInTheDocument();
      });

      // Find time input by type
      const timeInput = document.querySelector('input[type="time"]');
      expect(timeInput).toHaveValue('14:30');
    });
  });
});

// Note: Testing "no year configured" state would require restructuring mocks
// The main AdminEventEdit tests cover the core functionality
