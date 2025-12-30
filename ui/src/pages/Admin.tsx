import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminProvider } from '../contexts/AdminContext';
import { AdminOlympics } from './admin/AdminOlympics';
import { AdminTeams } from './admin/AdminTeams';
import { AdminEvents } from './admin/AdminEvents';
import { AdminScores } from './admin/AdminScores';

export const Admin: React.FC = () => {
  return (
    <AdminProvider>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/olympics" replace />} />
          <Route path="/olympics" element={<AdminOlympics />} />
          <Route path="/teams" element={<AdminTeams />} />
          <Route path="/events" element={<AdminEvents />} />
          <Route path="/scores" element={<AdminScores />} />
        </Routes>
      </AdminLayout>
    </AdminProvider>
  );
};

