import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminProvider } from '../contexts/AdminContext';
import { AdminOlympics } from './admin/AdminOlympics';
import { AdminTeams } from './admin/AdminTeams';
import { AdminEvents } from './admin/AdminEvents';
import { AdminEventEdit } from './admin/AdminEventEdit';
import { AdminScores } from './admin/AdminScores';
import { AdminScoreEntry } from './admin/AdminScoreEntry';
import { AdminMedia } from './admin/AdminMedia';

export const Admin: React.FC = () => {
  return (
    <AdminProvider>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/olympics" replace />} />
          <Route path="/olympics" element={<AdminOlympics />} />
          <Route path="/teams" element={<AdminTeams />} />
          <Route path="/events" element={<AdminEvents />} />
          <Route path="/events/:eventId/edit" element={<AdminEventEdit />} />
          <Route path="/scores" element={<AdminScores />} />
          <Route path="/scores/:eventId" element={<AdminScoreEntry />} />
          <Route path="/media" element={<AdminMedia />} />
        </Routes>
      </AdminLayout>
    </AdminProvider>
  );
};

