import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="min-h-screen flex flex-col bg-ice-blue">
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-20">
        {children}
      </main>

      {/* Bottom Navigation - compact on very small screens */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-around items-center h-14 sm:h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer px-1 ${
              isActive('/') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-xl sm:text-2xl mb-0.5">🏠</span>
            <span className="text-[10px] sm:text-xs font-medium">Home</span>
          </Link>
          
          <Link
            to="/schedule"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer px-1 ${
              isActive('/schedule') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-xl sm:text-2xl mb-0.5">📅</span>
            <span className="text-[10px] sm:text-xs font-medium">Schedule</span>
          </Link>
          
          <Link
            to="/judge"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer px-1 ${
              isActive('/judge') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-xl sm:text-2xl mb-0.5">⚖️</span>
            <span className="text-[10px] sm:text-xs font-medium">Judge</span>
          </Link>
          
          <Link
            to="/admin"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer px-1 ${
              isActive('/admin') 
                ? 'text-winter-accent' 
                : 'text-winter-gray hover:text-winter-accent'
            }`}
          >
            <span className="text-xl sm:text-2xl mb-0.5">🔐</span>
            <span className="text-[10px] sm:text-xs font-medium">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

