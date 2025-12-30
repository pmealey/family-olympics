import React from 'react';
import { AdminLayout, useAdminLayout } from '../layouts/AdminLayout';
import { AdminProvider } from '../contexts/AdminContext';
import { AdminOlympics } from './admin/AdminOlympics';
import { AdminTeams } from './admin/AdminTeams';
import { AdminEvents } from './admin/AdminEvents';
import { AdminScores } from './admin/AdminScores';

const AdminContent: React.FC = () => {
  const { activeTab } = useAdminLayout();

  return (
    <>
      {activeTab === 'olympics' && <AdminOlympics />}
      {activeTab === 'teams' && <AdminTeams />}
      {activeTab === 'events' && <AdminEvents />}
      {activeTab === 'scores' && <AdminScores />}
    </>
  );
};

export const Admin: React.FC = () => {
  return (
    <AdminProvider>
      <AdminLayout>
        <AdminContent />
      </AdminLayout>
    </AdminProvider>
  );
};

