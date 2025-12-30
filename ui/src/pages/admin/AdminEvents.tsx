/**
 * Event Definition and Schedule Management Tab (Step 2.4 & 2.5)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Select, StatusBadge } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import type { Event } from '../../lib/api';
import { useMutation } from '../../hooks/useApi';

type ScoringType = 'placement' | 'judged';
type EventStatus = 'upcoming' | 'in-progress' | 'completed';

export const AdminEvents: React.FC = () => {
  const { currentYear, events, refreshEvents } = useAdmin();
  
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    rulesUrl: '',
    scoringType: 'placement' as ScoringType,
    judgedCategories: [''],
    scheduledDay: 1,
    scheduledTime: '',
    status: 'upcoming' as EventStatus,
  });

  useEffect(() => {
    if (currentYear) {
      refreshEvents();
    }
  }, [currentYear]);

  const { mutate: createEvent, loading: createLoading } = useMutation(
    (year: number, data: any) => apiClient.createEvent(year, data)
  );

  const { mutate: updateEvent, loading: updateLoading } = useMutation(
    (year: number, eventId: string, data: any) =>
      apiClient.updateEvent(year, eventId, data)
  );

  const { mutate: deleteEvent, loading: deleteLoading } = useMutation(
    (year: number, eventId: string) =>
      apiClient.deleteEvent(year, eventId)
  );

  const handleSubmit = async () => {
    if (!currentYear) return;
    
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('Please provide event name and location');
      return;
    }

    const data: any = {
      name: formData.name,
      location: formData.location,
      rulesUrl: formData.rulesUrl,
      scoringType: formData.scoringType,
      scheduledDay: formData.scheduledDay,
      scheduledTime: formData.scheduledTime || undefined,
      status: formData.status,
    };

    if (formData.scoringType === 'judged') {
      const categories = formData.judgedCategories.filter(c => c.trim());
      if (categories.length === 0) {
        alert('Please provide at least one judging category');
        return;
      }
      data.judgedCategories = categories;
    }

    if (editingEvent) {
      const result = await updateEvent(currentYear, editingEvent.eventId, data);
      if (result) {
        setShowForm(false);
        setEditingEvent(null);
        resetForm();
        await refreshEvents();
      }
    } else {
      const result = await createEvent(currentYear, data);
      if (result) {
        setShowForm(false);
        resetForm();
        await refreshEvents();
      }
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!currentYear) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
      const result = await deleteEvent(currentYear, eventId);
      if (result) {
        await refreshEvents();
      }
    }
  };

  const handleStatusChange = async (event: Event, newStatus: EventStatus) => {
    if (!currentYear) return;
    
    await updateEvent(currentYear, event.eventId, { status: newStatus });
    await refreshEvents();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      rulesUrl: '',
      scoringType: 'placement',
      judgedCategories: [''],
      scheduledDay: 1,
      scheduledTime: '',
      status: 'upcoming',
    });
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      location: event.location,
      rulesUrl: event.rulesUrl,
      scoringType: event.scoringType,
      judgedCategories: event.judgedCategories?.length ? event.judgedCategories : [''],
      scheduledDay: event.scheduledDay || 1,
      scheduledTime: event.scheduledTime || '',
      status: event.status,
    });
    setShowForm(true);
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

  // Group events by day
  const eventsByDay = events.reduce((acc, event) => {
    const day = event.scheduledDay || 0;
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {} as Record<number, Event[]>);

  // Sort events within each day by scheduledTime
  Object.keys(eventsByDay).forEach(day => {
    eventsByDay[Number(day)].sort((a, b) => {
      // Events without time go to the end
      if (!a.scheduledTime && !b.scheduledTime) return 0;
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  });

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Events & Schedule</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Event'}
        </Button>
      </div>

      {/* Event Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">
              {editingEvent ? 'Edit Event' : 'Create New Event'}
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
                ]}
              />

              {formData.scoringType === 'judged' && (
                <div>
                  <label className="block text-sm font-medium text-winter-dark mb-2">
                    Judging Categories
                  </label>
                  <div className="space-y-2">
                    {formData.judgedCategories.map((category, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={category}
                          onChange={(e) => updateCategory(index, e.target.value)}
                          placeholder={`Category ${index + 1} (e.g., Creativity)`}
                        />
                        {formData.judgedCategories.length > 1 && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeCategory(index)}
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

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Day"
                  value={formData.scheduledDay.toString()}
                  onChange={(e) => setFormData({ ...formData, scheduledDay: parseInt(e.target.value) })}
                  options={[
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

              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                options={[
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={createLoading || updateLoading}
                >
                  {createLoading || updateLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEvent(null);
                    resetForm();
                  }}
                  disabled={createLoading || updateLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Events List by Day */}
      <div className="space-y-6">
        {events.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">📅</span>
                <h3 className="text-xl font-display font-semibold mb-2">
                  No Events Yet
                </h3>
                <p className="text-winter-gray mb-4">
                  Create your first event to get started.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  Create First Event
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          [1, 2, 0].map((day) => {
            const dayEvents = eventsByDay[day];
            if (!dayEvents || dayEvents.length === 0) return null;

            return (
              <div key={day}>
                <h3 className="text-xl font-display font-bold mb-4">
                  {day === 0 ? 'Unscheduled' : `Day ${day}`}
                </h3>
                <div className="space-y-3">
                  {dayEvents.map((event) => (
                    <Card key={event.eventId}>
                      <CardBody>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-display font-bold">{event.name}</h4>
                              <StatusBadge status={event.status} />
                            </div>
                            
                            <div className="text-winter-gray text-sm space-y-1">
                              <div>📍 {event.location}</div>
                              {event.scheduledTime && (
                                <div>🕒 {new Date(`2000-01-01T${event.scheduledTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              )}
                              <div>
                                {event.scoringType === 'placement' ? '📊 Placement' : '⚖️ Judged'}
                                {event.judgedCategories && ` (${event.judgedCategories.length} categories)`}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(event)}
                            >
                              Edit
                            </Button>
                            
                            {event.status !== 'in-progress' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStatusChange(event, 'in-progress')}
                              >
                                Start
                              </Button>
                            )}
                            
                            {event.status !== 'completed' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStatusChange(event, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(event.eventId)}
                              disabled={deleteLoading}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

