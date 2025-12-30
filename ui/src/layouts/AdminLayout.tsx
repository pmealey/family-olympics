import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export type AdminTab = 'olympics' | 'teams' | 'events' | 'scores';

interface AdminLayoutContextType {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export const AdminLayoutContext = React.createContext<AdminLayoutContextType | undefined>(undefined);

export function useAdminLayout() {
  const context = React.useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within AdminLayout');
  }
  return context;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('olympics');
  
  const handleExit = () => {
    navigate('/');
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'olympics', label: 'Olympics' },
    { id: 'teams', label: 'Teams' },
    { id: 'events', label: 'Events' },
    { id: 'scores', label: 'Scores' },
  ];
  
  return (
    <AdminLayoutContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="min-h-screen bg-ice-blue">
        {/* Header */}
        <header className="bg-winter-dark text-white shadow-lg">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-display font-bold">
              Admin Dashboard
            </h1>
            <Button variant="ghost" onClick={handleExit} className="text-white hover:bg-white/10">
              Exit
            </Button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="bg-white border-b border-winter-gray/20 sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors
                    border-b-2 -mb-px
                    ${
                      activeTab === tab.id
                        ? 'border-winter-blue text-winter-blue'
                        : 'border-transparent text-winter-gray hover:text-winter-dark'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </AdminLayoutContext.Provider>
  );
};

