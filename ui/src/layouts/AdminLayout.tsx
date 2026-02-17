import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export type AdminTab = 'olympics' | 'teams' | 'events' | 'scores' | 'media';

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
    
    if (tabFromUrl && ['olympics', 'teams', 'events', 'scores', 'media'].includes(tabFromUrl)) {
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
    { id: 'media', label: 'Media' },
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
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex justify-between items-center gap-2">
            <h1 className="text-lg sm:text-xl font-display font-bold truncate">
              Admin Dashboard
            </h1>
            <Button variant="ghost" onClick={handleExit} className="text-white hover:bg-white/10 shrink-0">
              Exit
            </Button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="bg-white border-b border-winter-gray/20 sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-2 sm:px-4 py-0">
            <div className="flex overflow-x-auto -mx-2 sm:mx-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    px-3 sm:px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer
                    border-b-2 flex-1 sm:flex-none min-w-0
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
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          {children}
        </main>
      </div>
    </AdminLayoutContext.Provider>
  );
};

