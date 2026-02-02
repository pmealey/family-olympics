/**
 * Event Edit Page - Dedicated subpage for editing events
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Button, Input, Select } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import type { Event } from '../../lib/api';
import { useMutation } from '../../hooks/useApi';

type ScoringType = 'placement' | 'judged' | 'none';

export const AdminEventEdit: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentYear, refreshEvents } = useAdmin();
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sponsor: '',
    details: '',
    location: '',
    rulesUrl: '',
    scoringType: 'placement' as ScoringType,
    judgedCategories: [''],
    scheduledDay: 1,
    scheduledTime: '',
    completed: false,
  });

  const { mutate: updateEvent, loading: updateLoading } = useMutation(
    (year: number, eventId: string, data: any) =>
      apiClient.updateEvent(year, eventId, data)
  );

  // Fetch the event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!currentYear || !eventId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await apiClient.getEvent(currentYear, eventId);
        if (result.success && result.data) {
          setEvent(result.data);
          setFormData({
            name: result.data.name || '',
            sponsor: result.data.sponsor || '',
            details: result.data.details || '',
            location: result.data.location || '',
            rulesUrl: result.data.rulesUrl || '',
            scoringType: result.data.scoringType,
            judgedCategories: result.data.judgedCategories?.length ? result.data.judgedCategories : [''],
            scheduledDay: result.data.scheduledDay || 0,
            scheduledTime: result.data.scheduledTime || '',
            completed: result.data.completed || false,
          });
        } else {
          setError(result.error?.message || 'Event not found');
        }
      } catch (err) {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [currentYear, eventId]);

  const handleSubmit = async () => {
    if (!currentYear || !eventId) return;

    const trimOrNull = (value: string) => (value.trim() ? value.trim() : null);

    if (!formData.name.trim()) {
      alert('Please provide an event name');
      return;
    }

    const categories =
      formData.scoringType === 'judged'
        ? formData.judgedCategories.map((c) => c.trim()).filter(Boolean)
        : [];

    const data: any = {
      scoringType: formData.scoringType,
      name: formData.name.trim(),
      sponsor: trimOrNull(formData.sponsor),
      details: trimOrNull(formData.details),
      location: trimOrNull(formData.location),
      rulesUrl: trimOrNull(formData.rulesUrl),
      completed: formData.completed,
      scheduledDay:
        formData.scheduledDay === 1 || formData.scheduledDay === 2
          ? formData.scheduledDay
          : null,
      scheduledTime: trimOrNull(formData.scheduledTime),
      judgedCategories:
        formData.scoringType === 'judged' ? (categories.length > 0 ? categories : null) : null,
    };

    const result = await updateEvent(currentYear, eventId, data);
    if (result) {
      await refreshEvents();
      navigate('/admin/events');
    }
  };

  const addCategoryField = () => {
    setFormData({
      ...formData,
      judgedCategories: [...formData.judgedCategories, ''],
    });
  };

  const updateCategory = (index: number, value: string) => {
    const newCategories = [...formData.judgedCategories];
    newCategories[index] = value;
    setFormData({
      ...formData,
      judgedCategories: newCategories,
    });
  };

  const removeCategory = (index: number) => {
    if (formData.judgedCategories.length > 1) {
      const newCategories = formData.judgedCategories.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        judgedCategories: newCategories,
      });
    }
  };

  if (!currentYear) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-winter-gray py-8">
            Please configure an Olympics year first
          </p>
        </CardBody>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-winter-gray py-8">Loading event...</p>
        </CardBody>
      </Card>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => navigate('/admin/events')}>
          ← Back to Events
        </Button>
        <Card>
          <CardBody>
            <p className="text-center text-red-600 py-8">{error || 'Event not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <Button variant="secondary" size="sm" onClick={() => navigate('/admin/events')}>
          ← Back
        </Button>
        <h2 className="text-xl sm:text-2xl font-display font-bold">Edit Event</h2>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-display font-semibold">
            Editing: {event.name || 'Untitled Event'}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <Input
              label="Event Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Snowball Toss"
            />

            <Input
              label="Sponsor"
              value={formData.sponsor}
              onChange={(e) => setFormData({ ...formData, sponsor: e.target.value })}
              placeholder="Acme Co."
            />

            <div>
              <label className="block text-sm font-medium text-winter-dark mb-1">
                Details
              </label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="A short description of this event..."
                rows={3}
                className="w-full px-3 py-2 border border-winter-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-winter-accent focus:border-transparent resize-y"
              />
            </div>

            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Backyard"
            />

            <Input
              label="Rules URL (Google Doc)"
              value={formData.rulesUrl}
              onChange={(e) => setFormData({ ...formData, rulesUrl: e.target.value })}
              placeholder="https://docs.google.com/document/d/..."
            />

            <Select
              label="Scoring Type"
              value={formData.scoringType}
              onChange={(e) => setFormData({ ...formData, scoringType: e.target.value as ScoringType })}
              options={[
                { value: 'placement', label: 'Placement (Timed/Scored)' },
                { value: 'judged', label: 'Judged (Categories)' },
                { value: 'none', label: 'None (Non-Scoring Event)' },
              ]}
            />

            {formData.scoringType === 'judged' && (
              <div>
                <label className="block text-sm font-medium text-winter-dark mb-2">
                  Judging Categories
                </label>
                <div className="space-y-2">
                  {formData.judgedCategories.map((category, index) => (
                    <div key={index} className="flex flex-col xs:flex-row gap-2">
                      <Input
                        value={category}
                        onChange={(e) => updateCategory(index, e.target.value)}
                        placeholder={`Category ${index + 1} (e.g., Creativity)`}
                        className="flex-1"
                      />
                      {formData.judgedCategories.length > 1 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeCategory(index)}
                          className="self-end xs:self-auto shrink-0"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addCategoryField}>
                    + Add Category
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
              <Select
                label="Day"
                value={formData.scheduledDay.toString()}
                onChange={(e) => setFormData({ ...formData, scheduledDay: parseInt(e.target.value) })}
                options={[
                  { value: '0', label: 'Unscheduled' },
                  { value: '1', label: 'Day 1' },
                  { value: '2', label: 'Day 2' },
                ]}
              />

              <Input
                label="Time"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="completed"
                checked={formData.completed}
                onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                className="w-5 h-5 rounded border-winter-gray/30 text-winter-accent focus:ring-winter-accent"
              />
              <label htmlFor="completed" className="text-sm font-medium text-winter-dark">
                Event Completed
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={updateLoading}
                className="flex-1 xs:flex-none"
              >
                {updateLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/admin/events')}
                disabled={updateLoading}
                className="flex-1 xs:flex-none"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
