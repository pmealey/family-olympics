/**
 * Olympics Configuration Tab (Step 2.2)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Loading, PasswordEyeIcon } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import { useMutation } from '../../hooks/useApi';

export const AdminOlympics: React.FC = () => {
  const { currentYear, currentOlympics, olympicsYears, olympicsLoading, refreshOlympics, setCurrentYear, setCurrentOlympics } = useAdmin();
  
  const [editMode, setEditMode] = useState(false);
  const [placementPoints, setPlacementPoints] = useState<Record<string, number>>({
    '1': 4,
    '2': 3,
    '3': 2,
    '4': 1,
  });

  // New year form
  const [showNewYearForm, setShowNewYearForm] = useState(false);
  const [newYear, setNewYear] = useState('');

  // Gallery password
  const [galleryPassword, setGalleryPassword] = useState('');
  const [showGalleryPassword, setShowGalleryPassword] = useState(false);
  const [galleryPasswordLoading, setGalleryPasswordLoading] = useState(false);
  const [galleryPasswordError, setGalleryPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOlympics) {
      setPlacementPoints(currentOlympics.placementPoints);
    }
  }, [currentOlympics]);

  useEffect(() => {
    // Load all Olympics years when component mounts
    refreshOlympics();
  }, []);

  const { mutate: updateOlympics, loading: updateLoading, error: updateError } = useMutation(
    (year: number, data: { placementPoints?: Record<string, number>; currentYear?: boolean; galleryPassword?: string }) =>
      apiClient.updateOlympics(year, data)
  );

  const { mutate: createOlympics, loading: createLoading, error: createError } = useMutation(
    (year: number, points: Record<string, number>) =>
      apiClient.createOlympics({ year, placementPoints: points })
  );

  const { mutate: deleteOlympics, loading: deleteLoading } = useMutation(
    (year: number) => apiClient.deleteOlympics(year)
  );

  const handleSavePoints = async () => {
    if (!currentYear) return;
    
    const result = await updateOlympics(currentYear, { placementPoints });
    if (result) {
      setEditMode(false);
      setCurrentOlympics(result);
      await refreshOlympics();
    }
  };

  const handleCreateYear = async () => {
    const year = parseInt(newYear);
    if (isNaN(year) || year < 2000 || year > 2100) {
      alert('Please enter a valid year between 2000 and 2100');
      return;
    }

    const result = await createOlympics(year, placementPoints);
    if (result) {
      setShowNewYearForm(false);
      setNewYear('');
      setCurrentYear(year);
      setCurrentOlympics(result);
      await refreshOlympics();
    }
  };


  if (olympicsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-display font-bold">Olympics Configuration</h2>
        </div>
        <Loading message="Loading Olympics configuration..." />
      </div>
    );
  }

  if (!currentOlympics && !showNewYearForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-display font-bold">Olympics Configuration</h2>
        </div>

        <Card>
          <CardBody>
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">⚙️</span>
              <h3 className="text-xl font-display font-semibold mb-2">
                No Olympics Year Configured
              </h3>
              <p className="text-winter-gray mb-6">
                Create your first Olympics year to get started.
              </p>
              <Button onClick={() => setShowNewYearForm(true)}>
                Create New Year
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleDeleteYear = async (year: number) => {
    if (confirm(`Are you sure you want to delete Olympics year ${year}? This action cannot be undone.`)) {
      const result = await deleteOlympics(year);
      if (result) {
        // If we deleted the currently viewing year, reload to reset state
        if (year === currentYear) {
          window.location.reload();
        } else {
          await refreshOlympics();
        }
      }
    }
  };

  const handleSwitchYear = async (year: number) => {
    const response = await apiClient.getOlympics(year);
    if (response.success && response.data) {
      setCurrentYear(year);
      setCurrentOlympics(response.data);
      setPlacementPoints(response.data.placementPoints || {
        '1': 4,
        '2': 3,
        '3': 2,
        '4': 1,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Olympics Configuration</h2>
        {!showNewYearForm && (
          <Button variant="secondary" onClick={() => setShowNewYearForm(true)} size="sm" className="sm:text-base">
            + New Year
          </Button>
        )}
      </div>

      {/* Create New Year Form */}
      {showNewYearForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">Create New Year</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Input
                label="Year"
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="2025"
                helpText="Enter the year for this Olympics (e.g., 2025, 2027)"
              />
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreateYear} disabled={createLoading} className="flex-1 xs:flex-none">
                  {createLoading ? 'Creating...' : 'Create Year'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowNewYearForm(false);
                    setNewYear('');
                  }}
                  disabled={createLoading}
                  className="flex-1 xs:flex-none"
                >
                  Cancel
                </Button>
              </div>
              
              {createError && (
                <p className="text-red-600 text-sm">{createError}</p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* All Years Management */}
      {olympicsYears.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">Manage Years</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {olympicsYears.map((year) => (
                <div
                  key={year.year}
                  className={`p-3 sm:p-4 border rounded-lg space-y-3 ${
                    year.year === currentYear
                      ? 'border-winter-blue bg-winter-blue/5'
                      : 'border-winter-gray/20'
                  }`}
                >
                  {/* Year info */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl sm:text-2xl font-display font-bold">
                      {year.year}
                    </span>
                    {year.currentYear && (
                      <span className="px-2 py-0.5 bg-winter-blue/10 text-winter-blue rounded-full text-xs sm:text-sm font-medium">
                        Active
                      </span>
                    )}
                    {year.year === currentYear && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium">
                        Viewing
                      </span>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {year.year !== currentYear && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSwitchYear(year.year)}
                      >
                        Switch
                      </Button>
                    )}
                    {!year.currentYear && year.year === currentYear && currentOlympics && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          await updateOlympics(year.year, {
                            currentYear: true
                          });
                          await refreshOlympics();
                        }}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteYear(year.year)}
                      disabled={deleteLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-winter-gray mt-4">
              The active year is shown on the public interface and is loaded by default.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Placement Points Configuration */}
      {currentOlympics && placementPoints && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-display font-semibold">Placement Points</h3>
              {!editMode && (
                <Button variant="secondary" onClick={() => setEditMode(true)} size="sm">
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 sm:gap-4">
                {['1', '2', '3', '4'].map((place) => (
                  <div key={place}>
                    <label className="block text-xs sm:text-sm font-medium text-winter-gray mb-1 sm:mb-2">
                      {place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : '4th'} Place
                    </label>
                    <Input
                      type="number"
                      value={placementPoints[place] || 0}
                      onChange={(e) => {
                        if (editMode) {
                          setPlacementPoints({
                            ...placementPoints,
                            [place]: parseInt(e.target.value) || 0,
                          });
                        }
                      }}
                      disabled={!editMode}
                      className="text-center font-bold"
                    />
                  </div>
                ))}
              </div>

              {editMode && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button onClick={handleSavePoints} disabled={updateLoading} className="flex-1 xs:flex-none">
                    {updateLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditMode(false);
                      if (currentOlympics) {
                        setPlacementPoints(currentOlympics.placementPoints);
                      }
                    }}
                    disabled={updateLoading}
                    className="flex-1 xs:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {updateError && (
                <p className="text-red-600 text-sm">{updateError}</p>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Gallery password */}
      {currentOlympics && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">Gallery Password</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-winter-gray mb-3">
              Protect the gallery page with a shared password. Only people with the password can view or upload photos and videos.
            </p>
            <p className="text-sm font-medium mb-2">
              Current: {currentOlympics.hasGalleryPassword ? 'Password set' : 'No password (gallery is open)'}
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-winter-dark mb-1">
                  New password
                </label>
                <div className="relative w-full">
                  <Input
                    type={showGalleryPassword ? 'text' : 'password'}
                    placeholder={currentOlympics.hasGalleryPassword ? 'Leave blank to keep current' : 'Set a password'}
                    value={galleryPassword}
                    onChange={(e) => {
                      setGalleryPassword(e.target.value);
                      setGalleryPasswordError(null);
                    }}
                    disabled={galleryPasswordLoading}
                    autoComplete="new-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGalleryPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded text-winter-gray hover:text-winter-dark hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
                    aria-label={showGalleryPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    <PasswordEyeIcon show={!showGalleryPassword} />
                  </button>
                </div>
              </div>
              <Button
                onClick={async () => {
                  if (!currentYear) return;
                  setGalleryPasswordLoading(true);
                  setGalleryPasswordError(null);
                  const result = await updateOlympics(currentYear, { galleryPassword });
                  setGalleryPasswordLoading(false);
                  if (result) {
                    setCurrentOlympics(result);
                    setGalleryPassword('');
                    await refreshOlympics();
                  } else {
                    setGalleryPasswordError(updateError ?? 'Failed to update');
                  }
                }}
                disabled={galleryPasswordLoading}
              >
                {galleryPasswordLoading ? 'Saving...' : 'Set password'}
              </Button>
              {currentOlympics.hasGalleryPassword && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (!currentYear || !confirm('Remove the gallery password? Anyone with the link will be able to view the gallery.')) return;
                    setGalleryPasswordLoading(true);
                    setGalleryPasswordError(null);
                    const result = await updateOlympics(currentYear, { galleryPassword: '' });
                    setGalleryPasswordLoading(false);
                    if (result) {
                      setCurrentOlympics(result);
                      setGalleryPassword('');
                      await refreshOlympics();
                    } else {
                      setGalleryPasswordError(updateError ?? 'Failed to clear password');
                    }
                  }}
                  disabled={galleryPasswordLoading}
                >
                  Clear password
                </Button>
              )}
            </div>
            {galleryPasswordError && (
              <p className="text-red-600 text-sm mt-2">{galleryPasswordError}</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

