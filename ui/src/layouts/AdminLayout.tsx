import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>('olympics');

  // Sync activeTab with URL on mount and location changes
  useEffect(() => {
    const path = location.pathname.split('/admin/')[1] || '';
    const tabFromUrl = path.split('/')[0] as AdminTab;
    
    if (tabFromUrl && ['olympics', 'teams', 'events', 'scores'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      // Default to olympics if no valid tab in URL
      setActiveTab('olympics');
    }
  }, [location.pathname]);
  
  const handleExit = () => {
    navigate('/');
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'olympics', label: 'Olympics' },
    { id: 'teams', label: 'Teams' },
    { id: 'events', label: 'Events' },
    { id: 'scores', label: 'Scores' },
  ];

  const handleTabClick = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate(`/admin/${tab}`);
  };
  
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
          <div className="container mx-auto px-4 py-0">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer
                    border-b-2
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

