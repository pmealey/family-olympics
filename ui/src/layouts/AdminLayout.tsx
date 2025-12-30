import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  
  const handleExit = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-ice-blue">
      {/* Header */}
      <header className="bg-winter-dark text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-display font-bold">
            Admin Dashboard
          </h1>
          <Button variant="ghost" onClick={handleExit} className="text-white">
            Exit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

