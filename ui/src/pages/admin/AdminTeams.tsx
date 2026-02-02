/**
 * Team Management Tab (Step 2.3)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Select, TeamColorIndicator, Loading } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import type { Team } from '../../lib/api';
import { useMutation } from '../../hooks/useApi';

type TeamColor = 'green' | 'pink' | 'yellow' | 'orange';

export const AdminTeams: React.FC = () => {
  const { currentYear, teams, teamsLoading, refreshTeams } = useAdmin();
  
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: 'green' as TeamColor,
    members: [''],
  });

  useEffect(() => {
    if (currentYear) {
      refreshTeams();
    }
  }, [currentYear]);

  const { mutate: createTeam, loading: createLoading } = useMutation(
    (year: number, data: { name: string; color: TeamColor; members: string[] }) =>
      apiClient.createTeam(year, data)
  );

  const { mutate: updateTeam, loading: updateLoading } = useMutation(
    (year: number, teamId: string, data: Partial<Team>) =>
      apiClient.updateTeam(year, teamId, data)
  );

  const { mutate: deleteTeam, loading: deleteLoading } = useMutation(
    (year: number, teamId: string) =>
      apiClient.deleteTeam(year, teamId)
  );

  const handleSubmit = async () => {
    if (!currentYear) return;
    
    // Filter out empty members
    const members = formData.members.filter(m => m.trim());
    if (!formData.name.trim() || members.length === 0) {
      alert('Please provide a team name and at least one member');
      return;
    }

    if (editingTeam) {
      const result = await updateTeam(currentYear, editingTeam.teamId, {
        name: formData.name,
        color: formData.color,
        members,
      });
      if (result) {
        setShowForm(false);
        setEditingTeam(null);
        resetForm();
        await refreshTeams();
      }
    } else {
      const result = await createTeam(currentYear, {
        name: formData.name,
        color: formData.color,
        members,
      });
      if (result) {
        setShowForm(false);
        resetForm();
        await refreshTeams();
      }
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!currentYear) return;
    
    if (confirm('Are you sure you want to delete this team?')) {
      const result = await deleteTeam(currentYear, teamId);
      if (result) {
        await refreshTeams();
      }
    }
  };

  const handleAddBonusPoint = async (team: Team) => {
    if (!currentYear) return;
    
    await updateTeam(currentYear, team.teamId, {
      bonusPoints: team.bonusPoints + 1,
    });
    await refreshTeams();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: 'green',
      members: [''],
    });
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      color: team.color,
      members: team.members.length > 0 ? team.members : [''],
    });
    setShowForm(true);
  };

  const addMemberField = () => {
    setFormData({
      ...formData,
      members: [...formData.members, ''],
    });
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = value;
    setFormData({
      ...formData,
      members: newMembers,
    });
  };

  const removeMember = (index: number) => {
    if (formData.members.length > 1) {
      const newMembers = formData.members.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        members: newMembers,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Teams</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="sm:text-base">
          {showForm ? 'Cancel' : '+ Add Team'}
        </Button>
      </div>

      {/* Team Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">
              {editingTeam ? 'Edit Team' : 'Create New Team'}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Input
                label="Team Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pink Flamingos"
              />

              <Select
                label="Team Color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value as TeamColor })}
                options={[
                  { value: 'green', label: 'Green' },
                  { value: 'pink', label: 'Pink' },
                  { value: 'yellow', label: 'Yellow' },
                  { value: 'orange', label: 'Orange' },
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-winter-dark mb-2">
                  Team Members
                </label>
                <div className="space-y-2">
                  {formData.members.map((member, index) => (
                    <div key={index} className="flex flex-col xs:flex-row gap-2">
                      <Input
                        value={member}
                        onChange={(e) => updateMember(index, e.target.value)}
                        placeholder={`Member ${index + 1}`}
                        className="flex-1"
                      />
                      {formData.members.length > 1 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => removeMember(index)}
                          className="self-end xs:self-auto shrink-0"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addMemberField}>
                    + Add Member
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={createLoading || updateLoading}
                  className="flex-1 xs:flex-none"
                >
                  {createLoading || updateLoading ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTeam(null);
                    resetForm();
                  }}
                  disabled={createLoading || updateLoading}
                  className="flex-1 xs:flex-none"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Teams List */}
      <div className="space-y-4">
        {teamsLoading ? (
          <Loading message="Loading teams..." />
        ) : teams.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">👥</span>
                <h3 className="text-xl font-display font-semibold mb-2">
                  No Teams Yet
                </h3>
                <p className="text-winter-gray mb-4">
                  Create your first team to get started.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  Create First Team
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.teamId} teamColor={team.color}>
              <CardBody>
                <div className="space-y-3">
                  {/* Team info */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <TeamColorIndicator color={team.color} />
                      <h3 className="text-lg sm:text-xl font-display font-bold break-words">{team.name}</h3>
                    </div>
                    
                    <div className="text-winter-gray text-sm mb-2 break-words">
                      {team.members.join(', ')}
                    </div>
                    
                    <div className="text-sm text-winter-gray">
                      Bonus Points: <span className="font-bold">{team.bonusPoints}</span>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(team)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddBonusPoint(team)}
                    >
                      +1 Bonus
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(team.teamId)}
                      disabled={deleteLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

